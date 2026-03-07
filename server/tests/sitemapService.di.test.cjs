/* Tests DI du sitemapService (resolution URL + generation XML). */
const assert = require('node:assert/strict')
const { createSitemapService } = require('../src/services/sitemapService')

let failures = 0

/**
 * Applique temporairement des variables d'environnement.
 * @param {Record<string, unknown>} patch Variables a surcharger.
 * @param {Function} callback Fonction de test.
 * @returns {Promise<void>} Promise resolue apres restauration env.
 */
async function withEnv(patch, callback) {
  const keys = Object.keys(patch)
  const previous = {}

  for (const key of keys) {
    previous[key] = process.env[key]
    const value = patch[key]
    if (value === undefined || value === null) {
      delete process.env[key]
    } else {
      process.env[key] = String(value)
    }
  }

  try {
    await callback()
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = previous[key]
      }
    }
  }
}

/**
 * Execute un scenario asynchrone avec journal PASS/FAIL.
 * @param {string} name Nom du cas.
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
 * @returns {Promise<void>} Promise resolue en cas de succes.
 */
async function main() {
  await runCase('getSitemapPayload uses site_url setting when available', async () => {
    const service = createSitemapService({
      settingModel: {
        findOne: async () => ({ value: 'https://portfolio.example.com/' }),
      },
      projectModel: {
        findAll: async () => ([
          { slug: 'projet-alpha', updated_at: '2026-02-01T10:00:00.000Z', created_at: '2026-01-01T10:00:00.000Z' },
        ]),
      },
      articleModel: {
        findAll: async () => ([
          { slug: 'article-beta', published_at: '2026-02-03T10:00:00.000Z', updated_at: '2026-02-04T10:00:00.000Z' },
        ]),
      },
      now: () => new Date('2026-03-07T12:00:00.000Z'),
    })

    const payload = await service.getSitemapPayload({ requestOrigin: 'https://request.example.com' })

    assert.equal(payload.siteUrl, 'https://portfolio.example.com')
    assert.equal(payload.urlCount, 7)
    assert.match(payload.xml, /<loc>https:\/\/portfolio\.example\.com\/<\/loc>/)
    assert.match(payload.xml, /<loc>https:\/\/portfolio\.example\.com\/projets\/projet-alpha<\/loc>/)
    assert.match(payload.xml, /<loc>https:\/\/portfolio\.example\.com\/blog\/article-beta<\/loc>/)
    assert.match(payload.xml, /<priority>1\.0<\/priority>/)
  })

  await runCase('getSitemapPayload falls back to FRONTEND_URL env', async () => {
    await withEnv({ FRONTEND_URL: 'https://front.example.dev' }, async () => {
      const service = createSitemapService({
        settingModel: { findOne: async () => null },
        projectModel: { findAll: async () => [] },
        articleModel: { findAll: async () => [] },
        now: () => new Date('2026-03-07T12:00:00.000Z'),
      })

      const payload = await service.getSitemapPayload({ requestOrigin: 'https://request.example.com' })
      assert.equal(payload.siteUrl, 'https://front.example.dev')
      assert.equal(payload.urlCount, 5)
    })
  })

  await runCase('getSitemapPayload uses request origin and encodes slugs safely', async () => {
    await withEnv({ FRONTEND_URL: '' }, async () => {
      const service = createSitemapService({
        settingModel: { findOne: async () => null },
        projectModel: {
          findAll: async () => ([
            { slug: 'projet cool', updated_at: '2026-03-01T10:00:00.000Z' },
            { slug: '', updated_at: '2026-03-01T10:00:00.000Z' },
          ]),
        },
        articleModel: { findAll: async () => [] },
        now: () => new Date('2026-03-07T12:00:00.000Z'),
      })

      const payload = await service.getSitemapPayload({ requestOrigin: 'https://request.example.com' })

      assert.equal(payload.siteUrl, 'https://request.example.com')
      assert.equal(payload.urlCount, 6)
      assert.match(payload.xml, /https:\/\/request\.example\.com\/projets\/projet%20cool/)
      assert.doesNotMatch(payload.xml, /\/projets\/<\/loc>/)
    })
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
