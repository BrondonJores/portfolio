const { getSettingsMap, upsertSettings } = require('../services/settingService')

async function getAll(req, res, next) {
  try {
    const settings = await getSettingsMap()
    return res.json({ data: settings })
  } catch (err) {
    next(err)
  }
}

async function upsert(req, res, next) {
  try {
    await upsertSettings(req.body)
    return res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, upsert }