/* Tests unitaires du authController. */
const assert = require('node:assert/strict')

const AUTH_CONTROLLER_MODULE_PATH = '../src/controllers/authController'
const AUTH_SERVICE_MODULE_PATH = require.resolve('../src/services/authService')
const SECURITY_EVENT_MODULE_PATH = require.resolve('../src/services/securityEventService')

let failures = 0

/**
 * Charge le controller auth avec des dependances mockees.
 * @param {object} authServiceExports Faux exports du service auth.
 * @returns {object} Exports du controller auth.
 */
function loadAuthControllerFresh(authServiceExports) {
  const controllerModulePath = require.resolve(AUTH_CONTROLLER_MODULE_PATH)
  delete require.cache[controllerModulePath]

  require.cache[AUTH_SERVICE_MODULE_PATH] = {
    id: AUTH_SERVICE_MODULE_PATH,
    filename: AUTH_SERVICE_MODULE_PATH,
    loaded: true,
    exports: authServiceExports,
  }

  require.cache[SECURITY_EVENT_MODULE_PATH] = {
    id: SECURITY_EVENT_MODULE_PATH,
    filename: SECURITY_EVENT_MODULE_PATH,
    loaded: true,
    exports: {
      logSecurityEventFromRequest: async () => null,
    },
  }

  return require(AUTH_CONTROLLER_MODULE_PATH)
}

/**
 * Execute un cas de test.
 * @param {string} name Nom du scenario.
 * @param {Function} callback Callback de test.
 * @returns {Promise<void>} Promise resolue a la fin du test.
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
 * Cree une reponse Express minimale pour assertions.
 * @returns {{cookieCalls:Array<object>, jsonPayload:unknown, cookie:Function, json:Function}} Faux objet response.
 */
function createResponseDouble() {
  return {
    cookieCalls: [],
    jsonPayload: null,
    cookie(name, value, options) {
      this.cookieCalls.push({ name, value, options })
      return this
    },
    json(payload) {
      this.jsonPayload = payload
      return this
    },
  }
}

async function main() {
  await runCase('refresh returns both access token and user profile', async () => {
    const user = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      twoFactorEnabled: false,
    }
    const refreshCookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 604800000,
      path: '/',
    }
    const refreshAdminSessionCalls = []

    const { refresh } = loadAuthControllerFresh({
      loginAdmin: async () => {
        throw new Error('not used')
      },
      verifyTwoFactorLogin: async () => {
        throw new Error('not used')
      },
      beginTwoFactorSetup: async () => {
        throw new Error('not used')
      },
      enableTwoFactorForAdmin: async () => {
        throw new Error('not used')
      },
      disableTwoFactorForAdmin: async () => {
        throw new Error('not used')
      },
      regenerateTwoFactorRecoveryCodes: async () => {
        throw new Error('not used')
      },
      getTwoFactorStatus: async () => {
        throw new Error('not used')
      },
      logoutAdminSession: async () => {
        throw new Error('not used')
      },
      refreshAdminSession: async (refreshToken) => {
        refreshAdminSessionCalls.push(refreshToken)
        return {
          accessToken: 'access-token',
          refreshToken: 'rotated-refresh-token',
          user,
        }
      },
      getRefreshCookieOptions: () => refreshCookieOptions,
    })

    const req = {
      cookies: {
        refresh_token: 'cookie-refresh-token',
      },
    }
    const res = createResponseDouble()
    let forwardedError = null

    await refresh(req, res, (err) => {
      forwardedError = err || null
    })

    assert.equal(forwardedError, null)
    assert.deepEqual(refreshAdminSessionCalls, ['cookie-refresh-token'])
    assert.deepEqual(res.cookieCalls, [
      {
        name: 'refresh_token',
        value: 'rotated-refresh-token',
        options: refreshCookieOptions,
      },
    ])
    assert.deepEqual(res.jsonPayload, {
      accessToken: 'access-token',
      user,
    })
  })

  if (failures > 0) {
    console.error(`\nUnit tests failed: ${failures}`)
    process.exit(1)
  }

  console.log('\nUnit tests passed.')
}

main().catch((err) => {
  console.error(err.stack || err.message || err)
  process.exit(1)
})
