/* Test de scalabilite API: charge concurrente, latence et taux d'erreur. */
const { performance } = require('node:perf_hooks')

let server = null
let baseUrl = ''
let dbUnavailable = false
let dbUnavailableDetail = ''

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const SCALE_DURATION_MS = parsePositiveInt(process.env.SCALE_DURATION_MS, 6000)
const SCALE_WARMUP_MS = parsePositiveInt(process.env.SCALE_WARMUP_MS, 1200)
const SCALE_TIMEOUT_MS = parsePositiveInt(process.env.SCALE_TIMEOUT_MS, 10000)
const SCALE_CONCURRENCY = parsePositiveInt(process.env.SCALE_CONCURRENCY, 16)
const REQUIRE_DB = parseBooleanEnv(process.env.SCALE_REQUIRE_DB, false)
const TARGET_BASE_URL = String(process.env.SCALE_BASE_URL || '').trim()
const SCALE_ORIGIN = String(process.env.SCALE_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000').trim() || 'http://localhost:3000'

/**
 * Attend un delai.
 * @param {number} ms Delai en ms.
 * @returns {Promise<void>} Promise resolue apres delai.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Ferme le serveur local.
 * @param {import('http').Server | null} instance Instance serveur.
 * @returns {Promise<void>} Promise de fermeture.
 */
async function closeServer(instance) {
  if (!instance) return
  await new Promise((resolve, reject) => {
    instance.close((err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

/**
 * Lance le serveur local pour bench si aucune base URL externe n'est fournie.
 * @returns {Promise<void>} Promise resolue quand le serveur est pret.
 */
async function startLocalServerForScale() {
  process.env.MAIL_DELIVERY_MODE = process.env.MAIL_DELIVERY_MODE || 'mock'
  process.env.RECAPTCHA_ENABLED = process.env.RECAPTCHA_ENABLED || 'false'
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
  process.env.RATE_LIMIT_GLOBAL_MAX = process.env.RATE_LIMIT_GLOBAL_MAX || '120000'
  process.env.RATE_LIMIT_PUBLIC_MAX = process.env.RATE_LIMIT_PUBLIC_MAX || '120000'
  process.env.RATE_LIMIT_ADMIN_MAX = process.env.RATE_LIMIT_ADMIN_MAX || '120000'
  process.env.RATE_LIMIT_AUTH_MAX = process.env.RATE_LIMIT_AUTH_MAX || '120000'

  const { startServer } = require('../src/app')
  const { sequelize } = require('../src/models')

  try {
    await sequelize.authenticate()
  } catch (err) {
    dbUnavailable = true
    dbUnavailableDetail = String(err?.message || '').slice(0, 220)
    if (REQUIRE_DB) {
      throw new Error(`DB indisponible en mode strict: ${dbUnavailableDetail}`)
    }
    console.log(`SKIP - DB precheck: indisponible (${dbUnavailableDetail})`)
  }

  server = startServer(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 5000
  baseUrl = `http://127.0.0.1:${port}`
}

/**
 * Calcule un percentile.
 * @param {Array<number>} sorted Valeurs triees.
 * @param {number} percentile Percentile [0, 100].
 * @returns {number} Valeur percentile.
 */
function getPercentile(sorted, percentile) {
  if (sorted.length === 0) return 0
  const rank = Math.ceil((percentile / 100) * sorted.length) - 1
  const index = Math.max(0, Math.min(sorted.length - 1, rank))
  return sorted[index]
}

/**
 * Formate un nombre de ms.
 * @param {number} value Valeur brute.
 * @returns {string} Valeur formatee.
 */
function fmtMs(value) {
  return `${Number(value || 0).toFixed(1)} ms`
}

/**
 * Envoie une requete avec timeout.
 * @param {object} scenario Scenario cible.
 * @returns {Promise<{status:number|null,durationMs:number,error:string|null}>} Resultat unitaire.
 */
async function runSingleRequest(scenario) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SCALE_TIMEOUT_MS)
  const startedAt = performance.now()

  try {
    const headers = {
      Accept: 'application/json',
      ...(scenario.headers || {}),
    }

    if (scenario.requireTrustedOrigin) {
      headers.Origin = headers.Origin || SCALE_ORIGIN
      headers.Referer = headers.Referer || `${SCALE_ORIGIN.replace(/\/+$/, '')}/`
    }

    let body
    if (scenario.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(scenario.body)
    }

    const response = await fetch(`${baseUrl}/api${scenario.path}`, {
      method: scenario.method || 'GET',
      headers,
      body,
      signal: controller.signal,
    })

    await response.arrayBuffer().catch(() => {})
    return {
      status: response.status,
      durationMs: performance.now() - startedAt,
      error: null,
    }
  } catch (err) {
    return {
      status: null,
      durationMs: performance.now() - startedAt,
      error: String(err?.message || err),
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Execute une phase de charge.
 * @param {object} scenario Scenario de charge.
 * @param {number} durationMs Duree en ms.
 * @param {boolean} collectMetrics True pour garder les metriques.
 * @returns {Promise<object>} Resume phase.
 */
async function runLoadPhase(scenario, durationMs, collectMetrics) {
  const concurrency = parsePositiveInt(scenario.concurrency, SCALE_CONCURRENCY)
  const acceptedStatuses = Array.isArray(scenario.acceptedStatuses) && scenario.acceptedStatuses.length > 0
    ? scenario.acceptedStatuses
    : [200]

  const metrics = {
    total: 0,
    ok: 0,
    errors: 0,
    latencies: [],
    statusCounts: new Map(),
    errorSamples: [],
  }

  const endsAt = Date.now() + durationMs
  const startedAt = performance.now()

  async function worker() {
    while (Date.now() < endsAt) {
      const result = await runSingleRequest(scenario)
      if (!collectMetrics) {
        continue
      }

      metrics.total += 1
      metrics.latencies.push(result.durationMs)

      if (result.status !== null) {
        const previous = metrics.statusCounts.get(result.status) || 0
        metrics.statusCounts.set(result.status, previous + 1)
      }

      if (result.error) {
        metrics.errors += 1
        if (metrics.errorSamples.length < 4) {
          metrics.errorSamples.push(result.error)
        }
        continue
      }

      if (acceptedStatuses.includes(result.status)) {
        metrics.ok += 1
      } else {
        metrics.errors += 1
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  const elapsedMs = performance.now() - startedAt

  return {
    ...metrics,
    concurrency,
    elapsedMs,
    acceptedStatuses,
  }
}

/**
 * Execute un scenario avec warmup + mesure.
 * @param {object} scenario Scenario cible.
 * @returns {Promise<object>} Resume scenario.
 */
async function runScenario(scenario) {
  const durationMs = parsePositiveInt(scenario.durationMs, SCALE_DURATION_MS)
  const warmupMs = parsePositiveInt(scenario.warmupMs, SCALE_WARMUP_MS)

  if (warmupMs > 0) {
    await runLoadPhase(scenario, warmupMs, false)
    await sleep(120)
  }

  const result = await runLoadPhase(scenario, durationMs, true)
  const sorted = [...result.latencies].sort((a, b) => a - b)

  return {
    name: scenario.name,
    path: `${scenario.method || 'GET'} ${scenario.path}`,
    durationMs: result.elapsedMs,
    concurrency: result.concurrency,
    requests: result.total,
    ok: result.ok,
    errors: result.errors,
    successRate: result.total > 0 ? (result.ok / result.total) * 100 : 0,
    throughputRps: result.elapsedMs > 0 ? (result.total * 1000) / result.elapsedMs : 0,
    latencyP50: getPercentile(sorted, 50),
    latencyP95: getPercentile(sorted, 95),
    latencyP99: getPercentile(sorted, 99),
    statusCounts: result.statusCounts,
    errorSamples: result.errorSamples,
  }
}

/**
 * Construit les scenarios de scalabilite.
 * @returns {Array<object>} Scenarios a lancer.
 */
function buildScaleScenarios() {
  const scenarios = [
    {
      name: 'Auth middleware (origin + validation/rate-limit)',
      method: 'POST',
      path: '/auth/login',
      body: {},
      acceptedStatuses: [422, 429, 403],
      requireTrustedOrigin: true,
      concurrency: 10,
      durationMs: Math.max(2500, Math.floor(SCALE_DURATION_MS * 0.6)),
    },
  ]

  if (!dbUnavailable) {
    scenarios.push(
      {
        name: 'Settings public',
        method: 'GET',
        path: '/settings',
        acceptedStatuses: [200],
      },
      {
        name: 'Projects listing',
        method: 'GET',
        path: '/projects?limit=12',
        acceptedStatuses: [200],
      },
      {
        name: 'Projects + facets',
        method: 'GET',
        path: '/projects?limit=12&includeFacets=true',
        acceptedStatuses: [200],
        concurrency: Math.max(6, Math.floor(SCALE_CONCURRENCY * 0.75)),
      },
      {
        name: 'Articles listing',
        method: 'GET',
        path: '/articles?limit=12',
        acceptedStatuses: [200],
      }
    )
  }

  return scenarios
}

/**
 * Affiche un resume tabulaire d'un scenario.
 * @param {object} result Resultat scenario.
 * @returns {void}
 */
function printScenarioResult(result) {
  const statusSummary = Array.from(result.statusCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([status, count]) => `${status}:${count}`)
    .join(' | ')

  console.log(`\n[${result.name}] ${result.path}`)
  console.log(`- charge: ${result.concurrency} workers, ${Math.round(result.durationMs)} ms`)
  console.log(`- debit: ${result.throughputRps.toFixed(1)} req/s`)
  console.log(`- succes: ${result.ok}/${result.requests} (${result.successRate.toFixed(2)}%)`)
  console.log(`- latence: p50=${fmtMs(result.latencyP50)} p95=${fmtMs(result.latencyP95)} p99=${fmtMs(result.latencyP99)}`)
  console.log(`- statuts: ${statusSummary || 'n/a'}`)

  if (result.errorSamples.length > 0) {
    console.log(`- erreurs echantillon: ${result.errorSamples.join(' || ')}`)
  }
}

/**
 * Point d'entree.
 * @returns {Promise<void>} Promise principale.
 */
async function main() {
  const startedAt = performance.now()
  const initialMem = process.memoryUsage().rss

  try {
    if (TARGET_BASE_URL) {
      baseUrl = TARGET_BASE_URL.replace(/\/+$/, '')
      console.log(`INFO - target externe: ${baseUrl}`)
    } else {
      await startLocalServerForScale()
      console.log(`INFO - target local: ${baseUrl}`)
      if (dbUnavailable) {
        console.log('WARN - DB indisponible: scenarios relies DB seront ignores.')
      }
    }

    const scenarios = buildScaleScenarios()
    if (scenarios.length === 0) {
      throw new Error('Aucun scenario de scalabilite a executer.')
    }

    const results = []
    for (const scenario of scenarios) {
      const result = await runScenario(scenario)
      printScenarioResult(result)
      results.push(result)
    }

    const totalRequests = results.reduce((acc, item) => acc + item.requests, 0)
    const totalSuccess = results.reduce((acc, item) => acc + item.ok, 0)
    const totalErrors = results.reduce((acc, item) => acc + item.errors, 0)
    const globalElapsedMs = performance.now() - startedAt
    const memoryDeltaMb = (process.memoryUsage().rss - initialMem) / (1024 * 1024)

    console.log('\n=== Scale Summary ===')
    console.log(`Total requetes: ${totalRequests}`)
    console.log(`Succes global: ${totalSuccess} (${totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(2) : '0.00'}%)`)
    console.log(`Erreurs globales: ${totalErrors}`)
    console.log(`Debit moyen global: ${globalElapsedMs > 0 ? ((totalRequests * 1000) / globalElapsedMs).toFixed(1) : '0.0'} req/s`)
    console.log(`Duree totale: ${(globalElapsedMs / 1000).toFixed(1)} s`)
    console.log(`Delta memoire RSS testeur: ${memoryDeltaMb.toFixed(2)} MB`)

    if (totalErrors > 0) {
      process.exitCode = 1
      console.error('Scale test termine avec erreurs (voir details ci-dessus).')
    } else {
      console.log('Scale test termine sans erreur.')
    }
  } finally {
    if (!TARGET_BASE_URL) {
      await closeServer(server).catch(() => {})
      const { sequelize } = require('../src/models')
      await sequelize.close().catch(() => {})
    }
  }
}

main().catch((err) => {
  console.error(err.stack || err.message || err)
  process.exit(1)
})
