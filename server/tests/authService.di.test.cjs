/* Tests DI du authService (rotation et revocation des refresh tokens). */
const assert = require('node:assert/strict')
const { createAuthService } = require('../src/services/authService')

let failures = 0

/**
 * Execute un cas de test asynchrone avec sortie uniforme.
 * @param {string} name Nom du scenario.
 * @param {Function} callback Fonction de test.
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
 * Construit une fausse instance admin pour les tests.
 * @param {object} [overrides={}] Surcharges de champs/fonctions.
 * @returns {object} Instance admin mockee.
 */
function createFakeAdmin(overrides = {}) {
  return {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    refresh_token_version: 0,
    two_factor_enabled: false,
    two_factor_secret_encrypted: null,
    two_factor_recovery_codes: null,
    comparePassword: async () => true,
    update: async function (payload) {
      Object.assign(this, payload)
      return this
    },
    increment: async function (field, options) {
      if (field === 'refresh_token_version') {
        const by = Number(options?.by || 1)
        this.refresh_token_version += by
      }
    },
    reload: async function () {
      return this
    },
    ...overrides,
  }
}

/**
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  await runCase('loginAdmin embeds refresh token version (rtv)', async () => {
    const fakeAdmin = createFakeAdmin({ refresh_token_version: 7 })
    const signCalls = []

    const service = createAuthService({
      adminModel: {
        scope: () => ({
          findOne: async () => fakeAdmin,
        }),
      },
      jwt: {
        sign: (payload) => {
          signCalls.push(payload)
          return `token-${signCalls.length}`
        },
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
    })

    const session = await service.loginAdmin({ email: 'admin@example.com', password: 'secret' })
    assert.equal(session.user.id, 1)
    assert.equal(signCalls.length, 2)
    assert.equal(signCalls[0].typ, 'access')
    assert.equal(signCalls[0].rtv, 7)
    assert.equal(signCalls[1].rtv, 7)
    assert.equal(signCalls[1].typ, 'refresh')
  })

  await runCase('loginAdmin returns MFA challenge when 2FA is enabled', async () => {
    const fakeAdmin = createFakeAdmin({
      refresh_token_version: 4,
      two_factor_enabled: true,
    })
    const signCalls = []

    const service = createAuthService({
      adminModel: {
        scope: () => ({
          findOne: async () => fakeAdmin,
        }),
      },
      jwt: {
        sign: (payload) => {
          signCalls.push(payload)
          return `token-${signCalls.length}`
        },
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
      twoFactorService: {
        isTwoFactorEnabled: () => true,
        signLoginChallengeToken: ({ adminId, tokenVersion }) => `mfa-${adminId}-${tokenVersion}`,
      },
    })

    const result = await service.loginAdmin({ email: 'admin@example.com', password: 'secret' })

    assert.equal(result.mfaRequired, true)
    assert.equal(result.mfaToken, 'mfa-1-4')
    assert.equal(result.user.id, 1)
    assert.equal(signCalls.length, 0)
  })

  await runCase('refreshAdminSession rotates refresh token version', async () => {
    const fakeAdmin = createFakeAdmin({ refresh_token_version: 2 })
    const signCalls = []

    const service = createAuthService({
      adminModel: {
        findByPk: async (id) => (id === 1 ? fakeAdmin : null),
      },
      jwt: {
        verify: () => ({ id: 1, username: 'admin', email: 'admin@example.com', rtv: 2, typ: 'refresh' }),
        sign: (payload) => {
          signCalls.push(payload)
          return `token-${signCalls.length}`
        },
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
    })

    const session = await service.refreshAdminSession('refresh-token')
    assert.equal(session.user.id, 1)
    assert.equal(fakeAdmin.refresh_token_version, 3)
    assert.equal(signCalls.length, 2)
    assert.equal(signCalls[0].typ, 'access')
    assert.equal(signCalls[0].rtv, 3)
    assert.equal(signCalls[1].rtv, 3)
    assert.equal(signCalls[1].typ, 'refresh')
  })

  await runCase('refreshAdminSession rejects stale refresh token version', async () => {
    const fakeAdmin = createFakeAdmin({ refresh_token_version: 3 })

    const service = createAuthService({
      adminModel: {
        findByPk: async () => fakeAdmin,
      },
      jwt: {
        verify: () => ({ id: 1, username: 'admin', email: 'admin@example.com', rtv: 1, typ: 'refresh' }),
        sign: () => 'unused',
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
    })

    await assert.rejects(
      () => service.refreshAdminSession('stale-token'),
      (err) => {
        assert.equal(err.statusCode, 401)
        assert.equal(err.message, 'Session invalide.')
        return true
      }
    )
  })

  await runCase('refreshAdminSession rejects token with non-refresh typ', async () => {
    const fakeAdmin = createFakeAdmin({ refresh_token_version: 2 })

    const service = createAuthService({
      adminModel: {
        findByPk: async () => fakeAdmin,
      },
      jwt: {
        verify: () => ({
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          rtv: 2,
          typ: 'access',
        }),
        sign: () => 'unused',
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
    })

    await assert.rejects(
      () => service.refreshAdminSession('wrong-type-token'),
      (err) => {
        assert.equal(err.statusCode, 401)
        assert.equal(err.message, 'Refresh token invalide ou expire.')
        return true
      }
    )
  })

  await runCase('logoutAdminSession revokes version when token is current', async () => {
    const fakeAdmin = createFakeAdmin({ refresh_token_version: 4 })

    const service = createAuthService({
      adminModel: {
        findByPk: async () => fakeAdmin,
      },
      jwt: {
        verify: () => ({ id: 1, rtv: 4, typ: 'refresh' }),
        sign: () => 'unused',
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
    })

    const result = await service.logoutAdminSession('valid-token')
    assert.equal(result.revoked, true)
    assert.equal(fakeAdmin.refresh_token_version, 5)
  })

  await runCase('logoutAdminSession stays idempotent for invalid token', async () => {
    const service = createAuthService({
      adminModel: {
        findByPk: async () => {
          throw new Error('findByPk should not be called')
        },
      },
      jwt: {
        verify: () => {
          throw new Error('jwt malformed')
        },
        sign: () => 'unused',
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
    })

    const result = await service.logoutAdminSession('bad-token')
    assert.equal(result.revoked, false)
  })

  await runCase('logoutAdminSession stays idempotent for non-refresh typ token', async () => {
    const fakeAdmin = createFakeAdmin({ refresh_token_version: 4 })

    const service = createAuthService({
      adminModel: {
        findByPk: async () => fakeAdmin,
      },
      jwt: {
        verify: () => ({ id: 1, rtv: 4, typ: 'access' }),
        sign: () => 'unused',
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
    })

    const result = await service.logoutAdminSession('wrong-type-token')
    assert.equal(result.revoked, false)
    assert.equal(fakeAdmin.refresh_token_version, 4)
  })

  await runCase('verifyTwoFactorLogin issues a full session when TOTP is valid', async () => {
    const fakeAdmin = createFakeAdmin({
      refresh_token_version: 4,
      two_factor_enabled: true,
      two_factor_secret_encrypted: 'encrypted-secret',
    })
    const signCalls = []

    const service = createAuthService({
      adminModel: {
        scope: () => ({
          findByPk: async (id) => (id === 1 ? fakeAdmin : null),
        }),
      },
      jwt: {
        sign: (payload) => {
          signCalls.push(payload)
          return `token-${signCalls.length}`
        },
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
      twoFactorService: {
        verifyLoginChallengeToken: () => ({ adminId: 1, rtv: 4 }),
        isTwoFactorEnabled: () => true,
        normalizeTotpCode: () => '123456',
        decryptTotpSecret: () => 'clear-secret',
        verifyTotpCode: () => true,
        normalizeRecoveryCode: () => '',
        recoveryCodesEnabled: () => true,
      },
    })

    const result = await service.verifyTwoFactorLogin({
      mfaToken: 'mfa-token',
      totpCode: '123456',
    })

    assert.equal(result.mfaRequired, false)
    assert.equal(result.usedRecoveryCode, false)
    assert.equal(result.user.id, 1)
    assert.equal(signCalls.length, 2)
    assert.equal(signCalls[0].typ, 'access')
    assert.equal(signCalls[0].rtv, 4)
    assert.equal(signCalls[1].typ, 'refresh')
  })

  await runCase('verifyTwoFactorLogin consumes recovery code when TOTP is absent', async () => {
    const fakeAdmin = createFakeAdmin({
      refresh_token_version: 3,
      two_factor_enabled: true,
      two_factor_recovery_codes: '["hash-a","hash-b","hash-c"]',
    })
    const signCalls = []

    const service = createAuthService({
      adminModel: {
        scope: () => ({
          findByPk: async () => fakeAdmin,
        }),
      },
      jwt: {
        sign: (payload) => {
          signCalls.push(payload)
          return `token-${signCalls.length}`
        },
      },
      env: {
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
      },
      twoFactorService: {
        verifyLoginChallengeToken: () => ({ adminId: 1, rtv: 3 }),
        isTwoFactorEnabled: () => true,
        normalizeTotpCode: () => '',
        normalizeRecoveryCode: () => 'ABCDE12345',
        recoveryCodesEnabled: () => true,
        consumeRecoveryCode: () => ({
          valid: true,
          remaining: 2,
          nextSerialized: '["hash-a","hash-c"]',
        }),
      },
    })

    const result = await service.verifyTwoFactorLogin({
      mfaToken: 'mfa-token',
      recoveryCode: 'ABCDE-12345',
    })

    assert.equal(result.mfaRequired, false)
    assert.equal(result.usedRecoveryCode, true)
    assert.equal(result.recoveryCodesRemaining, 2)
    assert.equal(fakeAdmin.two_factor_recovery_codes, '["hash-a","hash-c"]')
    assert.equal(signCalls.length, 2)
  })

  if (failures > 0) {
    console.error(`\nDI unit tests failed: ${failures}`)
    process.exit(1)
  }

  console.log('\nDI unit tests passed.')
}

main().catch((err) => {
  console.error(err.stack || err.message || err)
  process.exit(1)
})
