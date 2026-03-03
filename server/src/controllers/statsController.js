/* Controleur des statistiques du tableau de bord */
const { Op, fn, col, literal } = require('sequelize')
const { Message, Project, Article } = require('../models')

async function getStats(req, res, next) {
  try {
    /* Calcul de la date de debut : 6 mois en arriere */
    const since = new Date()
    since.setMonth(since.getMonth() - 5)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    /* Agregation des messages par mois */
    const messagesRaw = await Message.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: since } },
      group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    /* Agregation des projets publies par mois (created_at) */
    const projectsRaw = await Project.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { published: true, created_at: { [Op.gte]: since } },
      group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    /* Agregation des articles publies par mois (published_at) */
    const articlesRaw = await Article.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('published_at'), '%Y-%m'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { published: true, published_at: { [Op.gte]: since } },
      group: [fn('DATE_FORMAT', col('published_at'), '%Y-%m')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    /* Construire un tableau de 6 mois avec des 0 par defaut */
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('fr-FR', { month: 'short' })
      months.push({ key, label })
    }

    /* Mapper les donnees brutes sur les mois */
    const toMap = (raw) => Object.fromEntries(raw.map((r) => [r.month, parseInt(r.count, 10)]))
    const msgMap = toMap(messagesRaw)
    const projMap = toMap(projectsRaw)
    const artMap = toMap(articlesRaw)

    const data = months.map(({ key, label }) => ({
      month: label,
      messages: msgMap[key] || 0,
      projets: projMap[key] || 0,
      articles: artMap[key] || 0,
    }))

    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

module.exports = { getStats }
