/* Test unitaire DI : verification du projectService injectable avec dependances mockees. */
const assert = require('node:assert/strict')

const { createProjectService } = require('../src/services/projectService')

let failures = 0

/**
 * Execute un test asynchrone avec journalisation uniforme.
 * @param {string} name Nom du test.
 * @param {Function} callback Scenario asynchrone.
 * @returns {Promise<void>} Promise resolue apres execution du cas.
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
 * Point d'entree du fichier de tests DI.
 * Enchaine les scenarios, puis sort avec code de statut adapte.
 * @returns {Promise<void>} Promise resolue si tous les tests passent.
 */
async function main() {
  await runCase('createProject uses injected slugify and repository', async () => {
    const createCalls = []

    const fakeProjectModel = {
      create: async (payload) => {
        createCalls.push(payload)
        return { id: 1, ...payload }
      },
    }

    const service = createProjectService({
      projectModel: fakeProjectModel,
      slugify: () => 'slug-injecte',
    })

    const created = await service.createProject({
      title: 'Titre Test',
      description: 'desc',
      content: 'content',
      tags: ['js'],
      featured: true,
    })

    assert.equal(created.slug, 'slug-injecte')
    assert.equal(createCalls.length, 1)
    assert.equal(createCalls[0].slug, 'slug-injecte')
    assert.equal(createCalls[0].published, true)
  })

  await runCase('updateProject throws 404 when project does not exist', async () => {
    const fakeProjectModel = {
      findByPk: async () => null,
    }

    const service = createProjectService({ projectModel: fakeProjectModel })

    await assert.rejects(
      () => service.updateProject(999, { title: 'x' }),
      (err) => {
        assert.equal(err.statusCode, 404)
        assert.equal(err.message, 'Projet introuvable.')
        return true
      }
    )
  })

  await runCase('getAllPublicProjects applies tag filter with injected operator', async () => {
    const fakeLike = '$like$'
    let capturedWhere = null

    const fakeProjectModel = {
      findAndCountAll: async ({ where }) => {
        capturedWhere = where
        return { count: 0, rows: [] }
      },
    }

    const service = createProjectService({
      projectModel: fakeProjectModel,
      likeOperator: fakeLike,
    })

    const result = await service.getAllPublicProjects({
      page: '1',
      limit: '10',
      tag: 'react',
      featured: 'true',
    })

    assert.equal(result.pagination.total, 0)
    assert.equal(capturedWhere.published, true)
    assert.equal(capturedWhere.featured, true)
    assert.equal(capturedWhere.tags[fakeLike], '%"react"%')
  })

  await runCase('importProjects creates valid rows and skips invalid ones', async () => {
    const storage = []

    const fakeProjectModel = {
      findOne: async ({ where }) => {
        if (where?.slug) {
          return storage.find((item) => item.slug === where.slug) || null
        }
        if (where?.title) {
          return storage.find((item) => item.title === where.title) || null
        }
        return null
      },
      create: async (payload) => {
        const row = {
          id: storage.length + 1,
          ...payload,
          async update(patch) {
            Object.assign(this, patch)
            return this
          },
        }
        storage.push(row)
        return row
      },
    }

    const service = createProjectService({
      projectModel: fakeProjectModel,
      slugify: (value) =>
        String(value || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
    })

    const result = await service.importProjects({
      projects: [
        { title: 'Projet Alpha', tags: ['react', 'react'] },
        { title: '' },
      ],
    })

    assert.equal(result.created, 1)
    assert.equal(result.updated, 0)
    assert.equal(result.skippedCount, 1)
    assert.equal(storage[0].slug, 'projet-alpha')
    assert.deepEqual(storage[0].tags, ['react'])
  })

  await runCase('importProjects updates duplicates when replaceExisting=true', async () => {
    const storage = [
      {
        id: 7,
        title: 'Projet Beta',
        slug: 'projet-beta',
        description: 'Ancienne description',
        async update(patch) {
          Object.assign(this, patch)
          return this
        },
      },
    ]

    const fakeProjectModel = {
      findOne: async ({ where }) => {
        if (where?.slug) {
          return storage.find((item) => item.slug === where.slug) || null
        }
        if (where?.title) {
          return storage.find((item) => item.title === where.title) || null
        }
        return null
      },
      create: async (payload) => ({ id: 99, ...payload }),
    }

    const service = createProjectService({
      projectModel: fakeProjectModel,
      slugify: (value) =>
        String(value || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
    })

    const result = await service.importProjects({
      projects: [{ title: 'Projet Beta', description: 'Description importee' }],
      replaceExisting: true,
    })

    assert.equal(result.created, 0)
    assert.equal(result.updated, 1)
    assert.equal(storage[0].description, 'Description importee')
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
