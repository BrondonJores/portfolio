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
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  await runCase('getDashboardStats returns summary, trends and top tags', async () => {
    const messageModel = {
      findAll: async (options) => (options?.limit === 5
        ? [
            { id: 11, name: 'A', email: 'a@example.com', message: 'Hello', read_at: null, created_at: '2026-03-10T00:00:00Z' },
            { id: 10, name: 'B', email: 'b@example.com', message: 'Yo', read_at: '2026-03-09T00:00:00Z', created_at: '2026-03-09T00:00:00Z' },
          ]
        : [
            { month: '2026-02', count: '5' },
            { month: '2026-03', count: '2' },
          ]),
      count: async (options) => {
        if (!options) return 10
        if (options.where?.read_at === null) return 4
        if (options.where?.created_at?.$lt) return 3
        if (options.where?.created_at?.$gte) return 7
        return 0
      },
    }

    const projectModel = {
      findAll: async (options) => (options?.attributes?.includes('tags')
        ? [{ tags: ['react', 'api'] }, { tags: ['api'] }]
        : [{ month: '2026-03', count: '1' }]),
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
      findAll: async (options) => (options?.attributes?.includes('tags')
        ? [{ tags: ['react', { name: 'seo' }] }]
        : [{ month: '2026-02', count: '2' }]),
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
      findAll: async () => [{ month: '2026-03', count: '3' }],
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
      findAll: async () => [{ month: '2026-01', count: '4' }],
      count: async () => 9,
    }

    const newsletterCampaignModel = {
      count: async (options) => (options?.where?.status === 'sent' ? 2 : 1),
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

    const data = await service.getDashboardStats()

    assert.equal(data.summary.projectsPublished, 8)
    assert.equal(data.summary.articlesPublished, 12)
    assert.equal(data.summary.unreadMessages, 4)
    assert.equal(data.summary.messageReadRate, 60)
    assert.equal(data.summary.subscribersTotal, 30)
    assert.equal(data.summary.campaignsSent, 2)
    assert.equal(data.summary.articleLikes, 77)

    assert.equal(data.trends.messages30d.current, 7)
    assert.equal(data.trends.messages30d.previous, 3)
    assert.equal(data.trends.messages30d.direction, 'up')
    assert.equal(data.trends.subscribers30d.deltaPercent, 100)
    assert.equal(data.trends.content30d.current, 7)
    assert.equal(data.trends.content30d.previous, 3)

    assert.equal(data.chartData.length, 6)
    assert.equal(data.chartData[5].messages, 2)
    assert.equal(data.chartData[5].projets, 1)
    assert.equal(data.chartData[5].abonnes, 3)
    assert.equal(data.chartData[4].articles, 2)

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

    assert.equal(data.summary.messagesTotal, 0)
    assert.equal(data.summary.messageReadRate, 0)
    assert.equal(data.trends.messages30d.direction, 'flat')
    assert.equal(data.topTags.length, 0)
    assert.equal(data.recentMessages.length, 0)
    assert.equal(data.chartData.length, 6)
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

