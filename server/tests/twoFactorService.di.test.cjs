/* Tests unitaires DI du service 2FA (tokens, secret, recovery codes). */
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { createTwoFactorService } = require('../src/services/twoFactorService')

let failures = 0

/**
 * Execute un test unitaire avec reporting uniforme.
 * @param {string} name Nom humain du test.
 * @param {Function} callback Scenario de test.
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
 * Cree un service 2FA avec une configuration stable pour les tests.
 * @param {object} [overrides={}] Surcharges de dependances.
 * @returns {object} Service 2FA instancie.
 */
function createService(overrides = {}) {
  return createTwoFactorService({
    jwt,
    env: {
      JWT_MFA_SECRET: 'mfa-secret-test',
      JWT_ACCESS_SECRET: 'access-secret-test',
      JWT_REFRESH_SECRET: 'refresh-secret-test',
      JWT_MFA_EXPIRES: '5m',
      JWT_MFA_SETUP_EXPIRES: '10m',
      MFA_ENCRYPTION_KEY: 'encryption-key-test',
      MFA_RECOVERY_PEPPER: 'pepper-test',
      TOTP_ISSUER: 'Portfolio CMS',
      TOTP_WINDOW: '1',
      TOTP_DIGITS: '6',
      TOTP_PERIOD: '30',
      TOTP_ALGORITHM: 'sha1',
      ...overrides.env,
    },
    ...(overrides.totp ? { totp: overrides.totp } : {}),
  })
}

runCase('sign/verify login challenge token keeps admin and token version', () => {
  const service = createService()
  const token = service.signLoginChallengeToken({
    adminId: 42,
    email: 'admin@example.com',
    username: 'admin',
    tokenVersion: 7,
  })

  const payload = service.verifyLoginChallengeToken(token)
  assert.equal(payload.adminId, 42)
  assert.equal(payload.email, 'admin@example.com')
  assert.equal(payload.username, 'admin')
  assert.equal(payload.rtv, 7)
})

runCase('sign/verify setup token returns matching admin id and secret', () => {
  const service = createService()
  const token = service.signSetupToken({
    adminId: 9,
    secret: 'JBSWY3DPEHPK3PXP',
  })

  const payload = service.verifySetupToken(token)
  assert.equal(payload.adminId, 9)
  assert.equal(payload.secret, 'JBSWY3DPEHPK3PXP')
})

runCase('encryptTotpSecret/decryptTotpSecret roundtrip', () => {
  const service = createService()
  const clearSecret = 'JBSWY3DPEHPK3PXP'
  const encrypted = service.encryptTotpSecret(clearSecret)

  assert.equal(typeof encrypted, 'string')
  assert.equal(encrypted.includes('.'), true)
  assert.equal(service.decryptTotpSecret(encrypted), clearSecret)
})

runCase('consumeRecoveryCode invalidates consumed code and keeps others', () => {
  const service = createService()
  const codes = service.generateRecoveryCodes(4)
  const serialized = service.serializeRecoveryCodeHashes(service.hashRecoveryCodes(codes))

  const firstUse = service.consumeRecoveryCode({
    serializedHashes: serialized,
    recoveryCode: codes[0],
  })
  assert.equal(firstUse.valid, true)
  assert.equal(firstUse.remaining, 3)

  const secondUse = service.consumeRecoveryCode({
    serializedHashes: firstUse.nextSerialized,
    recoveryCode: codes[0],
  })
  assert.equal(secondUse.valid, false)
  assert.equal(secondUse.remaining, 3)
})

runCase('recoveryCodesEnabled follows MFA_DISABLE_RECOVERY_CODES', () => {
  const enabledService = createService({
    env: { MFA_DISABLE_RECOVERY_CODES: 'false' },
  })
  const disabledService = createService({
    env: { MFA_DISABLE_RECOVERY_CODES: 'true' },
  })

  assert.equal(enabledService.recoveryCodesEnabled(), true)
  assert.equal(disabledService.recoveryCodesEnabled(), false)
})

runCase('verifyTotpCode normalizes code before delegating to TOTP provider', () => {
  const calls = []
  const stubTotp = {
    generateSecret: () => 'ABC',
    buildOtpAuthUrl: () => 'otpauth://example',
    verifyTotp: (payload) => {
      calls.push(payload)
      return true
    },
  }
  const service = createService({
    totp: stubTotp,
    env: {
      TOTP_WINDOW: '2',
      TOTP_DIGITS: '6',
      TOTP_PERIOD: '30',
      TOTP_ALGORITHM: 'sha1',
    },
  })

  const result = service.verifyTotpCode({
    secret: 'SECRET',
    code: ' 123 456 ',
  })

  assert.equal(result, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].code, '123456')
  assert.equal(calls[0].window, 2)
  assert.equal(calls[0].digits, 6)
})

runCase('JWT_MFA_SECRET is mandatory for signing MFA tokens', () => {
  const service = createService({
    env: {
      JWT_MFA_SECRET: '',
    },
  })

  assert.throws(
    () =>
      service.signLoginChallengeToken({
        adminId: 1,
        email: 'admin@example.com',
        username: 'admin',
        tokenVersion: 0,
      }),
    (err) => {
      assert.equal(err.statusCode, 500)
      assert.equal(err.message, 'Configuration JWT MFA manquante.')
      return true
    }
  )
})

if (failures > 0) {
  console.error(`\nDI unit tests failed: ${failures}`)
  process.exit(1)
}

console.log('\nDI unit tests passed.')
