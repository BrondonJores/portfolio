/* Tests DI du cmsPageService (draft/publish/revisions). */
const assert = require('node:assert/strict')
const { createCmsPageService } = require('../src/services/cmsPageService')

let failures = 0

/**
 * Execute un cas de test asynchrone et affiche PASS/FAIL.
 * @param {string} name Nom du test.
 * @param {Function} callback Scenario.
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
 * Cree un faux modele page Sequelize pour les tests.
 * @returns {{model: object, store: Array<object>}} Modele fake + store.
 */
function createFakePageModel() {
  const store = []
  let sequence = 0

  /**
   * Normalise une ligne de page pour emuler un modele Sequelize.
   * @param {object} row Donnees source.
   * @returns {object} Instance fake.
   */
  function asPageRow(row) {
    return {
      ...row,
      async update(patch) {
        Object.assign(this, patch)
        this.updated_at = new Date('2026-03-08T12:00:00.000Z')
        return this
      },
      async destroy() {
        const index = store.findIndex((entry) => entry.id === this.id)
        if (index >= 0) store.splice(index, 1)
      },
    }
  }

  const model = {
    async findByPk(id) {
      const found = store.find((entry) => entry.id === Number(id))
      return found || null
    },
    async findOne({ where }) {
      if (where.slug && where.status) {
        return store.find((entry) => entry.slug === where.slug && entry.status === where.status) || null
      }
      if (where.slug) {
        const forbiddenId = where.id && where.id.__not_equal__ ? Number(where.id.__not_equal__) : null
        return (
          store.find(
            (entry) => entry.slug === where.slug && (forbiddenId ? entry.id !== forbiddenId : true)
          ) || null
        )
      }
      return null
    },
    async create(payload) {
      sequence += 1
      const row = asPageRow({
        id: sequence,
        created_at: new Date('2026-03-08T10:00:00.000Z'),
        updated_at: new Date('2026-03-08T10:00:00.000Z'),
        ...payload,
      })
      store.push(row)
      return row
    },
    async findAndCountAll() {
      return {
        rows: store,
        count: store.length,
      }
    },
  }

  return { model, store, asPageRow }
}

/**
 * Cree un faux modele revision Sequelize.
 * @returns {{model: object, store: Array<object>}} Modele fake + store.
 */
function createFakeRevisionModel() {
  const store = []
  let sequence = 0

  const model = {
    async create(payload) {
      sequence += 1
      const row = {
        id: sequence,
        created_at: new Date('2026-03-08T10:30:00.000Z'),
        ...payload,
      }
      store.push(row)
      return row
    },
    async findOne({ where, order }) {
      if (where.page_id && order && order[0] && order[0][0] === 'version_number') {
        const pageRevisions = store
          .filter((entry) => entry.page_id === Number(where.page_id))
          .sort((a, b) => b.version_number - a.version_number)
        return pageRevisions[0] || null
      }

      if (where.id && where.page_id) {
        return (
          store.find(
            (entry) => entry.id === Number(where.id) && entry.page_id === Number(where.page_id)
          ) || null
        )
      }

      return null
    },
    async findAll({ where }) {
      return store
        .filter((entry) => entry.page_id === Number(where.page_id))
        .sort((a, b) => b.version_number - a.version_number)
    },
  }

  return { model, store }
}

