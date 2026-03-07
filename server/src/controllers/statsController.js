const { getDashboardStats } = require('../services/statsService')

async function getStats(req, res, next) {
  try {
    const data = await getDashboardStats()
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

module.exports = { getStats }