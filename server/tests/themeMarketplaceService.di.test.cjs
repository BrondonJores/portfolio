/* Tests DI du themeMarketplaceService (catalogue + import). */
const assert = require('node:assert/strict')
const { createThemeMarketplaceService } = require('../src/services/themeMarketplaceService')

let failures = 0

/**
 * Execute un scenario asynchrone avec sortie uniforme.
 * @param {string} name Nom du test.
 * @param {Function} callback Fonction scenario.
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
 * Cree un faux preset mutable.
 * @param {object} seed Donnees initiales.
 * @returns {object} Faux preset avec update.
 */
function buildFakePreset(seed) {
  return {
    ...seed,
    async update(patch) {
      Object.assign(this, patch)
      return this
    },
  }
}

/**
 * Cree un faux repository marketplace en memoire.
 * @returns {{findAll: Function, upsert: Function}} Repository fake.
 */
function buildFakeMarketplaceItemModel() {
  const rows = []

  return {
    async findAll({ where } = {}) {
      return rows.filter((row) => {
        if (where?.type && row.type !== where.type) return false
        if (where?.is_active !== undefined && row.is_active !== where.is_active) return false
        return true
      })
    },
    async upsert(payload) {
      const index = rows.findIndex((row) => row.type === payload.type && row.slug === payload.slug)
      if (index >= 0) {
        rows[index] = { ...rows[index], ...payload }
      } else {
        rows.push({ ...payload })
      }
    },
  }
}

/**
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  const fakeCatalog = [
    {
      slug: 'ocean-bloom',
      name: 'Ocean Bloom',
      shortDescription: 'Clean ocean style',
      description: 'Theme clean',
      category: 'creative',
      style: 'clean',
      featured: true,
      version: 2,
      tags: ['clean', 'portfolio'],
      settings: {
        theme_dark_bg_primary: '#001122',
        theme_light_bg_primary: '#f7ffff',
        theme_dark_accent: '#00ffaa',
        theme_dark_accent_light: '#66ffcc',
      },
    },
    {
      slug: 'mono-terminal',
      name: 'Mono Terminal',
      shortDescription: 'Terminal style',
      description: 'Theme developer',
      category: 'developer',
      style: 'mono',
      featured: false,
      version: 1,
      tags: ['dev'],
      settings: {
        theme_dark_bg_primary: '#000000',
        theme_light_bg_primary: '#f4f8f4',
        theme_dark_accent: '#66ff66',
        theme_dark_accent_light: '#a5ffa5',
      },
    },
  ]

  await runCase('listMarketplaceThemes filters by query and category', async () => {
    const service = createThemeMarketplaceService({
      catalog: fakeCatalog,
      marketplaceItemModel: buildFakeMarketplaceItemModel(),
    })
    const creativeOnly = await service.listMarketplaceThemes({ category: 'creative' })
    const byQuery = await service.listMarketplaceThemes({ q: 'terminal' })

    assert.equal(creativeOnly.length, 1)
    assert.equal(creativeOnly[0].slug, 'ocean-bloom')
    assert.equal(byQuery.length, 1)
    assert.equal(byQuery[0].slug, 'mono-terminal')
  })

  await runCase('importMarketplaceTheme creates preset when missing', async () => {
    const createdPayloads = []
    const fakeThemePresetModel = {
      findAll: async () => [],
      create: async (payload) => {
        createdPayloads.push(payload)
        return buildFakePreset({ id: 7, ...payload })
      },
    }

    const service = createThemeMarketplaceService({
      catalog: fakeCatalog,
      themePresetModel: fakeThemePresetModel,
      settingModel: { upsert: async () => {} },
      marketplaceItemModel: buildFakeMarketplaceItemModel(),
    })

    const result = await service.importMarketplaceTheme({ slug: 'ocean-bloom' })

    assert.equal(result.action, 'created')
    assert.equal(result.applied, false)
    assert.equal(createdPayloads.length, 1)
    assert.equal(createdPayloads[0].settings.marketplace_slug, 'ocean-bloom')
  })

  await runCase('importMarketplaceTheme updates existing preset when replaceExisting=true', async () => {
    const existing = buildFakePreset({
      id: 3,
      name: 'Ocean Bloom',
      description: 'Ancien',
      settings: { marketplace_slug: 'ocean-bloom' },
    })

    const fakeThemePresetModel = {
      findAll: async () => [existing],
      create: async () => {
        throw new Error('create should not be called')
      },
    }

    const service = createThemeMarketplaceService({
      catalog: fakeCatalog,
      themePresetModel: fakeThemePresetModel,
      settingModel: { upsert: async () => {} },
      marketplaceItemModel: buildFakeMarketplaceItemModel(),
    })

    const result = await service.importMarketplaceTheme({
      slug: 'ocean-bloom',
      replaceExisting: true,
    })

    assert.equal(result.action, 'updated')
    assert.equal(existing.description, 'Theme clean')
    assert.equal(existing.settings.marketplace_version, 2)
  })

  await runCase('importMarketplaceTheme skips existing preset when replaceExisting=false', async () => {
    const existing = buildFakePreset({
      id: 4,
      name: 'Ocean Bloom',
      description: 'Stable',
      settings: { marketplace_slug: 'ocean-bloom' },
    })

    const fakeThemePresetModel = {
      findAll: async () => [existing],
      create: async () => {
        throw new Error('create should not be called')
      },
    }

    const service = createThemeMarketplaceService({
      catalog: fakeCatalog,
      themePresetModel: fakeThemePresetModel,
      settingModel: { upsert: async () => {} },
      marketplaceItemModel: buildFakeMarketplaceItemModel(),
    })

    const result = await service.importMarketplaceTheme({
      slug: 'ocean-bloom',
      replaceExisting: false,
    })

    assert.equal(result.action, 'skipped')
    assert.equal(result.applied, false)
  })

  await runCase('importMarketplaceTheme applies settings when applyAfterImport=true', async () => {
    const upsertCalls = []
    const fakeThemePresetModel = {
      findAll: async () => [],
      create: async (payload) => buildFakePreset({ id: 8, ...payload }),
    }

    const service = createThemeMarketplaceService({
      catalog: fakeCatalog,
      themePresetModel: fakeThemePresetModel,
      settingModel: {
        upsert: async (payload) => {
          upsertCalls.push(payload)
        },
      },
      marketplaceItemModel: buildFakeMarketplaceItemModel(),
      now: () => new Date('2026-03-07T10:00:00.000Z'),
    })

    const result = await service.importMarketplaceTheme({
      slug: 'mono-terminal',
      applyAfterImport: true,
    })

    assert.equal(result.action, 'created')
    assert.equal(result.applied, true)
    assert.ok(upsertCalls.length > 0)
    assert.equal(upsertCalls[0].updated_at.toISOString(), '2026-03-07T10:00:00.000Z')
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