/**
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  await runCase('createCmsPage creates draft page and first revision', async () => {
    const fakePages = createFakePageModel()
    const fakeRevisions = createFakeRevisionModel()

    const service = createCmsPageService({
      cmsPageModel: fakePages.model,
      cmsPageRevisionModel: fakeRevisions.model,
      notEqualOperator: '__not_equal__',
    })

    const page = await service.createCmsPage(
      {
        title: 'Page About',
        blocks: [{ id: 'a-1', type: 'paragraph', content: 'Hello' }],
      },
      7
    )

    assert.equal(page.slug, 'page-about')
    assert.equal(page.status, 'draft')
    assert.equal(page.draft.layout.length, 1)
    assert.equal(fakeRevisions.store.length, 1)
    assert.equal(fakeRevisions.store[0].stage, 'draft')
  })

  await runCase('createCmsPage sanitizes section blocks and nested widgets', async () => {
    const fakePages = createFakePageModel()
    const fakeRevisions = createFakeRevisionModel()

    const service = createCmsPageService({
      cmsPageModel: fakePages.model,
      cmsPageRevisionModel: fakeRevisions.model,
      notEqualOperator: '__not_equal__',
    })

    const page = await service.createCmsPage(
      {
        title: 'Page section',
        blocks: [
          {
            id: 'sec-1',
            type: 'section',
            layout: '3-col',
            variant: 'accent',
            spacing: 'lg',
            columns: [
              [
                { id: 'w-1', type: 'heading', level: 2, content: 'Titre' },
                { id: 'w-2', type: 'section', layout: '1-col', columns: [[]] },
              ],
              [{ id: 'w-3', type: 'paragraph', content: 'Texte' }],
              [{ id: 'w-4', type: 'quote', content: 'Citation', author: 'A' }],
            ],
          },
        ],
      },
      3
    )

    assert.equal(page.draft.layout.length, 1)
    assert.equal(page.draft.layout[0].type, 'section')
    assert.equal(page.draft.layout[0].layout, '3-col')
    assert.equal(page.draft.layout[0].columns.length, 3)
    assert.equal(page.draft.layout[0].columns[0].length, 1)
    assert.equal(page.draft.layout[0].columns[0][0].type, 'heading')
  })

  await runCase('publishCmsPage copies draft data to published payload', async () => {
    const fakePages = createFakePageModel()
    const fakeRevisions = createFakeRevisionModel()

    const created = await fakePages.model.create({
      slug: 'home',
      status: 'draft',
      draft_title: 'Accueil',
      draft_layout: [{ id: 'b-1', type: 'paragraph', content: 'Bienvenue' }],
      draft_seo: { title: 'Home SEO' },
      published_title: null,
      published_layout: null,
      published_seo: null,
    })

    const service = createCmsPageService({
      cmsPageModel: fakePages.model,
      cmsPageRevisionModel: fakeRevisions.model,
      now: () => new Date('2026-03-08T11:00:00.000Z'),
      notEqualOperator: '__not_equal__',
    })

    const page = await service.publishCmsPage(created.id, {}, 5)

    assert.equal(page.status, 'published')
    assert.equal(page.published.title, 'Accueil')
    assert.equal(page.published.layout.length, 1)
    assert.equal(fakeRevisions.store.length, 1)
    assert.equal(fakeRevisions.store[0].stage, 'published')
  })

  await runCase('updateCmsPage updates only draft while keeping published snapshot', async () => {
    const fakePages = createFakePageModel()
    const fakeRevisions = createFakeRevisionModel()

    const created = await fakePages.model.create({
      slug: 'services',
      status: 'published',
      draft_title: 'Services (draft)',
      draft_layout: [{ id: 'c-1', type: 'paragraph', content: 'Draft old' }],
      draft_seo: {},
      published_title: 'Services live',
      published_layout: [{ id: 'p-1', type: 'paragraph', content: 'Live' }],
      published_seo: {},
    })

    const service = createCmsPageService({
      cmsPageModel: fakePages.model,
      cmsPageRevisionModel: fakeRevisions.model,
      notEqualOperator: '__not_equal__',
    })

    const page = await service.updateCmsPage(
      created.id,
      {
        title: 'Services (draft v2)',
        blocks: [{ id: 'c-2', type: 'paragraph', content: 'Draft new' }],
      },
      5
    )

    assert.equal(page.status, 'published')
    assert.equal(page.draft.title, 'Services (draft v2)')
    assert.equal(page.published.title, 'Services live')
    assert.equal(page.published.layout[0].content, 'Live')
  })

  await runCase('getPublicCmsPageBySlug returns only published pages', async () => {
    const fakePages = createFakePageModel()
    const fakeRevisions = createFakeRevisionModel()

    await fakePages.model.create({
      slug: 'about',
      status: 'published',
      draft_title: 'About draft',
      draft_layout: [],
      draft_seo: {},
      published_title: 'About',
      published_layout: [{ id: 'd-1', type: 'paragraph', content: 'About content' }],
      published_seo: { title: 'About SEO' },
    })

    const service = createCmsPageService({
      cmsPageModel: fakePages.model,
      cmsPageRevisionModel: fakeRevisions.model,
      notEqualOperator: '__not_equal__',
    })

    const page = await service.getPublicCmsPageBySlug('about')
    assert.equal(page.title, 'About')

    await assert.rejects(
      () => service.getPublicCmsPageBySlug('not-found'),
      (err) => {
        assert.equal(err.statusCode, 404)
        return true
      }
    )
  })

  await runCase('rollbackCmsPage restores snapshot from targeted revision', async () => {
    const fakePages = createFakePageModel()
    const fakeRevisions = createFakeRevisionModel()

    const page = await fakePages.model.create({
      slug: 'contact',
      status: 'published',
      draft_title: 'Contact draft',
      draft_layout: [{ id: 'x-1', type: 'paragraph', content: 'Draft current' }],
      draft_seo: {},
      published_title: 'Contact live',
      published_layout: [{ id: 'x-2', type: 'paragraph', content: 'Live current' }],
      published_seo: {},
    })

    await fakeRevisions.model.create({
      page_id: page.id,
      version_number: 1,
      stage: 'draft',
      snapshot: {
        slug: 'contact',
        status: 'draft',
        draft: {
          title: 'Contact ancienne version',
          layout: [{ id: 'r-1', type: 'paragraph', content: 'Rollback content' }],
          seo: {},
        },
        published: null,
      },
    })

    const service = createCmsPageService({
      cmsPageModel: fakePages.model,
      cmsPageRevisionModel: fakeRevisions.model,
      notEqualOperator: '__not_equal__',
    })

    const result = await service.rollbackCmsPage(page.id, 1, 2)
    assert.equal(result.page.status, 'draft')
    assert.equal(result.page.draft.title, 'Contact ancienne version')
    assert.equal(result.page.published, null)
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
