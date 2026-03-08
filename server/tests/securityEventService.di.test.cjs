/* Tests DI du securityEventService (audit intrusion). */
const assert = require('node:assert/strict')
const { createSecurityEventService } = require('../src/services/securityEventService')

let failures = 0

/**
 * Execute un cas de test et affiche PASS/FAIL.
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
 * Point d'entree des tests DI.
 * @returns {Promise<void>} Promise resolue si succes.
 */
async function main() {
  await runCase('logSecurityEvent stores normalized payload', async () => {
    const created = []
    const service = createSecurityEventService({
      securityEventModel: {
        create: async (payload) => {
          created.push(payload)
          return { id: 1, ...payload }
        },
      },
      sequelizeFns: { Op: {}, fn: () => {}, col: () => {}, literal: () => {} },
    })

    const result = await service.logSecurityEvent({
      eventType: 'auth.login_failed',
      severity: 'warning',
      source: 'auth_controller',
      message: 'Identifiants invalides.',
      ipAddress: '127.0.0.1',
      metadata: { attempt: 1 },
    })

    assert.equal(created.length, 1)
    assert.equal(result.event_type, 'auth.login_failed')
    assert.equal(result.severity, 'warning')
    assert.equal(result.ip_address, '127.0.0.1')
  })

  await runCase('logSecurityEvent returns null when persistence fails', async () => {
    const service = createSecurityEventService({
      securityEventModel: {
        create: async () => {
          throw new Error('db down')
        },
      },
      sequelizeFns: { Op: {}, fn: () => {}, col: () => {}, literal: () => {} },
    })

    const result = await service.logSecurityEvent({
      eventType: 'request.rate_limited',
      message: 'Rate limit.',
    })
    assert.equal(result, null)
  })

  await runCase('getSecurityEvents returns paginated payload and applies window filter', async () => {
    let capturedWhere = null
    const service = createSecurityEventService({
      securityEventModel: {
        findAndCountAll: async ({ limit, offset, where }) => {
          capturedWhere = where
          return {
            rows: [{ id: 1, event_type: where.event_type || 'auth.login_failed' }],
            count: 42,
            limit,
            offset,
          }
        },
      },
      sequelizeFns: { Op: { gte: 'gte' }, fn: () => {}, col: () => {}, literal: () => {} },
      now: () => new Date('2026-03-08T12:00:00.000Z'),
    })

    const page = await service.getSecurityEvents({
      limit: 10,
      offset: 5,
      eventType: 'auth.login_failed',
      severity: 'warning',
      windowHours: 6,
    })

    assert.equal(page.total, 42)
    assert.equal(page.limit, 10)
    assert.equal(page.offset, 5)
    assert.equal(page.items.length, 1)
    assert.equal(capturedWhere.event_type, 'auth.login_failed')
    assert.equal(capturedWhere.severity, 'warning')
    assert.equal(capturedWhere.created_at.gte.toISOString(), '2026-03-08T06:00:00.000Z')
  })

  await runCase('getSecuritySummary aggregates values', async () => {
    const Op = { gte: 'gte', in: 'in', ne: 'ne' }
    const service = createSecurityEventService({
      securityEventModel: {
        count: async (options = {}) => {
          if (options.distinct && options.col === 'ip_address') {
            return 12
          }

          const where = options.where || {}
          if (where.severity === 'critical') return 2
          if (where.severity === 'warning') return 3

          const eventType = where.event_type
          if (!eventType) return 1
          if (eventType === 'request.untrusted_origin') return 5

          const inValues = Array.isArray(eventType?.[Op.in]) ? eventType[Op.in] : []
          if (inValues.length > 0) {
            if (
              inValues.length === 3 &&
              inValues.includes('auth.login_failed') &&
              inValues.includes('auth.2fa_failed') &&
              inValues.includes('auth.invalid_token')
            ) {
              return 4
            }

            if (
              inValues.length === 4 &&
              inValues.includes('request.rate_limited') &&
              inValues.includes('request.rate_limited.public') &&
              inValues.includes('request.rate_limited.admin') &&
              inValues.includes('request.rate_limited.auth')
            ) {
              return 6
            }

            if (inValues.length === 1 && inValues[0] === 'request.rate_limited.public') return 7
            if (inValues.length === 1 && inValues[0] === 'request.rate_limited.admin') return 8
            if (inValues.length === 1 && inValues[0] === 'request.rate_limited.auth') return 9
            if (inValues.length === 1 && inValues[0] === 'request.rate_limited') return 10
          }

          return 0
        },
        findAll: async (options) => {
          if (options.raw && Array.isArray(options.group) && options.group[0] === 'ip_address') {
            return [{ ip_address: '1.1.1.1', count: '4' }]
          }
          if (options.raw && Array.isArray(options.group) && options.group[0] === 'event_type') {
            return [{ event_type: 'auth.login_failed', count: '9' }]
          }
          return [{ id: 99, event_type: 'request.rate_limited' }]
        },
      },
      sequelizeFns: {
        Op,
        fn: (_name, _arg) => 'fn',
        col: (value) => value,
        literal: (value) => value,
      },
      now: () => new Date('2026-03-07T10:00:00.000Z'),
    })

    const summary = await service.getSecuritySummary({ windowHours: 24 })

    assert.equal(summary.windowHours, 24)
    assert.equal(summary.totalEvents, 1)
    assert.equal(summary.criticalEvents, 2)
    assert.equal(summary.warningEvents, 3)
    assert.equal(summary.authFailures, 4)
    assert.equal(summary.blockedOrigins, 5)
    assert.equal(summary.rateLimitHits, 6)
    assert.equal(summary.rateLimitPublicHits, 7)
    assert.equal(summary.rateLimitAdminHits, 8)
    assert.equal(summary.rateLimitAuthHits, 9)
    assert.equal(summary.rateLimitLegacyHits, 10)
    assert.equal(summary.uniqueIpCount, 12)
    assert.equal(summary.topIps[0].ip, '1.1.1.1')
    assert.equal(summary.topIps[0].count, 4)
    assert.equal(summary.topEventTypes[0].eventType, 'auth.login_failed')
    assert.equal(summary.topEventTypes[0].count, 9)
    assert.equal(summary.recentEvents.length, 1)
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
