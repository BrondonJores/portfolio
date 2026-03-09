/* Tests unitaires du middleware auth JWT. */
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { authenticate } = require('../src/middleware/authMiddleware')

let failures = 0
const previousAccessSecret = process.env.JWT_ACCESS_SECRET

/**
 * Execute un cas de test avec reporting uniforme.
 * @param {string} name Nom du scenario.
 * @param {Function} callback Fonction de test.
 * @returns {void}
 */
function runCase(name, callback) {
  try {
    callback()
    console.log(`PASS - ${name}`)
  } catch (err) {
    failures += 1
    console.error(`FAIL - ${name}`)
    console.error(err.stack || err.message || err)
  }
}

/**
 * Cree un faux objet response Express.
 * @returns {{res: object, output: {statusCode:number,body:unknown}}} Reponse et capture.
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

process.env.JWT_ACCESS_SECRET = 'unit-access-secret'

runCase('rejects request without bearer token', () => {
  const req = { headers: {}, get: () => '', ip: '127.0.0.1', path: '/api/admin/stats', method: 'GET' }
  const { res, output } = createResponseRecorder()
  let nextCalled = false

  authenticate(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(output.statusCode, 401)
  assert.equal(output.body?.error, "Token d'authentification manquant.")
})

runCase('accepts valid access token and attaches user payload', () => {
  const accessToken = jwt.sign(
    {
      id: 7,
      username: 'admin',
      email: 'admin@example.com',
      twoFactorEnabled: true,
      typ: 'access',
    },
    process.env.JWT_ACCESS_SECRET
  )
  const req = {
    headers: { authorization: `Bearer ${accessToken}` },
    get: () => '',
    ip: '127.0.0.1',
    path: '/api/admin/stats',
    method: 'GET',
  }
  const { res, output } = createResponseRecorder()
  let nextCalled = false

  authenticate(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(output.statusCode, 200)
  assert.equal(req.user.id, 7)
  assert.equal(req.user.username, 'admin')
  assert.equal(req.user.email, 'admin@example.com')
  assert.equal(req.user.twoFactorEnabled, true)
})

runCase('rejects token with wrong typ even if signature is valid', () => {
  const challengeToken = jwt.sign(
    {
      sub: 7,
      username: 'admin',
      email: 'admin@example.com',
      typ: 'mfa_challenge',
    },
    process.env.JWT_ACCESS_SECRET
  )
  const req = {
    headers: { authorization: `Bearer ${challengeToken}` },
    get: () => '',
    ip: '127.0.0.1',
    path: '/api/admin/stats',
    method: 'GET',
  }
  const { res, output } = createResponseRecorder()
  let nextCalled = false

  authenticate(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(output.statusCode, 401)
  assert.equal(output.body?.error, 'Token invalide ou expire.')
})

runCase('rejects token with invalid id claim', () => {
  const accessToken = jwt.sign(
    {
      id: 0,
      username: 'admin',
      email: 'admin@example.com',
      typ: 'access',
    },
    process.env.JWT_ACCESS_SECRET
  )
  const req = {
    headers: { authorization: `Bearer ${accessToken}` },
    get: () => '',
    ip: '127.0.0.1',
    path: '/api/admin/stats',
    method: 'GET',
  }
  const { res, output } = createResponseRecorder()
  let nextCalled = false

  authenticate(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(output.statusCode, 401)
  assert.equal(output.body?.error, 'Token invalide ou expire.')
})

if (previousAccessSecret === undefined) {
  delete process.env.JWT_ACCESS_SECRET
} else {
  process.env.JWT_ACCESS_SECRET = previousAccessSecret
}

if (failures > 0) {
  console.error(`\nUnit tests failed: ${failures}`)
  process.exit(1)
}

console.log('\nUnit tests passed.')
