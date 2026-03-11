/* Profiling cible des endpoints projects (latence HTTP + temps SQL cumule). */
const { performance } = require('node:perf_hooks')

process.env.MAIL_DELIVERY_MODE = process.env.MAIL_DELIVERY_MODE || 'mock'
process.env.RECAPTCHA_ENABLED = process.env.RECAPTCHA_ENABLED || 'false'
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
process.env.RATE_LIMIT_GLOBAL_MAX = process.env.RATE_LIMIT_GLOBAL_MAX || '120000'
process.env.RATE_LIMIT_PUBLIC_MAX = process.env.RATE_LIMIT_PUBLIC_MAX || '120000'
process.env.RATE_LIMIT_ADMIN_MAX = process.env.RATE_LIMIT_ADMIN_MAX || '120000'
process.env.RATE_LIMIT_AUTH_MAX = process.env.RATE_LIMIT_AUTH_MAX || '120000'

const { startServer } = require('../src/app')
const { sequelize } = require('../src/models')

/**
 * Normalise une requete SQL pour regroupement.
 * @param {unknown} sql Requete brute.
 * @returns {string} Forme compacte.
 */
function normalizeSql(sql) {
  return String(sql || '')
    .replace(/\s+/g, ' ')
    .replace(/\$\d+/g, '?')
    .trim()
    .slice(0, 200)
}

/**
 * Execute une requete HTTP et retourne latence + taille payload.
 * @param {string} url URL cible.
 * @returns {Promise<{status:number,elapsedMs:number,bytes:number}>} Resume run.
 */
async function hit(url) {
  const startedAt = performance.now()
  const response = await fetch(url)
  const body = await response.text()
  return {
    status: response.status,
    elapsedMs: performance.now() - startedAt,
    bytes: Buffer.byteLength(body),
  }
}

/**
 * Affiche le resume d'un endpoint profile.
 * @param {string} target Endpoint cible.
 * @param {Array<object>} runs Runs HTTP.
 * @param {Array<{sql:string,timing:number|null}>} queryEvents Events SQL.
 * @returns {void}
 */
function printSummary(target, runs, queryEvents) {
  const avgMs = runs.reduce((acc, row) => acc + row.elapsedMs, 0) / Math.max(1, runs.length)
  const avgBytes = runs.reduce((acc, row) => acc + row.bytes, 0) / Math.max(1, runs.length)
  const statuses = Array.from(new Set(runs.map((row) => row.status)))

  const grouped = new Map()
  for (const event of queryEvents) {
    const key = normalizeSql(event.sql)
    const previous = grouped.get(key) || { count: 0, totalMs: 0, maxMs: 0 }
    previous.count += 1
    if (Number.isFinite(event.timing)) {
      previous.totalMs += event.timing
      previous.maxMs = Math.max(previous.maxMs, event.timing)
    }
    grouped.set(key, previous)
  }

  const topQueries = Array.from(grouped.entries())
    .map(([sql, stats]) => ({ sql, ...stats }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 6)

  console.log(`\n=== ${target} ===`)
  console.log(`statuses: ${statuses.join(', ')}`)
  console.log(`runs: ${runs.map((row) => `${row.elapsedMs.toFixed(1)}ms/${row.bytes}B`).join(' | ')}`)
  console.log(`avg latency: ${avgMs.toFixed(1)} ms`)
  console.log(`avg payload: ${Math.round(avgBytes)} B`)
  console.log(`sql events: ${queryEvents.length}`)
  for (const query of topQueries) {
    console.log(
      `- sql ${query.totalMs.toFixed(1)}ms total | ${query.count}x | max ${query.maxMs.toFixed(1)}ms | ${query.sql}`
    )
  }
}

async function main() {
  const queryEvents = []
  sequelize.options.benchmark = true
  sequelize.options.logging = (sql, timing) => {
    queryEvents.push({
      sql: String(sql || ''),
      timing: Number.isFinite(timing) ? timing : null,
    })
  }

  await sequelize.authenticate()
  const server = startServer(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 5000
  const baseUrl = `http://127.0.0.1:${port}`

  const targets = [
    '/api/projects?limit=12',
    '/api/projects?limit=12&includeFacets=true',
  ]

  for (const target of targets) {
    queryEvents.length = 0
    const runs = []

    for (let index = 0; index < 3; index += 1) {
      runs.push(await hit(`${baseUrl}${target}`))
    }

    printSummary(target, runs, queryEvents)
  }

  await new Promise((resolve) => {
    server.close(() => resolve())
  })
  await sequelize.close()
}

main().catch(async (err) => {
  console.error(err.stack || err.message || err)
  try {
    await sequelize.close()
  } catch {}
  process.exit(1)
})
