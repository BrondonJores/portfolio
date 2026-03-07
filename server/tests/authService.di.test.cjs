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
    comparePassword: async () => true,
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
    assert.equal(signCalls[1].rtv, 7)
    assert.equal(signCalls[1].typ, 'refresh')
  })

  await runCase('refreshAdminSession rotates refresh token version', async () => {
    const fakeAdmin = createFakeAdmin({ refresh_token_version: 2 })
    const signCalls = []

    const service = createAuthService({
      adminModel: {
        findByPk: async (id) => (id === 1 ? fakeAdmin : null),
      },
      jwt: {
        verify: () => ({ id: 1, username: 'admin', email: 'admin@example.com', rtv: 2 }),
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
        verify: () => ({ id: 1, username: 'admin', email: 'admin@example.com', rtv: 1 }),
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

  await runCase('logoutAdminSession revokes version when token is current', async () => {
    const fakeAdmin = createFakeAdmin({ refresh_token_version: 4 })

    const service = createAuthService({
      adminModel: {
        findByPk: async () => fakeAdmin,
      },
      jwt: {
        verify: () => ({ id: 1, rtv: 4 }),
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

