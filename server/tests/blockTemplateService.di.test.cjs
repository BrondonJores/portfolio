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

    const fakeModel = {
      findByPk: async () => ({
        destroy: async () => {
          destroyed = true
        },
      }),
    }

    const service = createBlockTemplateService({ blockTemplateModel: fakeModel })
    await service.deleteBlockTemplate(1)

    assert.equal(destroyed, true)
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
