/* Tests DI du themePresetService (CRUD + apply). */
const assert = require('node:assert/strict')
const { createThemePresetService } = require('../src/services/themePresetService')

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
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  await runCase('createThemePreset stores a sanitized settings payload', async () => {
    let capturedPayload = null

    const fakeThemePresetModel = {
      create: async (payload) => {
        capturedPayload = payload
        return { id: 1, ...payload }
      },
    }

    const service = createThemePresetService({
      themePresetModel: fakeThemePresetModel,
    })

    const created = await service.createThemePreset({
      name: '  Preset A  ',
      description: '  Desc A  ',
      settings: { ui_font_scale: '1.1', invalid: { nested: true } },
    })

    assert.equal(created.name, 'Preset A')
    assert.equal(capturedPayload.description, 'Desc A')
    assert.equal(capturedPayload.settings.ui_font_scale, '1.1')
    assert.equal(capturedPayload.settings.invalid, undefined)
  })

  await runCase('applyThemePreset writes every setting using injected model', async () => {
    const upsertCalls = []

    const fakeThemePresetModel = {
      findByPk: async () => ({
        id: 4,
        settings: {
          theme_dark_accent: '#00ffaa',
          ui_font_scale: '1.05',
        },
      }),
    }

    const fakeSettingModel = {
      upsert: async (payload) => {
        upsertCalls.push(payload)
      },
    }

    const fakeNow = () => new Date('2026-01-01T00:00:00Z')

    const service = createThemePresetService({
      themePresetModel: fakeThemePresetModel,
      settingModel: fakeSettingModel,
      now: fakeNow,
    })

    await service.applyThemePreset(4)

    assert.equal(upsertCalls.length, 2)
    assert.equal(upsertCalls[0].updated_at.toISOString(), '2026-01-01T00:00:00.000Z')
  })

  await runCase('deleteThemePreset throws 404 when preset does not exist', async () => {
    const fakeThemePresetModel = {
      findByPk: async () => null,
    }

    const service = createThemePresetService({ themePresetModel: fakeThemePresetModel })

    await assert.rejects(
      () => service.deleteThemePreset(999),
      (err) => {
        assert.equal(err.statusCode, 404)
        assert.equal(err.message, 'Preset de theme introuvable.')
        return true
      }
    )
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
