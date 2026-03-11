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

const DEFAULT_PERIOD_DAYS = 30
const ALLOWED_PERIOD_DAYS = [7, 30, 90]

/**
 * Retourne une nouvelle date positionnee en debut de jour.
 * @param {Date} date Date source.
 * @returns {Date} Date normalisee a 00:00:00.000.
 */
function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

/**
 * Retourne une nouvelle date en ajoutant un delta de jours.
 * @param {Date} date Date de base.
 * @param {number} deltaDays Nombre de jours a ajouter (negatif possible).
 * @returns {Date} Date decalee.
 */
function addDays(date, deltaDays) {
  const next = new Date(date)
  next.setDate(next.getDate() + deltaDays)
  return next
}

/**
 * Convertit une date en cle `YYYY-MM-DD`.
 * @param {Date} date Date source.
 * @returns {string} Cle de jour.
 */
function toDayKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Construit la fenetre glissante des 6 derniers mois (mois courant inclus).
 * @param {Date} nowDate Date courante.
 * @param {string} locale Locale d'affichage des labels mois.
 * @returns {Array<{key:string,label:string}>} Serie de mois.
 */
function buildLastSixMonths(nowDate, locale) {
  const months = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date(nowDate)
    date.setMonth(date.getMonth() - i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleString(locale, { month: 'short' })
    months.push({ key, label })
  }

  return months
}

/**
 * Construit une fenetre glissante de jours (jour courant inclus).
 * @param {Date} nowDate Date courante.
 * @param {number} periodDays Taille de la fenetre en jours.
 * @param {string} locale Locale d'affichage.
 * @returns {Array<{key:string,label:string}>} Serie de jours.
 */
function buildRollingDays(nowDate, periodDays, locale) {
  const days = []

  for (let i = periodDays - 1; i >= 0; i--) {
    const dayDate = startOfDay(addDays(nowDate, -i))
    days.push({
      key: toDayKey(dayDate),
      label: dayDate.toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
    })
  }

  return days
}

/**
 * Convertit des lignes SQL agregees en map cle -> valeur numerique.
 * @param {Array<object>} rawRows Lignes d'aggregation.
 * @param {string} [keyField='month'] Nom du champ cle dans la ligne.
 * @returns {Record<string, number>} Map des comptes.
 */
function toCountMap(rawRows, keyField = 'month') {
  const next = {}

  for (const row of rawRows || []) {
    const key = row?.[keyField]
    if (!key) continue
    next[key] = Number.parseInt(row.count, 10) || 0
  }

  return next
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
 * Calcule une moyenne simple avec arrondi a 1 decimal.
 * @param {number[]} values Serie numerique.
 * @returns {number} Moyenne.
 */
function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0
  }

  const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0)
  return Math.round((total / values.length) * 10) / 10
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
 * Extrait un entier depuis une valeur brute.
 * @param {unknown} rawValue Valeur brute.
 * @param {number} fallback Valeur fallback.
 * @returns {number} Entier normalise.
 */
