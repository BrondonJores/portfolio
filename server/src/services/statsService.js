/* Service metier stats : regles applicatives et acces donnees. */
const sequelizeLib = require('sequelize')
const {
  Message,
  Project,
  Article,
  Subscriber,
  Comment,
  NewsletterCampaign,
} = require('../models')

/**
 * Construit la fenetre glissante des 6 derniers mois (mois courant inclus).
 * @param {Function} now Fabrique de date courante.
 * @param {string} locale Locale d'affichage des labels mois.
 * @returns {Array<{key:string,label:string}>} Serie de mois.
 */
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

/**
 * Convertit des lignes SQL agregees en map mois -> valeur numerique.
 * @param {Array<{month:string,count:string|number}>} rawRows Lignes d'aggregation.
 * @returns {Record<string, number>} Map des comptes.
 */
function toCountMap(rawRows) {
  return Object.fromEntries(rawRows.map((row) => [row.month, Number.parseInt(row.count, 10)]))
}

/**
 * Calcule une tendance entre deux periodes.
 * @param {number} current Valeur periode courante.
 * @param {number} previous Valeur periode precedente.
 * @returns {{current:number,previous:number,delta:number,deltaPercent:number,direction:'up'|'down'|'flat'}} Metriques de tendance.
 */
function toTrend(current, previous) {
  const delta = current - previous
  const deltaPercent = previous > 0
    ? Math.round((delta / previous) * 100)
    : current > 0
      ? 100
      : 0

  return {
    current,
    previous,
    delta,
    deltaPercent,
    direction: delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down',
  }
}

/**
 * Normalise un tag en cle exploitable.
 * @param {unknown} rawValue Valeur brute.
 * @returns {string} Tag normalise.
 */
function normalizeTag(rawValue) {
  if (typeof rawValue !== 'string') return ''
  return rawValue.trim().toLowerCase().slice(0, 60)
}

/**
 * Construit le top des tags les plus utilises.
 * @param {Array<{tags?: unknown}>} rows Lignes contenant des tags.
 * @param {number} [limit=6] Nombre max d'entrees.
 * @returns {Array<{tag:string,count:number}>} Classement des tags.
 */
