/* Tests DI du visualBuilderDraftService (persistance + sanitization). */
const assert = require('node:assert/strict')
const { createVisualBuilderDraftService } = require('../src/services/visualBuilderDraftService')

let failures = 0

/**
 * Execute un cas de test asynchrone et affiche PASS/FAIL.
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
  await runCase('getCurrentVisualBuilderDraft returns null when draft does not exist', async () => {
    const service = createVisualBuilderDraftService({
      visualBuilderDraftModel: {
        findOne: async () => null,
      },
      hashFactory: (value) => `hash:${value}`,
    })

    const draft = await service.getCurrentVisualBuilderDraft({
      entity: 'article',
      channel: 'article:new',
    })

    assert.equal(draft, null)
  })

  await runCase('saveCurrentVisualBuilderDraft creates a new draft with sanitized blocks', async () => {
    let createdPayload = null

    const service = createVisualBuilderDraftService({
      visualBuilderDraftModel: {
        findOne: async () => null,
        create: async (payload) => {
          createdPayload = payload
          return {
            id: 1,
            ...payload,
            created_at: new Date('2026-03-08T10:00:00.000Z'),
            updated_at: new Date('2026-03-08T10:00:00.000Z'),
          }
        },
      },
      hashFactory: (value) => `hash:${value}`,
    })

    const result = await service.saveCurrentVisualBuilderDraft({
      entity: 'project',
      channel: 'project:42',
      title: '  Mon brouillon projet  ',
      adminId: 9,
      blocks: [
        { id: 'A-1', type: 'heading', level: 5, content: 'Titre' },
        { type: 'unknown', content: 'ignore' },
      ],
    })

    assert.equal(result.created, true)
    assert.equal(result.changed, true)
    assert.equal(createdPayload.title, 'Mon brouillon projet')
    assert.equal(createdPayload.blocks.length, 1)
    assert.equal(createdPayload.blocks[0].type, 'heading')
    assert.equal(createdPayload.blocks[0].level, 2)
    assert.equal(createdPayload.resource_id, '42')
    assert.equal(result.draft.versionNumber, 1)
  })

  await runCase('saveCurrentVisualBuilderDraft sanitizes section blocks and widgets', async () => {
    let createdPayload = null

    const service = createVisualBuilderDraftService({
      visualBuilderDraftModel: {
        findOne: async () => null,
        create: async (payload) => {
          createdPayload = payload
          return {
            id: 11,
            ...payload,
            created_at: new Date('2026-03-08T10:05:00.000Z'),
            updated_at: new Date('2026-03-08T10:05:00.000Z'),
          }
        },
      },
      hashFactory: (value) => `hash:${value}`,
    })

    await service.saveCurrentVisualBuilderDraft({
      entity: 'page',
      channel: 'page:home',
      title: 'Page home',
      blocks: [
        {
          id: 'sec-1',
          type: 'section',
          layout: '2-col',
          variant: 'soft',
          spacing: 'md',
          columns: [
            [
              { id: 'w-1', type: 'heading', level: 3, content: 'Hero' },
              { id: 'w-2', type: 'section', layout: '1-col', columns: [[]] },
            ],
            [{ id: 'w-3', type: 'paragraph', content: 'Description' }],
          ],
        },
      ],
    })

    assert.equal(createdPayload.blocks.length, 1)
    assert.equal(createdPayload.blocks[0].type, 'section')
    assert.equal(createdPayload.blocks[0].columns.length, 2)
    assert.equal(createdPayload.blocks[0].columns[0].length, 1)
    assert.equal(createdPayload.blocks[0].columns[0][0].type, 'heading')
  })

  await runCase('saveCurrentVisualBuilderDraft skips update when content hash is unchanged', async () => {
    const hashFactory = (value) => `hash:${value}`
    let updateCalled = false

    const existing = {
      id: 2,
      entity_type: 'article',
      channel: 'article:new',
      resource_id: null,
      title: 'Titre',
      blocks: [{ id: 'x-1', type: 'paragraph', content: 'Texte' }],
      version_number: 3,
      content_hash: hashFactory(
        JSON.stringify({
          title: 'Titre',
          blocks: [{ id: 'x-1', type: 'paragraph', content: 'Texte' }],
        })
      ),
      created_at: new Date('2026-03-08T09:00:00.000Z'),
      updated_at: new Date('2026-03-08T09:30:00.000Z'),
      async update() {
        updateCalled = true
      },
    }

    const service = createVisualBuilderDraftService({
      visualBuilderDraftModel: {
        findOne: async () => existing,
      },
      hashFactory,
    })

    const result = await service.saveCurrentVisualBuilderDraft({
      entity: 'article',
      channel: 'article:new',
      title: 'Titre',
      blocks: [{ id: 'x-1', type: 'paragraph', content: 'Texte' }],
    })

    assert.equal(result.created, false)
    assert.equal(result.changed, false)
    assert.equal(updateCalled, false)
  })

  await runCase('saveCurrentVisualBuilderDraft updates version when content changes', async () => {
    let updatePayload = null

    const existing = {
      id: 3,
      entity_type: 'newsletter',
      channel: 'newsletter:15',
      resource_id: '15',
      title: 'Sujet A',
      blocks: [{ type: 'paragraph', content: 'A', id: 'b-1' }],
      version_number: 4,
      content_hash: 'hash:old',
      created_at: new Date('2026-03-08T08:00:00.000Z'),
      updated_at: new Date('2026-03-08T08:10:00.000Z'),
      async update(payload) {
        updatePayload = payload
        Object.assign(this, payload)
        this.updated_at = new Date('2026-03-08T11:00:00.000Z')
      },
    }

    const service = createVisualBuilderDraftService({
      visualBuilderDraftModel: {
        findOne: async () => existing,
      },
      hashFactory: (value) => `hash:${value}`,
    })

    const result = await service.saveCurrentVisualBuilderDraft({
      entity: 'newsletter',
      channel: 'newsletter:15',
      title: 'Sujet B',
      adminId: 4,
      blocks: [{ type: 'paragraph', content: 'B', id: 'b-1' }],
    })

    assert.equal(result.created, false)
    assert.equal(result.changed, true)
    assert.equal(updatePayload.version_number, 5)
    assert.equal(updatePayload.updated_by_admin_id, 4)
    assert.equal(result.draft.versionNumber, 5)
  })

  await runCase('deleteCurrentVisualBuilderDraft returns deleted true when draft exists', async () => {
    let destroyed = false

    const service = createVisualBuilderDraftService({
      visualBuilderDraftModel: {
        findOne: async () => ({
          async destroy() {
            destroyed = true
          },
        }),
      },
      hashFactory: (value) => `hash:${value}`,
    })

    const result = await service.deleteCurrentVisualBuilderDraft({
      entity: 'project',
      channel: 'project:9',
    })

    assert.equal(destroyed, true)
    assert.equal(result.deleted, true)
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
