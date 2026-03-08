/* Tests unitaires utilitaire transaction (fallback + mode transactionnel). */
const assert = require('node:assert/strict')
const { withOptionalTransaction } = require('../src/utils/transaction')

let failures = 0

/**
 * Execute un cas de test asynchrone et journalise PASS/FAIL.
 * @param {string} name Nom du test.
 * @param {Function} callback Fonction test.
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
 * Point d'entree test.
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  await runCase('withOptionalTransaction falls back to direct execution without sequelize', async () => {
    const result = await withOptionalTransaction({}, async (tx) => {
      assert.equal(tx, null)
      return 'ok'
    })
    assert.equal(result, 'ok')
  })

  await runCase('withOptionalTransaction uses provided transaction provider', async () => {
    let providerCalled = false
    const fakeTx = { id: 'tx-1' }

    const result = await withOptionalTransaction(
      {
        transactionProvider: async (callback) => {
          providerCalled = true
          return callback(fakeTx)
        },
      },
      async (tx) => {
        assert.equal(tx, fakeTx)
        return 'done'
      }
    )

    assert.equal(providerCalled, true)
    assert.equal(result, 'done')
  })

  if (failures > 0) {
    console.error(`\nUnit tests failed: ${failures}`)
    process.exit(1)
  }

  console.log('\nUnit tests passed.')
}

main().catch((err) => {
  console.error(err.stack || err.message || err)
  process.exit(1)
})

