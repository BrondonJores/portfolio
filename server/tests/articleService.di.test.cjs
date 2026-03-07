/* Tests DI du service article : likes (increment/decrement et bornes). */
const assert = require('node:assert/strict')
const { createArticleService } = require('../src/services/articleService')

let failures = 0

/**
 * Execute un scenario asynchrone avec format uniforme.
 * @param {string} name Nom du test.
 * @param {Function} callback Fonction scenario.
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
 * Cree un faux article mutable pour simuler Sequelize.
 * @param {object} seed Donnees initiales.
 * @returns {object} Entite article factice.
 */
function buildFakeArticle(seed) {
  return {
    ...seed,
    async increment(field, options) {
      if (field === 'likes') {
        this.likes = (Number(this.likes) || 0) + Number(options?.by || 0)
      }
    },
    async decrement(field, options) {
      if (field === 'likes') {
        this.likes = (Number(this.likes) || 0) - Number(options?.by || 0)
      }
    },
    async reload() {
      return this
    },
    async update(patch) {
      Object.assign(this, patch)
      return this
    },
  }
}

/**
 * Point d'entree des tests DI article.
 * @returns {Promise<void>} Promise resolue si tous les tests passent.
 */
async function main() {
  await runCase('likeArticleBySlug increments likes and enforces published scope', async () => {
    let capturedWhere = null

    const fakeArticle = buildFakeArticle({ slug: 'post-test', likes: 2 })
    const fakeArticleModel = {
      findOne: async ({ where }) => {
        capturedWhere = where
        return fakeArticle
      },
    }

    const service = createArticleService({ articleModel: fakeArticleModel })
    const result = await service.likeArticleBySlug('post-test')

    assert.deepEqual(capturedWhere, { slug: 'post-test', published: true })
    assert.equal(result.slug, 'post-test')
    assert.equal(result.likes, 3)
  })

  await runCase('unlikeArticleBySlug decrements likes when positive', async () => {
    const fakeArticle = buildFakeArticle({ slug: 'post-like', likes: 7 })
    const fakeArticleModel = {
      findOne: async () => fakeArticle,
    }

    const service = createArticleService({ articleModel: fakeArticleModel })
    const result = await service.unlikeArticleBySlug('post-like')

    assert.equal(result.likes, 6)
  })

  await runCase('unlikeArticleBySlug keeps zero when likes already at zero', async () => {
    let decrementCalls = 0

    const fakeArticle = buildFakeArticle({ slug: 'post-zero', likes: 0 })
    fakeArticle.decrement = async () => {
      decrementCalls += 1
    }

    const fakeArticleModel = {
      findOne: async () => fakeArticle,
    }

    const service = createArticleService({ articleModel: fakeArticleModel })
    const result = await service.unlikeArticleBySlug('post-zero')

    assert.equal(decrementCalls, 0)
    assert.equal(result.likes, 0)
  })

  await runCase('unlikeArticleBySlug clamps to zero when repository returns negative', async () => {
    let updateCalls = 0

    const fakeArticle = buildFakeArticle({ slug: 'post-clamp', likes: 1 })
    fakeArticle.decrement = async () => {
      fakeArticle.likes = -2
    }
    fakeArticle.update = async (patch) => {
      updateCalls += 1
      Object.assign(fakeArticle, patch)
      return fakeArticle
    }

    const fakeArticleModel = {
      findOne: async () => fakeArticle,
    }

    const service = createArticleService({ articleModel: fakeArticleModel })
    const result = await service.unlikeArticleBySlug('post-clamp')

    assert.equal(updateCalls, 1)
    assert.equal(result.likes, 0)
  })

  await runCase('likeArticleBySlug throws 404 when article is missing', async () => {
    const fakeArticleModel = {
      findOne: async () => null,
    }

    const service = createArticleService({ articleModel: fakeArticleModel })

    await assert.rejects(
      () => service.likeArticleBySlug('inexistant'),
      (err) => {
        assert.equal(err.statusCode, 404)
        assert.equal(err.message, 'Article introuvable.')
        return true
      }
    )
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
