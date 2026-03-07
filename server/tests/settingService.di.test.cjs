/* Tests DI du settingService (sanitisation des cles et map sans prototype). */
const assert = require('node:assert/strict')
const { createSettingService } = require('../src/services/settingService')

let failures = 0

/**
 * Execute un test asynchrone avec journalisation uniforme.
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
  await runCase('upsertSettings rejects dangerous key __proto__', async () => {
    const payload = JSON.parse('{"__proto__":"polluted"}')

    const service = createSettingService({
      settingModel: {
        upsert: async () => ({}),
      },
    })

    await assert.rejects(
      () => service.upsertSettings(payload),
      (err) => {
        assert.equal(err.statusCode, 400)
        return true
      }
    )
  })

  await runCase('upsertSettings writes valid keys', async () => {
    const calls = []

    const service = createSettingService({
      settingModel: {
        upsert: async (payload) => {
          calls.push(payload)
        },
      },
      now: () => new Date('2026-03-07T10:00:00.000Z'),
    })

    await service.upsertSettings({
      site_title: 'Portfolio',
      theme_primary: '#111111',
    })

    assert.equal(calls.length, 2)
    assert.equal(calls[0].updated_at.toISOString(), '2026-03-07T10:00:00.000Z')
  })

  await runCase('getSettingsMap returns a null-prototype object', async () => {
    const service = createSettingService({
      settingModel: {
        findAll: async () => [{ key: 'site_title', value: 'Portfolio' }],
      },
    })

    const map = await service.getSettingsMap()
    assert.equal(Object.getPrototypeOf(map), null)
    assert.equal(map.site_title, 'Portfolio')
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
