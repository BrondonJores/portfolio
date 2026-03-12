/* Tests unitaires du builder de handler rate-limit securise. */
const assert = require('node:assert/strict')
const { createRateLimitSecurityHandler } = require('../src/middleware/rateLimitSecurityMiddleware')

let failures = 0

/**
 * Execute un scenario et affiche PASS/FAIL.
 * @param {string} name Nom du test.
 * @param {Function} callback Scenario.
 * @returns {Promise<void>} Promise resolue apres execution.
 */
async function runCase(name, callback) {
  try {
    await callback()
    console.log(`PASS - ${name}`)
  } catch (err) {
    failures += 1
    console.error(`FAIL - ${name}`)
    console.error(err.stack || err.message || err)
  }
}

/**
 * Cree un faux objet response Express.
 * @returns {{res: object, output: {statusCode:number,body:unknown}}} Reponse capturee.
 */
function createResponseRecorder() {
  const output = {
    statusCode: 200,
    body: null,
  }

  const res = {
    status(code) {
      output.statusCode = code
      return this
    },
    json(payload) {
      output.body = payload
      return this
    },
  }

  return { res, output }
}

async function flushMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve))
}

async function main() {
  await runCase('logs the computed payload and returns the configured response', async () => {
    const calls = []
    const buildHandler = createRateLimitSecurityHandler({
      logSecurityEventFromRequest: async (req, payload) => {
        calls.push({ req, payload })
        return { id: 1 }
      },
    })
    const handler = buildHandler({
      responseBody: { error: 'Trop de tentatives de connexion. Reessayez dans 15 minutes.' },
      logPayload: (req) => ({
        eventType: 'auth.login_rate_limited',
        email: req.body?.email,
      }),
    })
    const req = { body: { email: 'admin@example.com' } }
    const { res, output } = createResponseRecorder()

    const returned = handler(req, res)
    await flushMicrotasks()

    assert.equal(returned, res)
    assert.equal(output.statusCode, 429)
    assert.deepEqual(output.body, {
      error: 'Trop de tentatives de connexion. Reessayez dans 15 minutes.',
    })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].payload.eventType, 'auth.login_rate_limited')
    assert.equal(calls[0].payload.email, 'admin@example.com')
  })

  await runCase('swallows logging failures and still answers the client', async () => {
    const buildHandler = createRateLimitSecurityHandler({
      logSecurityEventFromRequest: async () => {
        throw new Error('storage unavailable')
      },
    })
    const handler = buildHandler({
      responseBody: { error: 'Trop de tentatives 2FA. Reessayez dans 15 minutes.' },
      logPayload: {
        eventType: 'auth.2fa_rate_limited',
      },
    })
    const { res, output } = createResponseRecorder()

    handler({}, res)
    await flushMicrotasks()

    assert.equal(output.statusCode, 429)
    assert.deepEqual(output.body, {
      error: 'Trop de tentatives 2FA. Reessayez dans 15 minutes.',
    })
  })

  if (failures > 0) {
    console.error(`\nRate-limit middleware tests failed: ${failures}`)
    process.exit(1)
  }

  console.log('\nRate-limit middleware tests passed.')
}

main().catch((err) => {
  console.error(err.stack || err.message || err)
  process.exit(1)
})
