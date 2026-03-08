/* Tests DI du subscriberService (tokens de desinscription haches + rotation). */
const assert = require('node:assert/strict')
const { createSubscriberService } = require('../src/services/subscriberService')

let failures = 0

/**
 * Execute un test asynchrone avec journalisation uniforme.
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
 * Construit un stub crypto deterministe pour les tests.
 * @param {string} rawToken Token brut renvoye par randomBytes.
 * @param {string} hashValue Hash renvoye par digest().
 * @returns {object} API crypto compatible.
 */
function createCryptoStub(rawToken, hashValue) {
  return {
    randomBytes() {
      return Buffer.from(rawToken, 'hex')
    },
    createHash() {
      return {
        update() {
          return this
        },
        digest() {
          return hashValue
        },
      }
    },
  }
}

/**
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  await runCase('subscribeToNewsletter stores only hashed token in database', async () => {
    const rawToken = 'a'.repeat(64)
    const hashValue = 'b'.repeat(64)
    const createCalls = []

    const service = createSubscriberService({
      subscriberModel: {
        create: async (payload) => {
          createCalls.push(payload)
        },
      },
      crypto: createCryptoStub(rawToken, hashValue),
    })

    const result = await service.subscribeToNewsletter('alice@example.com')
    assert.equal(result.alreadySubscribed, false)
    assert.equal(createCalls.length, 1)
    assert.equal(createCalls[0].email, 'alice@example.com')
    assert.equal(createCalls[0].unsubscribe_token, hashValue)
    assert.notEqual(createCalls[0].unsubscribe_token, rawToken)
  })

  await runCase('unsubscribeFromNewsletter matches raw token and hashed token (backward compatibility)', async () => {
    const rawToken = 'c'.repeat(64)
    const hashValue = 'd'.repeat(64)
    const destroyCalls = []
    const opOr = '$or'

    const service = createSubscriberService({
      subscriberModel: {
        destroy: async (payload) => {
          destroyCalls.push(payload)
        },
      },
      crypto: createCryptoStub(rawToken, hashValue),
      sequelizeOps: { Op: { or: opOr } },
    })

    await service.unsubscribeFromNewsletter(rawToken)
    assert.equal(destroyCalls.length, 1)
    assert.deepEqual(
      destroyCalls[0].where[opOr],
      [
        { unsubscribe_token: rawToken },
        { unsubscribe_token: hashValue },
      ]
    )
  })

  await runCase('prepareSubscribersForNewsletter rotates token and returns raw token for mail payload', async () => {
    const rawToken = 'e'.repeat(64)
    const hashValue = 'f'.repeat(64)
    const updates = []
    const subscriber = {
      id: 12,
      email: 'bob@example.com',
      unsubscribe_token: 'legacy-token',
      async update(payload) {
        updates.push(payload)
      },
      toJSON() {
        return {
          id: this.id,
          email: this.email,
          unsubscribe_token: this.unsubscribe_token,
        }
      },
    }

    const service = createSubscriberService({
      crypto: createCryptoStub(rawToken, hashValue),
    })

    const prepared = await service.prepareSubscribersForNewsletter([subscriber])
    assert.equal(updates.length, 1)
    assert.equal(updates[0].unsubscribe_token, hashValue)
    assert.equal(prepared.length, 1)
    assert.equal(prepared[0].email, 'bob@example.com')
    assert.equal(prepared[0].unsubscribe_token, rawToken)
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

