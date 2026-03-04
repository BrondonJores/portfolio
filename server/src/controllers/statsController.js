/* Controleur des statistiques du tableau de bord - compatible Postgres */
const { Op, fn, col, literal } = require('sequelize')
const { Message, Project, Article } = require('../models')

async function getStats(req, res) {
  try {
    // Date de début : 6 mois en arrière
    const since = new Date()
    since.setMonth(since.getMonth() - 5)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    // Fonction helper pour Postgres : format YYYY-MM
    const formatMonth = (field) => fn('to_char', col(field), 'YYYY-MM')

    // Messages par mois
    const messagesRaw = await Message.findAll({
      attributes: [
        [formatMonth('created_at'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: since } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    // Projets publiés par mois
    const projectsRaw = await Project.findAll({
      attributes: [
        [formatMonth('created_at'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { published: true, created_at: { [Op.gte]: since } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    // Articles publiés par mois
    const articlesRaw = await Article.findAll({
      attributes: [
        [formatMonth('published_at'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { published: true, published_at: { [Op.gte]: since } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
      raw: true,
    })

    // Tableau de 6 mois avec 0 par défaut
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('fr-FR', { month: 'short' })
      months.push({ key, label })
    }

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
    console.error('Erreur /admin/stats:', err)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getStats }