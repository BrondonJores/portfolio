/* Tests DI du statsService (snapshot dashboard enrichi). */
const assert = require('node:assert/strict')
const { createStatsService } = require('../src/services/statsService')

let failures = 0

/**
 * Execute un cas de test asynchrone.
 * @param {string} name Nom du scenario.
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
 * Construit des fakes Sequelize minimaux pour les operateurs utilises.
 * @returns {object} API sequelize injectee.
 */
function createFakeSequelizeFns() {
  return {
    Op: {
      gte: '$gte',
      lt: '$lt',
    },
    fn: (...args) => ({ kind: 'fn', args }),
    col: (value) => value,
    literal: (value) => value,
  }
}

/**
 * Detecte l'alias demande dans `findAll`.
 * @param {object} options Options Sequelize.
 * @returns {string} Alias extrait (`month`, `day`, ...).
 */
function getAlias(options) {
  const attrs = options?.attributes
  if (!Array.isArray(attrs) || !Array.isArray(attrs[0])) {
    return ''
  }
  return attrs[0][1] || ''
}

/**
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  await runCase('getDashboardStats returns summary, filters, series and trends', async () => {
    const messageModel = {
      findAll: async (options) => {
        if (options?.limit === 5) {
          return [
            { id: 11, name: 'A', email: 'a@example.com', message: 'Hello', read_at: null, created_at: '2026-03-10T00:00:00Z' },
            { id: 10, name: 'B', email: 'b@example.com', message: 'Yo', read_at: '2026-03-09T00:00:00Z', created_at: '2026-03-09T00:00:00Z' },
          ]
        }

        const alias = getAlias(options)
        if (alias === 'day') {
          return [
            { day: '2026-03-13', count: '2' },
            { day: '2026-03-15', count: '1' },
          ]
        }

        return [
          { month: '2026-02', count: '5' },
          { month: '2026-03', count: '2' },
        ]
      },
      count: async (options) => {
        if (!options) return 10
        const where = options.where || {}
        if (where.read_at === null) return 4
        if (where.created_at?.$lt) return 3
        if (where.created_at?.$gte) return 7
        return 0
      },
    }

    const projectModel = {
      findAll: async (options) => {
        if (Array.isArray(options?.attributes) && options.attributes.includes('tags')) {
          return [{ tags: ['react', 'api'] }, { tags: ['api'] }]
        }

        const alias = getAlias(options)
        if (alias === 'day') {
          return [{ day: '2026-03-15', count: '1' }]
        }

        return [{ month: '2026-03', count: '1' }]
      },
      count: async (options) => {
        const where = options?.where || {}
        if (where.published === true && where.featured === true) return 1
        if (where.published === true && where.created_at?.$lt) return 1
        if (where.published === true && where.created_at?.$gte) return 4
        if (where.published === true) return 8
        if (where.published === false) return 2
        return 0
      },
    }

    const articleModel = {
      findAll: async (options) => {
        if (Array.isArray(options?.attributes) && options.attributes.includes('tags')) {
          return [{ tags: ['react', { name: 'seo' }] }]
        }

        const alias = getAlias(options)
        if (alias === 'day') {
          return [{ day: '2026-03-14', count: '1' }]
        }

        return [{ month: '2026-02', count: '2' }]
      },
      count: async (options) => {
        const where = options?.where || {}
        if (where.published === true && where.published_at?.$lt) return 2
        if (where.published === true && where.published_at?.$gte) return 3
        if (where.published === true) return 12
        if (where.published === false) return 5
        return 0
      },
      sum: async () => 77,
    }

    const subscriberModel = {
      findAll: async (options) => {
        const alias = getAlias(options)
        if (alias === 'day') {
          return [{ day: '2026-03-15', count: '2' }]
        }
        return [{ month: '2026-03', count: '3' }]
      },
      count: async (options) => {
        const where = options?.where || {}
        if (!options) return 30
        if (where.confirmed === true) return 24
        if (where.created_at?.$lt) return 0
        if (where.created_at?.$gte) return 6
        return 0
      },
    }

    const commentModel = {
      findAll: async (options) => {
        const alias = getAlias(options)
        if (alias === 'day') {
          return [{ day: '2026-03-15', count: '1' }]
        }
        return [{ month: '2026-01', count: '4' }]
      },
      count: async (options) => {
        if (!options) return 9
        const where = options.where || {}
        if (where.approved === true) return 6
        if (where.approved === false && !where.created_at) return 3
        if (where.created_at?.$lt) return 2
        if (where.created_at?.$gte) return 5
        return 0
      },
    }

    const newsletterCampaignModel = {
      findAll: async (options) => {
        const alias = getAlias(options)
        if (alias === 'day') {
          return [{ day: '2026-03-12', count: '1' }]
        }
        return [{ month: '2026-03', count: '2' }]
      },
      count: async (options) => {
        const where = options?.where || {}
        if (where.status === 'sent' && where.sent_at?.$lt) return 1
        if (where.status === 'sent' && where.sent_at?.$gte) return 2
        if (where.status === 'sent') return 2
        if (where.status === 'draft') return 1
        return 0
      },
      findOne: async () => ({ id: 1, subject: 'Release note', sent_at: '2026-03-08T00:00:00Z' }),
    }

    const service = createStatsService({
      messageModel,
      projectModel,
      articleModel,
      subscriberModel,
      commentModel,
      newsletterCampaignModel,
      now: () => new Date('2026-03-15T12:00:00.000Z'),
      locale: 'en-US',
      sequelizeFns: createFakeSequelizeFns(),
    })

    const data = await service.getDashboardStats({ periodDays: 7 })

    assert.equal(data.filters.periodDays, 7)
    assert.equal(data.summary.projectsPublished, 8)
    assert.equal(data.summary.articlesPublished, 12)
    assert.equal(data.summary.unreadMessages, 4)
    assert.equal(data.summary.messageReadRate, 60)
    assert.equal(data.summary.commentsTotal, 9)
    assert.equal(data.summary.commentApprovalRate, 67)
    assert.equal(data.summary.moderationBacklogRate, 33)
    assert.equal(data.summary.subscribersTotal, 30)
    assert.equal(data.summary.subscriberConfirmationRate, 80)
    assert.equal(data.summary.campaignsSent, 2)
    assert.equal(data.summary.articleLikes, 77)
    assert.equal(data.summary.responsePressure, 7)

    assert.equal(data.trends.messages.current, 7)
    assert.equal(data.trends.messages.previous, 3)
    assert.equal(data.trends.messages.direction, 'up')
    assert.equal(data.trends.subscribers.deltaPercent, 100)
    assert.equal(data.trends.content.current, 7)
    assert.equal(data.trends.content.previous, 3)
    assert.equal(data.trends.comments.current, 5)
    assert.equal(data.trends.campaigns.current, 2)

    assert.equal(data.chartData.length, 6)
    assert.equal(data.chartData[5].messages, 2)
    assert.equal(data.chartData[5].projets, 1)
    assert.equal(data.chartData[5].abonnes, 3)
    assert.equal(data.chartData[4].articles, 2)
    assert.equal(data.chartData[5].campagnes, 2)

    assert.equal(data.periodSeries.length, 7)
    assert.equal(data.periodSummary.current.messages, 7)
    assert.equal(data.periodSummary.current.content, 7)
    assert.equal(data.periodSummary.current.leads, 13)

    assert.equal(data.topTags[0].tag, 'api')
    assert.equal(data.topTags[0].count, 2)
    assert.equal(data.topTags[1].tag, 'react')
    assert.equal(data.topTags[1].count, 2)

    assert.equal(data.recentMessages.length, 2)
    assert.equal(data.lastSentCampaign.subject, 'Release note')
    assert.ok(data.period.currentStart)
  })

  await runCase('getDashboardStats handles empty models safely', async () => {
    const emptyModel = {
      findAll: async () => [],
      count: async () => 0,
      sum: async () => 0,
      findOne: async () => null,
    }

    const service = createStatsService({
      messageModel: emptyModel,
      projectModel: emptyModel,
      articleModel: emptyModel,
      subscriberModel: emptyModel,
      commentModel: emptyModel,
      newsletterCampaignModel: emptyModel,
      now: () => new Date('2026-03-15T12:00:00.000Z'),
      locale: 'en-US',
      sequelizeFns: createFakeSequelizeFns(),
    })

    const data = await service.getDashboardStats()

    assert.equal(data.filters.periodDays, 30)
    assert.equal(data.summary.messagesTotal, 0)
    assert.equal(data.summary.messageReadRate, 0)
    assert.equal(data.summary.commentApprovalRate, 0)
    assert.equal(data.trends.messages.direction, 'flat')
    assert.equal(data.topTags.length, 0)
    assert.equal(data.recentMessages.length, 0)
    assert.equal(data.chartData.length, 6)
    assert.equal(data.periodSeries.length, 30)
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