function buildTopTags(rows, limit = 6) {
  const counts = new Map()

  for (const row of rows) {
    const tags = Array.isArray(row?.tags) ? row.tags : []

    for (const rawTag of tags) {
      const candidate = typeof rawTag === 'string'
        ? rawTag
        : rawTag && typeof rawTag === 'object' && typeof rawTag.name === 'string'
          ? rawTag.name
          : ''

      const tag = normalizeTag(candidate)
      if (!tag) continue

      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit)
}

/**
 * Construit le service statistiques avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @returns {{getDashboardStats: Function}} API stats.
 */
function createStatsService(deps = {}) {
  const messageModel = deps.messageModel || Message
  const projectModel = deps.projectModel || Project
  const articleModel = deps.articleModel || Article
  const subscriberModel = deps.subscriberModel || Subscriber
  const commentModel = deps.commentModel || Comment
  const newsletterCampaignModel = deps.newsletterCampaignModel || NewsletterCampaign
  const now = deps.now || (() => new Date())
  const locale = deps.locale || 'fr-FR'
  const sequelizeFns = deps.sequelizeFns || sequelizeLib
  const { Op, fn, col, literal } = sequelizeFns

  /**
   * Construit l'expression SQL de formatage mois `YYYY-MM`.
   * @param {string} field Nom de colonne SQL date.
   * @returns {unknown} Expression Sequelize utilisable en attribut.
   */
  function monthSql(field) {
    return fn('to_char', col(field), 'YYYY-MM')
  }

  /**
   * Retourne les statistiques enrichies du dashboard admin.
   * @returns {Promise<object>} Snapshot complet (KPIs, series, tendances, top tags, recents).
   */
  async function getDashboardStats() {
    const nowDate = now()

    const since = new Date(nowDate)
    since.setMonth(since.getMonth() - 5)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const currentWindowStart = new Date(nowDate)
    currentWindowStart.setDate(currentWindowStart.getDate() - 29)
    currentWindowStart.setHours(0, 0, 0, 0)

    const previousWindowStart = new Date(currentWindowStart)
    previousWindowStart.setDate(previousWindowStart.getDate() - 30)

    const [
      messagesRaw,
      projectsRaw,
      articlesRaw,
      subscribersRaw,
      commentsRaw,
      projectsPublished,
      projectsDraft,
      projectsFeatured,
      articlesPublished,
      articlesDraft,
      articleLikes,
      totalMessages,
      unreadMessages,
      pendingComments,
      subscribersTotal,
      subscribersConfirmed,
      campaignsSent,
      campaignsDraft,
      lastSentCampaign,
      recentMessages,
      projectTagsRows,
      articleTagsRows,
      messagesCurrent,
      messagesPrevious,
      subscribersCurrent,
      subscribersPrevious,
      projectsCurrent,
      projectsPrevious,
      articlesCurrent,
      articlesPrevious,
    ] = await Promise.all([
      messageModel.findAll({
        attributes: [
          [monthSql('created_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: since } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      projectModel.findAll({
        attributes: [
          [monthSql('created_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { published: true, created_at: { [Op.gte]: since } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      articleModel.findAll({
        attributes: [
          [monthSql('published_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { published: true, published_at: { [Op.gte]: since } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      subscriberModel.findAll({
        attributes: [
          [monthSql('created_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: since } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      commentModel.findAll({
        attributes: [
          [monthSql('created_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: since } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      projectModel.count({ where: { published: true } }),
      projectModel.count({ where: { published: false } }),
      projectModel.count({ where: { published: true, featured: true } }),
      articleModel.count({ where: { published: true } }),
      articleModel.count({ where: { published: false } }),
      articleModel.sum('likes', { where: { published: true } }),
      messageModel.count(),
      messageModel.count({ where: { read_at: null } }),
      commentModel.count({ where: { approved: false } }),
      subscriberModel.count(),
      subscriberModel.count({ where: { confirmed: true } }),
      newsletterCampaignModel.count({ where: { status: 'sent' } }),
      newsletterCampaignModel.count({ where: { status: 'draft' } }),
      newsletterCampaignModel.findOne({
        attributes: ['id', 'subject', 'sent_at'],
        where: { status: 'sent' },
        order: [['sent_at', 'DESC']],
        raw: true,
      }),
      messageModel.findAll({
        attributes: ['id', 'name', 'email', 'message', 'read_at', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 5,
        raw: true,
      }),
      projectModel.findAll({
        attributes: ['tags'],
        where: { published: true },
        raw: true,
      }),
      articleModel.findAll({
        attributes: ['tags'],
        where: { published: true },
        raw: true,
      }),
      messageModel.count({
        where: {
          created_at: {
            [Op.gte]: currentWindowStart,
          },
        },
      }),
      messageModel.count({
        where: {
          created_at: {
            [Op.gte]: previousWindowStart,
            [Op.lt]: currentWindowStart,
          },
        },
      }),
      subscriberModel.count({
        where: {
          created_at: {
            [Op.gte]: currentWindowStart,
          },
        },
      }),
      subscriberModel.count({
        where: {
          created_at: {
            [Op.gte]: previousWindowStart,
            [Op.lt]: currentWindowStart,
          },
        },
      }),
      projectModel.count({
        where: {
          published: true,
          created_at: {
            [Op.gte]: currentWindowStart,
          },
        },
      }),
      projectModel.count({
        where: {
          published: true,
          created_at: {
            [Op.gte]: previousWindowStart,
            [Op.lt]: currentWindowStart,
          },
        },
      }),
      articleModel.count({
        where: {
          published: true,
          published_at: {
            [Op.gte]: currentWindowStart,
          },
        },
      }),
      articleModel.count({
        where: {
          published: true,
          published_at: {
            [Op.gte]: previousWindowStart,
            [Op.lt]: currentWindowStart,
          },
        },
      }),
    ])

    const months = buildLastSixMonths(now, locale)
    const msgMap = toCountMap(messagesRaw)
    const projMap = toCountMap(projectsRaw)
    const artMap = toCountMap(articlesRaw)
    const subMap = toCountMap(subscribersRaw)
    const comMap = toCountMap(commentsRaw)

    const chartData = months.map(({ key, label }) => ({
      month: label,
      messages: msgMap[key] || 0,
      projets: projMap[key] || 0,
      articles: artMap[key] || 0,
      abonnes: subMap[key] || 0,
      commentaires: comMap[key] || 0,
    }))

    const contentCurrent = projectsCurrent + articlesCurrent
    const contentPrevious = projectsPrevious + articlesPrevious

    const safeMessagesTotal = Number(totalMessages) || 0
    const safeUnreadMessages = Number(unreadMessages) || 0
    const readRate = safeMessagesTotal > 0
      ? Math.round(((safeMessagesTotal - safeUnreadMessages) / safeMessagesTotal) * 100)
      : 0

    return {
      summary: {
        projectsPublished: Number(projectsPublished) || 0,
        projectsDraft: Number(projectsDraft) || 0,
        projectsFeatured: Number(projectsFeatured) || 0,
        articlesPublished: Number(articlesPublished) || 0,
        articlesDraft: Number(articlesDraft) || 0,
        articleLikes: Number(articleLikes) || 0,
        messagesTotal: safeMessagesTotal,
        unreadMessages: safeUnreadMessages,
        messageReadRate: readRate,
        commentsPending: Number(pendingComments) || 0,
        subscribersTotal: Number(subscribersTotal) || 0,
        subscribersConfirmed: Number(subscribersConfirmed) || 0,
        campaignsSent: Number(campaignsSent) || 0,
        campaignsDraft: Number(campaignsDraft) || 0,
      },
      trends: {
        messages30d: toTrend(Number(messagesCurrent) || 0, Number(messagesPrevious) || 0),
        subscribers30d: toTrend(Number(subscribersCurrent) || 0, Number(subscribersPrevious) || 0),
        content30d: toTrend(contentCurrent, contentPrevious),
      },
      chartData,
      topTags: buildTopTags([...projectTagsRows, ...articleTagsRows]),
      recentMessages,
      lastSentCampaign: lastSentCampaign || null,
      period: {
        currentStart: currentWindowStart.toISOString(),
        previousStart: previousWindowStart.toISOString(),
        currentEnd: nowDate.toISOString(),
      },
    }
  }

  return { getDashboardStats }
}

module.exports = {
  createStatsService,
  ...createStatsService(),
}
