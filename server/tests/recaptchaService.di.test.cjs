/* Tests DI du recaptchaService (verification token + politiques de securite). */
const assert = require('node:assert/strict')
const { createRecaptchaService } = require('../src/services/recaptchaService')

let failures = 0

/**
 * Execute un cas de test asynchrone.
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
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si tous les tests passent.
 */
async function main() {
  await runCase('verifyToken skips when disabled', async () => {
    const service = createRecaptchaService({
      env: {
        NODE_ENV: 'development',
        RECAPTCHA_ENABLED: 'false',
      },
      fetch: async () => {
        throw new Error('fetch should not be called')
      },
    })

    const result = await service.verifyToken({
      token: undefined,
      expectedAction: 'contact_message',
    })

    assert.equal(result.enabled, false)
    assert.equal(result.skipped, true)
  })

  await runCase('verifyToken rejects missing token when enabled', async () => {
    const service = createRecaptchaService({
      env: {
        NODE_ENV: 'production',
        RECAPTCHA_ENABLED: 'true',
        RECAPTCHA_SECRET_KEY: 'secret',
      },
      fetch: async () => ({
        ok: true,
        json: async () => ({ success: true }),
      }),
    })

    await assert.rejects(
      () => service.verifyToken({ token: '', expectedAction: 'contact_message' }),
      (err) => {
        assert.equal(err.statusCode, 400)
        assert.equal(err.message, 'Verification anti-bot requise.')
        return true
      }
    )
  })

  await runCase('verifyToken rejects low score', async () => {
    const service = createRecaptchaService({
      env: {
        NODE_ENV: 'production',
        RECAPTCHA_ENABLED: 'true',
        RECAPTCHA_SECRET_KEY: 'secret',
        RECAPTCHA_MIN_SCORE: '0.7',
      },
      fetch: async () => ({
        ok: true,
        json: async () => ({
          success: true,
          action: 'contact_message',
          score: 0.3,
          hostname: 'localhost',
        }),
      }),
    })

    await assert.rejects(
      () => service.verifyToken({ token: 'abc', expectedAction: 'contact_message' }),
      (err) => {
        assert.equal(err.statusCode, 400)
        assert.equal(err.message, 'Score anti-bot insuffisant.')
        return true
      }
    )
  })

  await runCase('verifyToken rejects action mismatch', async () => {
    const service = createRecaptchaService({
      env: {
        NODE_ENV: 'production',
        RECAPTCHA_ENABLED: 'true',
        RECAPTCHA_SECRET_KEY: 'secret',
      },
      fetch: async () => ({
        ok: true,
        json: async () => ({
          success: true,
          action: 'newsletter_subscribe',
          score: 0.9,
        }),
      }),
    })

    await assert.rejects(
      () => service.verifyToken({ token: 'abc', expectedAction: 'contact_message' }),
      (err) => {
        assert.equal(err.statusCode, 400)
        assert.equal(err.message, 'Action reCAPTCHA invalide.')
        return true
      }
    )
  })

  await runCase('verifyToken accepts valid assessment and hostname allowlist', async () => {
    const service = createRecaptchaService({
      env: {
        NODE_ENV: 'production',
        RECAPTCHA_ENABLED: 'true',
        RECAPTCHA_SECRET_KEY: 'secret',
        RECAPTCHA_MIN_SCORE: '0.5',
        RECAPTCHA_ALLOWED_HOSTNAMES: 'localhost,portfolio.example.com',
      },
      fetch: async () => ({
        ok: true,
        json: async () => ({
          success: true,
          action: 'comment_create',
          score: 0.91,
          hostname: 'portfolio.example.com',
          challenge_ts: '2026-03-07T12:00:00Z',
        }),
      }),
    })

    const result = await service.verifyToken({
      token: 'token-value',
      expectedAction: 'comment_create',
      remoteIp: '127.0.0.1',
    })

    assert.equal(result.enabled, true)
    assert.equal(result.success, true)
    assert.equal(result.score, 0.91)
    assert.equal(result.hostname, 'portfolio.example.com')
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

