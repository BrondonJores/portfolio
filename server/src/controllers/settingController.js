/* Controleur des parametres */
const { Setting } = require('../models')

/* Recuperation de tous les parametres sous forme d'objet { key: value } */
async function getAll(req, res, next) {
  try {
    const settings = await Setting.findAll()
    const obj = {}
    settings.forEach((s) => { obj[s.key] = s.value })
    return res.json({ data: obj })
  } catch (err) {
    next(err)
  }
}

/* Mise a jour (upsert) des parametres depuis un objet { key: value } */
async function upsert(req, res, next) {
  try {
    const entries = Object.entries(req.body)
    await Promise.all(
      entries.map(([key, value]) =>
        Setting.upsert({ key, value, updated_at: new Date() })
      )
    )
    return res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, upsert }