function toSafeInt(rawValue, fallback = 0) {
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

/**
 * Resolut la taille de fenetre autorisee (7/30/90 jours).
 * @param {unknown} rawValue Valeur brute.
 * @returns {number} Taille de fenetre valide.
 */
function resolvePeriodDays(rawValue) {
  const parsed = Number.parseInt(String(rawValue ?? ''), 10)
  if (ALLOWED_PERIOD_DAYS.includes(parsed)) {
    return parsed
  }
  return DEFAULT_PERIOD_DAYS
}

/**
 * Parse une valeur entiere strictement positive.
 * @param {unknown} value Valeur brute.
 * @param {number} fallback Valeur de repli.
 * @returns {number} Entier > 0.
 */
function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Clone defensif d'un payload objet.
 * @template T
 * @param {T} value Valeur source.
 * @returns {T} Copie defensive.
 */
function clonePayload(value) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value
  }

  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value))
  }
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
  const env = deps.env || process.env
  const now = deps.now || (() => new Date())
  const locale = deps.locale || 'fr-FR'
  const sequelizeFns = deps.sequelizeFns || sequelizeLib
  const { Op, fn, col, literal } = sequelizeFns
  const statsCache = new Map()
  const statsCacheTtlMs = parsePositiveInteger(env.STATS_CACHE_TTL_MS, 20_000)
  const statsTagScanLimit = Math.min(parsePositiveInteger(env.STATS_TAG_SCAN_LIMIT, 1500), 5000)

  /**
   * Construit une cle de cache stable pour le snapshot stats.
   * @param {number} periodDays Fenetre demandee.
   * @returns {string} Cle de cache.
   */
  function toCacheKey(periodDays) {
    return `period:${periodDays}|locale:${locale}`
  }

  /**
   * Lit un snapshot en cache s'il est encore valide.
   * @param {string} key Cle de cache.
   * @returns {object|null} Snapshot clone ou null si absence/expiration.
   */
  function readCache(key) {
    const entry = statsCache.get(key)
    if (!entry) {
      return null
    }

    if (entry.expiresAt <= Date.now()) {
      statsCache.delete(key)
      return null
    }

    return clonePayload(entry.payload)
  }

  /**
   * Ecrit un snapshot en cache court.
   * @param {string} key Cle de cache.
   * @param {object} payload Snapshot stats.
   * @returns {void}
   */
  function writeCache(key, payload) {
    if (statsCacheTtlMs <= 0) {
      return
    }

    statsCache.set(key, {
      expiresAt: Date.now() + statsCacheTtlMs,
      payload: clonePayload(payload),
    })
  }

  /**
   * Construit l'expression SQL de formatage mois `YYYY-MM`.
   * @param {string} field Nom de colonne SQL date.
   * @returns {unknown} Expression Sequelize utilisable en attribut.
   */
  function monthSql(field) {
    return fn('to_char', col(field), 'YYYY-MM')
  }

  /**
   * Construit l'expression SQL de formatage jour `YYYY-MM-DD`.
   * @param {string} field Nom de colonne SQL date.
   * @returns {unknown} Expression Sequelize utilisable en attribut.
   */
  function daySql(field) {
    return fn('to_char', col(field), 'YYYY-MM-DD')
  }

  /**
   * Retourne les statistiques enrichies du dashboard admin.
   * @param {object} [options={}] Options de filtrage.
   * @param {number|string} [options.periodDays] Taille de fenetre en jours (7/30/90).
   * @returns {Promise<object>} Snapshot complet (KPIs, series, tendances, top tags, recents).
   */
  async function getDashboardStats(options = {}) {
    const periodDays = resolvePeriodDays(options.periodDays)
    const bypassCache = options.disableCache === true || options.forceRefresh === true
    const cacheKey = toCacheKey(periodDays)

    if (!bypassCache) {
      const cached = readCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    const nowDate = now()

    const sixMonthsStart = new Date(nowDate)
    sixMonthsStart.setMonth(sixMonthsStart.getMonth() - 5)
    sixMonthsStart.setDate(1)
    sixMonthsStart.setHours(0, 0, 0, 0)

    const currentWindowStart = startOfDay(addDays(nowDate, -(periodDays - 1)))
    const previousWindowStart = startOfDay(addDays(currentWindowStart, -periodDays))

    const [
      messagesRaw,
      projectsRaw,
      articlesRaw,
      subscribersRaw,
      commentsRaw,
      campaignsMonthlyRaw,
      messagesPeriodRaw,
      projectsPeriodRaw,
      articlesPeriodRaw,
      subscribersPeriodRaw,
      commentsPeriodRaw,
      campaignsPeriodRaw,
      projectsPublished,
      projectsDraft,
      projectsFeatured,
      articlesPublished,
      articlesDraft,
      articleLikes,
      totalMessages,
      unreadMessages,
      commentsTotal,
      commentsApproved,
      commentsPending,
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
      commentsCurrent,
      commentsPrevious,
      campaignsCurrent,
      campaignsPrevious,
    ] = await Promise.all([
      messageModel.findAll({
        attributes: [
          [monthSql('created_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: sixMonthsStart } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      projectModel.findAll({
        attributes: [
          [monthSql('created_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { published: true, created_at: { [Op.gte]: sixMonthsStart } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      articleModel.findAll({
        attributes: [
          [monthSql('published_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { published: true, published_at: { [Op.gte]: sixMonthsStart } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      subscriberModel.findAll({
        attributes: [
          [monthSql('created_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: sixMonthsStart } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      commentModel.findAll({
        attributes: [
          [monthSql('created_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: sixMonthsStart } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      newsletterCampaignModel.findAll({
        attributes: [
          [monthSql('sent_at'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { status: 'sent', sent_at: { [Op.gte]: sixMonthsStart } },
        group: [literal('month')],
        order: [[literal('month'), 'ASC']],
        raw: true,
      }),
      messageModel.findAll({
        attributes: [
          [daySql('created_at'), 'day'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: currentWindowStart } },
        group: [literal('day')],
        order: [[literal('day'), 'ASC']],
        raw: true,
      }),
      projectModel.findAll({
        attributes: [
          [daySql('created_at'), 'day'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { published: true, created_at: { [Op.gte]: currentWindowStart } },
        group: [literal('day')],
        order: [[literal('day'), 'ASC']],
        raw: true,
      }),
      articleModel.findAll({
        attributes: [
          [daySql('published_at'), 'day'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { published: true, published_at: { [Op.gte]: currentWindowStart } },
        group: [literal('day')],
        order: [[literal('day'), 'ASC']],
        raw: true,
      }),
      subscriberModel.findAll({
        attributes: [
          [daySql('created_at'), 'day'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: currentWindowStart } },
        group: [literal('day')],
        order: [[literal('day'), 'ASC']],
        raw: true,
      }),
      commentModel.findAll({
        attributes: [
          [daySql('created_at'), 'day'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: currentWindowStart } },
        group: [literal('day')],
        order: [[literal('day'), 'ASC']],
        raw: true,
      }),
      newsletterCampaignModel.findAll({
        attributes: [
          [daySql('sent_at'), 'day'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { status: 'sent', sent_at: { [Op.gte]: currentWindowStart } },
        group: [literal('day')],
        order: [[literal('day'), 'ASC']],
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
      commentModel.count(),
      commentModel.count({ where: { approved: true } }),
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
        order: [['created_at', 'DESC']],
        limit: statsTagScanLimit,
        raw: true,
      }),
      articleModel.findAll({
        attributes: ['tags'],
        where: { published: true },
        order: [['created_at', 'DESC']],
        limit: statsTagScanLimit,
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
      commentModel.count({
        where: {
          created_at: {
            [Op.gte]: currentWindowStart,
          },
        },
      }),
      commentModel.count({
        where: {
          created_at: {
            [Op.gte]: previousWindowStart,
            [Op.lt]: currentWindowStart,
          },
        },
      }),
      newsletterCampaignModel.count({
        where: {
          status: 'sent',
          sent_at: {
            [Op.gte]: currentWindowStart,
          },
        },
      }),
      newsletterCampaignModel.count({
        where: {
          status: 'sent',
          sent_at: {
            [Op.gte]: previousWindowStart,
            [Op.lt]: currentWindowStart,
          },
        },
      }),
    ])

    const months = buildLastSixMonths(nowDate, locale)
    const msgMap = toCountMap(messagesRaw)
    const projMap = toCountMap(projectsRaw)
    const artMap = toCountMap(articlesRaw)
    const subMap = toCountMap(subscribersRaw)
    const comMap = toCountMap(commentsRaw)
    const campMap = toCountMap(campaignsMonthlyRaw)

    const chartData = months.map(({ key, label }) => ({
      month: label,
      messages: msgMap[key] || 0,
      projets: projMap[key] || 0,
      articles: artMap[key] || 0,
      abonnes: subMap[key] || 0,
      commentaires: comMap[key] || 0,
      campagnes: campMap[key] || 0,
    }))

    const rollingDays = buildRollingDays(nowDate, periodDays, locale)
    const msgDayMap = toCountMap(messagesPeriodRaw, 'day')
    const projDayMap = toCountMap(projectsPeriodRaw, 'day')
    const artDayMap = toCountMap(articlesPeriodRaw, 'day')
    const subDayMap = toCountMap(subscribersPeriodRaw, 'day')
    const comDayMap = toCountMap(commentsPeriodRaw, 'day')
    const campDayMap = toCountMap(campaignsPeriodRaw, 'day')

    const periodSeries = rollingDays.map(({ key, label }) => {
      const projectsValue = projDayMap[key] || 0
      const articlesValue = artDayMap[key] || 0

      return {
        day: label,
        messages: msgDayMap[key] || 0,
        abonnes: subDayMap[key] || 0,
        commentaires: comDayMap[key] || 0,
        campagnes: campDayMap[key] || 0,
        projets: projectsValue,
        articles: articlesValue,
        contenu: projectsValue + articlesValue,
      }
    })

    const safeProjectsPublished = toSafeInt(projectsPublished)
    const safeProjectsDraft = toSafeInt(projectsDraft)
    const safeProjectsFeatured = toSafeInt(projectsFeatured)
    const safeArticlesPublished = toSafeInt(articlesPublished)
    const safeArticlesDraft = toSafeInt(articlesDraft)
    const safeArticleLikes = toSafeInt(articleLikes)
    const safeMessagesTotal = toSafeInt(totalMessages)
    const safeUnreadMessages = toSafeInt(unreadMessages)
    const safeCommentsTotal = toSafeInt(commentsTotal)
    const safeCommentsApproved = toSafeInt(commentsApproved)
    const safeCommentsPending = toSafeInt(commentsPending)
    const safeSubscribersTotal = toSafeInt(subscribersTotal)
    const safeSubscribersConfirmed = toSafeInt(subscribersConfirmed)
    const safeCampaignsSent = toSafeInt(campaignsSent)
    const safeCampaignsDraft = toSafeInt(campaignsDraft)

    const safeMessagesCurrent = toSafeInt(messagesCurrent)
    const safeMessagesPrevious = toSafeInt(messagesPrevious)
    const safeSubscribersCurrent = toSafeInt(subscribersCurrent)
    const safeSubscribersPrevious = toSafeInt(subscribersPrevious)
    const safeProjectsCurrent = toSafeInt(projectsCurrent)
    const safeProjectsPrevious = toSafeInt(projectsPrevious)
    const safeArticlesCurrent = toSafeInt(articlesCurrent)
    const safeArticlesPrevious = toSafeInt(articlesPrevious)
    const safeCommentsCurrent = toSafeInt(commentsCurrent)
    const safeCommentsPrevious = toSafeInt(commentsPrevious)
    const safeCampaignsCurrent = toSafeInt(campaignsCurrent)
    const safeCampaignsPrevious = toSafeInt(campaignsPrevious)

    const safeContentCurrent = safeProjectsCurrent + safeArticlesCurrent
    const safeContentPrevious = safeProjectsPrevious + safeArticlesPrevious
    const safeTotalPublishedContent = safeProjectsPublished + safeArticlesPublished

    const readRate = safeMessagesTotal > 0
      ? Math.round(((safeMessagesTotal - safeUnreadMessages) / safeMessagesTotal) * 100)
      : 0

    const commentApprovalRate = safeCommentsTotal > 0
      ? Math.round((safeCommentsApproved / safeCommentsTotal) * 100)
      : 0

    const moderationBacklogRate = safeCommentsTotal > 0
      ? Math.round((safeCommentsPending / safeCommentsTotal) * 100)
      : 0

    const subscriberConfirmationRate = safeSubscribersTotal > 0
      ? Math.round((safeSubscribersConfirmed / safeSubscribersTotal) * 100)
      : 0

    const interactionTotal = safeMessagesTotal + safeCommentsTotal + safeSubscribersTotal
    const responsePressure = safeUnreadMessages + safeCommentsPending
    const avgMonthlyMessages = average(chartData.map((item) => item.messages))
    const avgMonthlySubscribers = average(chartData.map((item) => item.abonnes))
    const avgMonthlyContent = average(chartData.map((item) => item.projets + item.articles))
    const campaignsSentLast6Months = chartData.reduce((sum, item) => sum + item.campagnes, 0)

    const leadsCurrent = safeMessagesCurrent + safeSubscribersCurrent
    const leadsPrevious = safeMessagesPrevious + safeSubscribersPrevious
    const leadsPerDay = Math.round((leadsCurrent / periodDays) * 10) / 10
    const subscriberPerMessageRate = safeMessagesCurrent > 0
      ? Math.round((safeSubscribersCurrent / safeMessagesCurrent) * 100)
      : 0

    const messagesTrend = toTrend(safeMessagesCurrent, safeMessagesPrevious)
    const subscribersTrend = toTrend(safeSubscribersCurrent, safeSubscribersPrevious)
    const contentTrend = toTrend(safeContentCurrent, safeContentPrevious)
    const commentsTrend = toTrend(safeCommentsCurrent, safeCommentsPrevious)
    const campaignsTrend = toTrend(safeCampaignsCurrent, safeCampaignsPrevious)

    const snapshot = {
      filters: {
        periodDays,
        allowedPeriodDays: ALLOWED_PERIOD_DAYS,
      },
      summary: {
        projectsPublished: safeProjectsPublished,
        projectsDraft: safeProjectsDraft,
        projectsFeatured: safeProjectsFeatured,
        articlesPublished: safeArticlesPublished,
        articlesDraft: safeArticlesDraft,
        articleLikes: safeArticleLikes,
        totalPublishedContent: safeTotalPublishedContent,
        messagesTotal: safeMessagesTotal,
        unreadMessages: safeUnreadMessages,
        messageReadRate: readRate,
        commentsTotal: safeCommentsTotal,
        commentsApproved: safeCommentsApproved,
        commentsPending: safeCommentsPending,
        commentApprovalRate,
        moderationBacklogRate,
        subscribersTotal: safeSubscribersTotal,
        subscribersConfirmed: safeSubscribersConfirmed,
        subscriberConfirmationRate,
        campaignsSent: safeCampaignsSent,
        campaignsDraft: safeCampaignsDraft,
        campaignsSentLast6Months,
        interactionTotal,
        responsePressure,
        avgMonthlyMessages,
        avgMonthlySubscribers,
        avgMonthlyContent,
      },
      periodSummary: {
        days: periodDays,
        current: {
          messages: safeMessagesCurrent,
          subscribers: safeSubscribersCurrent,
          content: safeContentCurrent,
          comments: safeCommentsCurrent,
          campaigns: safeCampaignsCurrent,
          leads: leadsCurrent,
          leadsPerDay,
          subscriberPerMessageRate,
        },
        previous: {
          messages: safeMessagesPrevious,
          subscribers: safeSubscribersPrevious,
          content: safeContentPrevious,
          comments: safeCommentsPrevious,
          campaigns: safeCampaignsPrevious,
          leads: leadsPrevious,
        },
      },
      trends: {
        messages: messagesTrend,
        subscribers: subscribersTrend,
        content: contentTrend,
        comments: commentsTrend,
        campaigns: campaignsTrend,
        messages30d: messagesTrend,
        subscribers30d: subscribersTrend,
        content30d: contentTrend,
      },
      chartData,
      periodSeries,
      topTags: buildTopTags([...projectTagsRows, ...articleTagsRows]),
      recentMessages,
      lastSentCampaign: lastSentCampaign || null,
      period: {
        currentStart: currentWindowStart.toISOString(),
        previousStart: previousWindowStart.toISOString(),
        currentEnd: nowDate.toISOString(),
      },
    }

    if (!bypassCache) {
      writeCache(cacheKey, snapshot)
    }

    return snapshot
  }

  return { getDashboardStats }
}

module.exports = {
  createStatsService,
  ...createStatsService(),
}
