const assert = require('node:assert/strict')

let server = null
let baseUrl = ''
let accessToken = ''
let createdCampaignId = null
let dbUnavailable = false
let dbUnavailableDetail = ''

const HAS_ADMIN_CREDS = Boolean(process.env.ADMIN_EMAIL) && Boolean(process.env.ADMIN_PASSWORD)
const REQUIRE_DB = parseBooleanEnv(process.env.SMOKE_REQUIRE_DB, false)

function logPass(message) {
  console.log(`PASS - ${message}`)
}

function logSkip(message) {
  console.log(`SKIP - ${message}`)
}

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function looksLikeDbConnectionIssue(data) {
  const errorText = String(data?.error || '')
  const stackText = String(data?.stack || '')
  const combined = `${errorText}\n${stackText}`.toLowerCase()

  const signatures = [
    'sequelizeconnectionerror',
    'connection is insecure',
    'sslmode=require',
    'econnrefused',
    'no pg_hba.conf entry',
    'password authentication failed',
    'getaddrinfo',
  ]

  return signatures.some((signature) => combined.includes(signature))
}

async function closeServer(instance) {
  if (!instance) {
    return
  }

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

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  const rawText = await response.text()

  if (rawText) {
    try {
      data = JSON.parse(rawText)
    } catch {
      data = rawText
    }
  }

  return { response, data }
}

async function startSmokeServer() {
  process.env.MAIL_DELIVERY_MODE = 'mock'
  process.env.RECAPTCHA_ENABLED = 'false'

  const { startServer } = require('../src/app')
  const { sequelize } = require('../src/models')

  try {
    await sequelize.authenticate()
  } catch (err) {
    dbUnavailable = true
    dbUnavailableDetail = String(err?.message || '').slice(0, 200)
    if (REQUIRE_DB) {
      throw new Error(`DB indisponible pendant smoke (mode strict): ${dbUnavailableDetail}`)
    }
    logSkip(`precheck DB: indisponible (${dbUnavailableDetail})`)
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

async function run() {
  let failures = 0

  function recordFailure(name, err) {
    failures += 1
    console.error(`FAIL - ${name}`)
    console.error(err.stack || err.message || err)
  }

  try {
    await startSmokeServer()

    try {
      if (dbUnavailable) {
        logSkip(`public: GET /api/settings skipped (DB indisponible: ${dbUnavailableDetail})`)
      } else {
        const { response, data } = await apiRequest('/settings')
        if (response.status === 200) {
          assert.ok(data && typeof data === 'object')
          assert.ok(data.data && typeof data.data === 'object')
          logPass('public: GET /api/settings returns settings object')
        } else if (response.status >= 500 && looksLikeDbConnectionIssue(data)) {
          dbUnavailable = true
          dbUnavailableDetail = String(data?.error || '').slice(0, 200)
          if (REQUIRE_DB) {
            throw new Error(`DB indisponible pendant smoke (mode strict): ${dbUnavailableDetail}`)
          }
          logSkip(`public: GET /api/settings skipped (DB indisponible: ${dbUnavailableDetail})`)
        } else {
          throw new Error(`Statut inattendu GET /api/settings: ${response.status}`)
        }
      }
    } catch (err) {
      recordFailure('public: GET /api/settings returns settings object', err)
    }

    try {
      const { response, data } = await apiRequest('/comments', {
        method: 'POST',
        body: {},
      })
      assert.equal(response.status, 422)
      assert.ok(Array.isArray(data?.errors))
      logPass('public: POST /api/comments validates payload')
    } catch (err) {
      recordFailure('public: POST /api/comments validates payload', err)
    }

    if (dbUnavailable) {
      logSkip('admin smoke tests (DB indisponible)')
    } else if (!HAS_ADMIN_CREDS) {
      logSkip('admin smoke tests (ADMIN_EMAIL/ADMIN_PASSWORD not configured)')
    } else {
      try {
        const { response, data } = await apiRequest('/auth/login', {
          method: 'POST',
          body: {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
          },
        })

        assert.equal(response.status, 200)
        assert.equal(typeof data?.accessToken, 'string')
        assert.ok(data.accessToken.length > 10)
        accessToken = data.accessToken
        logPass('auth: POST /api/auth/login returns access token')
      } catch (err) {
        recordFailure('auth: POST /api/auth/login returns access token', err)
      }

      if (accessToken) {
        try {
          const { response, data } = await apiRequest('/admin/stats', {
            token: accessToken,
          })

          assert.equal(response.status, 200)
          assert.ok(Array.isArray(data?.data))
          logPass('admin: GET /api/admin/stats with bearer token')
        } catch (err) {
          recordFailure('admin: GET /api/admin/stats with bearer token', err)
        }

        try {
          const uniqueEmail = `smoke-${Date.now()}@example.test`
          const subscribeResult = await apiRequest('/subscribe', {
            method: 'POST',
            body: { email: uniqueEmail },
          })
          assert.equal(subscribeResult.response.status, 201)

          const createResult = await apiRequest('/admin/newsletter', {
            method: 'POST',
            token: accessToken,
            body: {
              subject: 'Smoke campaign',
              preheader: 'Smoke preheader',
              body_html: '<p>Smoke body</p>',
              cta_label: 'Voir',
              cta_url: 'https://example.test',
              articles: [],
            },
          })

          assert.equal(createResult.response.status, 201)
          createdCampaignId = createResult.data?.data?.id
          assert.ok(createdCampaignId)

          const sendResult = await apiRequest(`/admin/newsletter/${createdCampaignId}/send`, {
            method: 'POST',
            token: accessToken,
            body: {},
          })

          assert.equal(sendResult.response.status, 200)
          assert.equal(sendResult.data?.mailer?.mode, 'mock')
          assert.ok(sendResult.data?.mailer?.success >= 1)
          logPass('newsletter: create and send campaign in mock mode')
        } catch (err) {
          recordFailure('newsletter: create and send campaign in mock mode', err)
        }
      }
    }
  } catch (err) {
    recordFailure('smoke setup/startup', err)
  } finally {
    await closeServer(server).catch(() => {})
    const { sequelize } = require('../src/models')
    await sequelize.close().catch(() => {})
  }

  if (failures > 0) {
    console.error(`\nSmoke tests failed: ${failures}`)
    process.exit(1)
  }

  if (dbUnavailable && !REQUIRE_DB) {
    console.log('\nSmoke tests passed with DB-dependent checks skipped.')
    return
  }

  console.log('\nSmoke tests passed.')
}

run()
