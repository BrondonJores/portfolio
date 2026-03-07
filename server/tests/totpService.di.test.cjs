/* Tests unitaires DI du service TOTP (RFC 6238). */
const assert = require('node:assert/strict')
const { createTotpService } = require('../src/services/totpService')

let failures = 0

/**
 * Execute un scenario de test et affiche PASS/FAIL.
 * @param {string} name Nom du test.
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

runCase('generateSecret returns a base32 secret', () => {
  const service = createTotpService()
  const secret = service.generateSecret({ byteLength: 20 })
  assert.match(secret, /^[A-Z2-7]+$/)
  assert.equal(secret.length >= 32, true)
})

runCase('generateTotpAt matches RFC-6238 vector (SHA1, 8 digits)', () => {
  const service = createTotpService()
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
  const code = service.generateTotpAt(secret, 59000, {
    period: 30,
    digits: 8,
    algorithm: 'sha1',
  })
  assert.equal(code, '94287082')
})

runCase('verifyTotp accepts valid code inside the configured window', () => {
  const service = createTotpService()
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
  const validCode = '94287082'

  assert.equal(
    service.verifyTotp({
      secret,
      code: validCode,
      period: 30,
      digits: 8,
      algorithm: 'sha1',
      window: 0,
      now: 59000,
    }),
    true
  )

  assert.equal(
    service.verifyTotp({
      secret,
      code: validCode,
      period: 30,
      digits: 8,
      algorithm: 'sha1',
      window: 1,
      now: 89000,
    }),
    true
  )
})

runCase('verifyTotp rejects invalid formats and wrong digits length', () => {
  const service = createTotpService()
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

  assert.equal(
    service.verifyTotp({
      secret,
      code: 'ABC123',
      digits: 6,
      now: 59000,
    }),
    false
  )

  assert.equal(
    service.verifyTotp({
      secret,
      code: '12345',
      digits: 6,
      now: 59000,
    }),
    false
  )
})

runCase('buildOtpAuthUrl encodes issuer, label and options', () => {
  const service = createTotpService()
  const url = service.buildOtpAuthUrl({
    issuer: 'Portfolio CMS',
    label: 'admin@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })

  assert.equal(url.startsWith('otpauth://totp/'), true)
  assert.equal(url.includes('issuer=Portfolio%20CMS'), true)
  assert.equal(url.includes('digits=6'), true)
  assert.equal(url.includes('period=30'), true)
})

if (failures > 0) {
  console.error(`\nDI unit tests failed: ${failures}`)
  process.exit(1)
}

console.log('\nDI unit tests passed.')
