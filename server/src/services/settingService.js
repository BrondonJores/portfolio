const { Setting } = require('../models')

function toSettingsMap(rows) {
  const map = {}
  for (const row of rows) {
    map[row.key] = row.value
  }
  return map
}

function createSettingService(deps = {}) {
  const settingModel = deps.settingModel || Setting
  const now = deps.now || (() => new Date())

  async function getSettingsMap() {
    const rows = await settingModel.findAll()
    return toSettingsMap(rows)
  }

  async function upsertSettings(payload) {
    const entries = Object.entries(payload)

    await Promise.all(
      entries.map(([key, value]) =>
        settingModel.upsert({ key, value, updated_at: now() })
      )
    )
  }

  return {
    getSettingsMap,
    upsertSettings,
  }
}

module.exports = {
  createSettingService,
  ...createSettingService(),
}