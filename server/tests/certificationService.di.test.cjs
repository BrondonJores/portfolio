/* Test unitaire DI : verification du certificationService injectable avec dependances mockees. */
const assert = require('node:assert/strict')

const { createCertificationService } = require('../src/services/certificationService')

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
  await runCase('createCertification normalizes duplicated badges', async () => {
    let capturedPayload = null
    const fakeCertificationModel = {
      create: async (payload) => {
        capturedPayload = payload
        return { id: 1, ...payload }
      },
    }

    const service = createCertificationService({ certificationModel: fakeCertificationModel })
    const created = await service.createCertification({
      title: 'AWS SAA',
      issuer: 'Amazon',
      badges: ['cloud', 'cloud', 'associate', ''],
    })

    assert.equal(created.id, 1)
    assert.deepEqual(capturedPayload.badges, ['cloud', 'associate'])
  })

  await runCase('getAllPublicCertifications requests published certifications sorted by priority', async () => {
    let capturedOptions = null
    const fakeCertificationModel = {
      findAll: async (options) => {
        capturedOptions = options
        return []
      },
    }

    const service = createCertificationService({ certificationModel: fakeCertificationModel })
    const result = await service.getAllPublicCertifications()

    assert.deepEqual(result, [])
    assert.equal(capturedOptions.where.published, true)
    assert.deepEqual(capturedOptions.order, [
      ['sort_order', 'ASC'],
      ['issued_at', 'DESC'],
      ['created_at', 'DESC'],
    ])
  })

  await runCase('getAllAdminCertifications returns normalized pagination payload', async () => {
    const fakeCertificationModel = {
      findAndCountAll: async ({ limit, offset }) => ({
        count: 3,
        rows: [{ id: 1 }, { id: 2 }].slice(0, Math.max(0, 2 - offset)).slice(0, limit),
      }),
    }

    const service = createCertificationService({ certificationModel: fakeCertificationModel })
    const result = await service.getAllAdminCertifications({ limit: '2', offset: '0' })

    assert.equal(result.total, 3)
    assert.equal(result.limit, 2)
    assert.equal(result.offset, 0)
    assert.ok(Array.isArray(result.items))
  })

  await runCase('updateCertification throws 404 when certification does not exist', async () => {
    const fakeCertificationModel = {
      findByPk: async () => null,
    }

    const service = createCertificationService({ certificationModel: fakeCertificationModel })

    await assert.rejects(
      () => service.updateCertification(999, { title: 'x' }),
      (err) => {
        assert.equal(err.statusCode, 404)
        assert.equal(err.message, 'Certification introuvable.')
        return true
      }
    )
  })

  await runCase('deleteCertification destroys persisted entity', async () => {
    let destroyCalled = false
    const fakeCertificationModel = {
      findByPk: async () => ({
        async destroy() {
          destroyCalled = true
        },
      }),
    }

    const service = createCertificationService({ certificationModel: fakeCertificationModel })
    await service.deleteCertification(12)

    assert.equal(destroyCalled, true)
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
