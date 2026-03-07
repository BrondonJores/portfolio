const sequelizeLib = require('sequelize')
const { Message, Project, Article } = require('../models')

function buildLastSixMonths(now, locale) {
  const months = []
  const baseDate = now()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(baseDate)
    date.setMonth(date.getMonth() - i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleString(locale, { month: 'short' })
    months.push({ key, label })
  }
  return months
}

function toCountMap(rawRows) {
  return Object.fromEntries(rawRows.map((row) => [row.month, Number.parseInt(row.count, 10)]))
}

function createStatsService(deps = {}) {
  const messageModel = deps.messageModel || Message
  const projectModel = deps.projectModel || Project
  const articleModel = deps.articleModel || Article
  const now = deps.now || (() => new Date())
  const locale = deps.locale || 'fr-FR'
  const sequelizeFns = deps.sequelizeFns || sequelizeLib
  const { Op, fn, col, literal } = sequelizeFns

  function monthSql(field) {
    return fn('to_char', col(field), 'YYYY-MM')
  }

  async function getDashboardStats() {
    const since = now()
    since.setMonth(since.getMonth() - 5)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const messagesRaw = await messageModel.findAll({
      attributes: [
        [monthSql('created_at'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: since } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    const projectsRaw = await projectModel.findAll({
      attributes: [
        [monthSql('created_at'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { published: true, created_at: { [Op.gte]: since } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    const articlesRaw = await articleModel.findAll({
      attributes: [
        [monthSql('published_at'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { published: true, published_at: { [Op.gte]: since } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    const months = buildLastSixMonths(now, locale)
    const msgMap = toCountMap(messagesRaw)
    const projMap = toCountMap(projectsRaw)
    const artMap = toCountMap(articlesRaw)

    return months.map(({ key, label }) => ({
      month: label,
      messages: msgMap[key] || 0,
      projets: projMap[key] || 0,
      articles: artMap[key] || 0,
    }))
  }

  return { getDashboardStats }
}

module.exports = {
  createStatsService,
  ...createStatsService(),
}