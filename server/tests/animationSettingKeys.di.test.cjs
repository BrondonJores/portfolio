/* Tests DI des cles animation (allowlist + defaults seedes). */
const assert = require('node:assert/strict')
const {
  ANIMATION_CORE_SETTING_KEYS,
  ANIMATION_CORE_SETTING_KEY_SET,
} = require('../src/constants/animationSettingKeys')
const settingsSeeder = require('../seeders/006-seed-settings')

let failures = 0

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
  const expectedWowKeys = [
    'anim_ui_card_tilt_enabled',
    'anim_ui_card_tilt_max_deg',
    'anim_ui_card_tilt_scale',
    'anim_ui_card_tilt_glare_enabled',
    'anim_cursor_enabled',
    'anim_cursor_size',
    'anim_cursor_ring_size',
    'anim_cursor_smoothness',
    'anim_cursor_idle_opacity',
    'anim_stats_counter_enabled',
    'anim_stats_counter_duration_ms',
    'anim_feedback_particles_enabled',
    'anim_feedback_particles_count',
    'anim_feedback_particles_spread_px',
    'anim_feedback_particles_duration_ms',
    'anim_page_transition_enabled',
    'anim_page_transition_duration_ms',
    'anim_page_transition_overlay_opacity',
  ]

  await runCase('animation key list includes all advanced interaction keys', async () => {
    expectedWowKeys.forEach((key) => {
      assert.equal(
        ANIMATION_CORE_SETTING_KEYS.includes(key),
        true,
        `Missing animation key in allowlist: ${key}`
      )
      assert.equal(
        ANIMATION_CORE_SETTING_KEY_SET.has(key),
        true,
        `Missing animation key in key set: ${key}`
      )
    })
  })

  await runCase('animation key allowlist has no duplicates', async () => {
    assert.equal(ANIMATION_CORE_SETTING_KEY_SET.size, ANIMATION_CORE_SETTING_KEYS.length)
  })

  await runCase('settings seeder provides defaults for advanced animation keys', async () => {
    let insertedRows = null
    await settingsSeeder.up({
      bulkInsert: async (tableName, rows) => {
        assert.equal(tableName, 'settings')
        insertedRows = rows
      },
    })

    assert.ok(Array.isArray(insertedRows))
    assert.ok(insertedRows.length > 0)

    const map = Object.create(null)
    insertedRows.forEach((row) => {
      if (row && typeof row.key === 'string') {
        map[row.key] = row.value
      }
    })

    assert.equal(map.anim_ui_card_tilt_enabled, 'true')
    assert.equal(map.anim_cursor_enabled, 'false')
    assert.equal(map.anim_stats_counter_enabled, 'true')
    assert.equal(map.anim_feedback_particles_enabled, 'true')
    assert.equal(map.anim_page_transition_enabled, 'true')
    assert.equal(map.anim_page_transition_duration_ms, '850')
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

