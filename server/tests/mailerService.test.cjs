const assert = require('node:assert/strict')

const MAILER_MODULE_PATH = '../src/services/mailerService'

function loadMailerFresh() {
  const resolved = require.resolve(MAILER_MODULE_PATH)
  delete require.cache[resolved]
  return require(MAILER_MODULE_PATH)
}

function withEnv(patch, callback) {
  const keys = Object.keys(patch)
  const previous = {}

  for (const key of keys) {
    previous[key] = process.env[key]
    const value = patch[key]
    if (value === undefined || value === null) {
      delete process.env[key]
    } else {
      process.env[key] = String(value)
    }
  }

  try {
    callback()
  } finally {
    for (const key of keys) {
      const value = previous[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

let failures = 0

function runCase(name, callback) {
  try {
    callback()
    console.log(`PASS - ${name}`)
  } catch (err) {
    failures += 1
    console.error(`FAIL - ${name}`)
    console.error(err.stack || err.message || err)
  }
}

runCase('resolveDeliveryMode: dev alias maps to mock', () => {
  withEnv(
    {
      MAIL_DELIVERY_MODE: 'dev',
      BREVO_API_KEY: undefined,
      BREVO_SENDER_EMAIL: undefined,
      DEV_SMTP_HOST: undefined,
      SMTP_HOST: undefined,
    },
    () => {
      const { resolveDeliveryMode } = loadMailerFresh()
      assert.equal(resolveDeliveryMode(), 'mock')
    }
  )
})


runCase('resolveDeliveryMode: explicit mode has priority', () => {
  withEnv(
    {
      MAIL_DELIVERY_MODE: 'mock',
      BREVO_API_KEY: 'x',
      BREVO_SENDER_EMAIL: 'noreply@example.com',
      DEV_SMTP_HOST: 'localhost',
    },
    () => {
      const { resolveDeliveryMode } = loadMailerFresh()
      assert.equal(resolveDeliveryMode(), 'mock')
    }
  )
})

runCase('resolveDeliveryMode: brevo when key + sender are set', () => {
  withEnv(
    {
      MAIL_DELIVERY_MODE: '',
      BREVO_API_KEY: 'x',
      BREVO_SENDER_EMAIL: 'noreply@example.com',
      DEV_SMTP_HOST: undefined,
      SMTP_HOST: undefined,
    },
    () => {
      const { resolveDeliveryMode } = loadMailerFresh()
      assert.equal(resolveDeliveryMode(), 'brevo')
    }
  )
})

runCase('resolveDeliveryMode: smtp fallback when no brevo and smtp host exists', () => {
  withEnv(
    {
      MAIL_DELIVERY_MODE: '',
      BREVO_API_KEY: undefined,
      BREVO_SENDER_EMAIL: undefined,
      DEV_SMTP_HOST: 'localhost',
    },
    () => {
      const { resolveDeliveryMode } = loadMailerFresh()
      assert.equal(resolveDeliveryMode(), 'smtp')
    }
  )
})

runCase('resolveDeliveryMode: default brevo when nothing is configured', () => {
  withEnv(
    {
      MAIL_DELIVERY_MODE: '',
      BREVO_API_KEY: undefined,
      BREVO_SENDER_EMAIL: undefined,
      DEV_SMTP_HOST: undefined,
      SMTP_HOST: undefined,
    },
    () => {
      const { resolveDeliveryMode } = loadMailerFresh()
      assert.equal(resolveDeliveryMode(), 'brevo')
    }
  )
})

if (failures > 0) {
  console.error(`\nUnit tests failed: ${failures}`)
  process.exit(1)
}

console.log('\nUnit tests passed.')
