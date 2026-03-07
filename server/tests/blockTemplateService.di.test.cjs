/* Tests DI du blockTemplateService (normalisation + comportements CRUD). */
const assert = require('node:assert/strict')
const { createBlockTemplateService } = require('../src/services/blockTemplateService')

let failures = 0

/**
 * Execute un cas de test asynchrone avec sortie uniforme.
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
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si tous les cas passent.
 */
async function main() {
  await runCase('getAllBlockTemplates filters context with injected IN operator', async () => {
    let capturedWhere = null

    const fakeModel = {
      findAll: async ({ where }) => {
        capturedWhere = where
        return []
      },
    }

    const service = createBlockTemplateService({
      blockTemplateModel: fakeModel,
      inOperator: '$in$',
    })

    await service.getAllBlockTemplates({ context: 'article' })
    assert.equal(capturedWhere.context['$in$'][0], 'article')
    assert.equal(capturedWhere.context['$in$'][1], 'all')
  })

  await runCase('createBlockTemplate sanitizes blocks and creates entity', async () => {
    let createPayload = null

    const fakeModel = {
      create: async (payload) => {
        createPayload = payload
        return { id: 1, ...payload }
      },
    }

    const service = createBlockTemplateService({ blockTemplateModel: fakeModel })

    const created = await service.createBlockTemplate({
      name: '  Template test  ',
      context: 'article',
      description: '  Description  ',
      blocks: [
        { type: 'heading', level: 9, content: 'Titre' },
        { type: 'unknown', content: 'ignore' },
      ],
    })

    assert.equal(created.name, 'Template test')
    assert.equal(createPayload.blocks.length, 1)
    assert.equal(createPayload.blocks[0].type, 'heading')
    assert.equal(createPayload.blocks[0].level, 2)
  })

  await runCase('createBlockTemplate syncs marketplace template when repository exists', async () => {
    const upsertCalls = []

    const fakeModel = {
      create: async (payload) => ({ id: 42, ...payload }),
    }

    const fakeMarketplaceItemModel = {
      upsert: async (payload) => {
        upsertCalls.push(payload)
      },
      update: async () => {},
    }

    const service = createBlockTemplateService({
      blockTemplateModel: fakeModel,
      marketplaceItemModel: fakeMarketplaceItemModel,
    })

    await service.createBlockTemplate({
      name: 'Template marketplace',
      context: 'project',
      description: 'Desc',
      blocks: [{ type: 'paragraph', content: 'Contenu' }],
    })

    assert.equal(upsertCalls.length, 1)
    assert.equal(upsertCalls[0].type, 'template')
    assert.equal(upsertCalls[0].slug, 'template-42')
    assert.equal(upsertCalls[0].source, 'admin')
    assert.equal(upsertCalls[0].payload.block_template_id, 42)
  })

  await runCase('updateBlockTemplate throws 404 when template is missing', async () => {
    const fakeModel = {
      findByPk: async () => null,
    }

    const service = createBlockTemplateService({ blockTemplateModel: fakeModel })

    await assert.rejects(
      () => service.updateBlockTemplate(404, { name: 'x' }),
      (err) => {
        assert.equal(err.statusCode, 404)
        assert.equal(err.message, 'Template introuvable.')
        return true
      }
    )
  })

  await runCase('deleteBlockTemplate destroys existing template', async () => {
    let destroyed = false
    const updateCalls = []

    const fakeModel = {
      findByPk: async () => ({
        id: 9,
        destroy: async () => {
          destroyed = true
        },
      }),
    }

    const fakeMarketplaceItemModel = {
      upsert: async () => {},
      update: async (payload, options) => {
        updateCalls.push({ payload, options })
      },
    }

    const service = createBlockTemplateService({
      blockTemplateModel: fakeModel,
      marketplaceItemModel: fakeMarketplaceItemModel,
    })
    await service.deleteBlockTemplate(1)

    assert.equal(destroyed, true)
    assert.equal(updateCalls.length, 1)
    assert.equal(updateCalls[0].payload.is_active, false)
    assert.equal(updateCalls[0].options.where.slug, 'template-9')
  })

  await runCase('importBlockTemplates creates new templates and updates duplicates', async () => {
    let createCount = 0
    let updateCount = 0

    const fakeExisting = {
      id: 10,
      name: 'Template A',
      context: 'article',
      update: async () => {
        updateCount += 1
      },
    }

    const fakeModel = {
      findOne: async ({ where }) => {
        if (where.name === 'Template A' && where.context === 'article') {
          return fakeExisting
        }
        return null
      },
      create: async (payload) => {
        createCount += 1
        return { id: 20 + createCount, ...payload }
      },
    }

    const service = createBlockTemplateService({ blockTemplateModel: fakeModel })

    const result = await service.importBlockTemplates({
      replaceExisting: true,
      templates: [
        {
          name: 'Template A',
          context: 'article',
          blocks: [{ type: 'paragraph', content: 'Maj' }],
        },
        {
          name: 'Template B',
          context: 'project',
          blocks: [{ type: 'heading', level: 2, content: 'Nouveau' }],
        },
      ],
    })

    assert.equal(result.updated, 1)
    assert.equal(result.created, 1)
    assert.equal(updateCount, 1)
    assert.equal(createCount, 1)
  })

  await runCase('importBlockTemplates throws 422 when no valid template is importable', async () => {
    const fakeModel = {
      findOne: async () => null,
      create: async () => ({ id: 1 }),
    }

    const service = createBlockTemplateService({ blockTemplateModel: fakeModel })

    await assert.rejects(
      () =>
        service.importBlockTemplates({
          templates: [{ name: 'Template vide', context: 'article', blocks: [] }],
        }),
      (err) => {
        assert.equal(err.statusCode, 422)
        assert.equal(err.message, 'Import termine sans ajout ni mise a jour.')
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
