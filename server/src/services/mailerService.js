/* Service d'envoi d'emails via nodemailer */
const nodemailer = require('nodemailer')
const dns = require('dns')
const { generateNewsletterHtml } = require('../templates/newsletterTemplate')

/*
  Debug SMTP
  - SMTP_DEBUG=true active des logs détaillés
  - SMTP_LOGGER=true active le logger nodemailer
  - SMTP_POOL=true active le pool SMTP (utile si beaucoup d'emails)
*/
const SMTP_DEBUG = String(process.env.SMTP_DEBUG || '').toLowerCase() === 'true'
const SMTP_LOGGER = String(process.env.SMTP_LOGGER || '').toLowerCase() === 'true'
const SMTP_POOL = String(process.env.SMTP_POOL || '').toLowerCase() === 'true'

function debug(...args) {
  if (SMTP_DEBUG) console.log('[smtp]', ...args)
}

function buildTransportOptions() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587

  // Règle: 465 => secure true, 587 => secure false + STARTTLS
  const secureEnv = process.env.SMTP_SECURE
  const secure = secureEnv != null ? secureEnv === 'true' : port === 465

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host) debug('SMTP_HOST manquant')
  if (!user) debug('SMTP_USER manquant')
  if (!pass) debug('SMTP_PASS manquant')

  return {
    host,
    port,
    secure,
    auth: { user, pass },

    // STARTTLS recommandé sur 587
    requireTLS: !secure,

    // Timeouts (évite les pending infinis)
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 20000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 20000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 30000),
    dnsTimeout: Number(process.env.SMTP_DNS_TIMEOUT || 10000),

    // Force IPv4 (souvent la cause en cloud des "Connection timeout")
    lookup: (hostname, options, cb) => {
      dns.lookup(hostname, { family: 4 }, cb)
    },

    // Pool optionnel
    pool: SMTP_POOL,
    maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
    maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),

    // Logger Nodemailer optionnel
    logger: SMTP_LOGGER,
    debug: SMTP_LOGGER,
  }
}

let cachedTransporter = null

function createTransport({ fresh = false } = {}) {
  if (!fresh && cachedTransporter) return cachedTransporter

  const options = buildTransportOptions()
  const transporter = nodemailer.createTransport(options)

  if (!fresh) cachedTransporter = transporter
  return transporter
}

function classifySmtpError(err) {
  const message = err?.message || String(err)
  const code = err?.code

  const isTimeout =
    code === 'ETIMEDOUT' ||
    /timeout/i.test(message) ||
    /Connection timeout/i.test(message)

  const isAuth =
    code === 'EAUTH' ||
    /Invalid login/i.test(message) ||
    /Authentication/i.test(message)

  const isConn =
    code === 'ECONNECTION' ||
    /connect/i.test(message) ||
    /Greeting never received/i.test(message)

  return {
    code,
    message,
    kind: isTimeout ? 'timeout' : isAuth ? 'auth' : isConn ? 'connection' : 'unknown',
  }
}

async function verifyTransport(transporter) {
  const t0 = Date.now()
  debug('verify:start', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    pool: SMTP_POOL,
  })
  await transporter.verify()
  debug('verify:ok', { ms: Date.now() - t0 })
}

/* Envoi mail simple */
async function sendMail({ from, to, subject, html }) {
  const transporter = createTransport()
  if (SMTP_DEBUG) await verifyTransport(transporter)

  const t0 = Date.now()
  try {
    const info = await transporter.sendMail({ from, to, subject, html })
    debug('sendMail:ok', { to, ms: Date.now() - t0, messageId: info?.messageId })
    return info
  } catch (err) {
    const meta = classifySmtpError(err)
    debug('sendMail:err', { to, ms: Date.now() - t0, ...meta })
    throw err
  }
}

/* Envoi newsletter */
async function sendNewsletter({
  campaign,
  subscribers,
  fromName,
  fromEmail,
  settings = {},
}) {
  // fresh: false => réutilise le transporter
  const transporter = createTransport()
  if (SMTP_DEBUG) await verifyTransport(transporter)

  const appUrl =
    settings.site_url ||
    process.env.APP_URL ||
    process.env.VITE_API_URL ||
    ''

  const errors = []
  const tGlobal = Date.now()

  debug('newsletter:start', {
    campaignId: campaign?.id,
    subscribers: subscribers?.length || 0,
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
  })

  for (let i = 0; i < subscribers.length; i++) {
    const subscriber = subscribers[i]
    const t0 = Date.now()

    const unsubscribeLink = `${appUrl}/api/unsubscribe/${subscriber.unsubscribe_token}`

    const templatePayload = {
      subject: campaign.subject,
      preheader: campaign.preheader,
      body_html: campaign.body_html,
      cta_label: campaign.cta_label,
      cta_url: campaign.cta_url,
      articles: campaign.articles,
      unsubscribe_url: unsubscribeLink,
    }

    const html = generateNewsletterHtml(settings, templatePayload)

    try {
      await transporter.sendMail({
        from: `"${fromName || 'Newsletter'}" <${fromEmail}>`,
        to: subscriber.email,
        subject: campaign.subject,
        html,
      })
      debug('newsletter:sent', { i: i + 1, to: subscriber.email, ms: Date.now() - t0 })
    } catch (err) {
      const meta = classifySmtpError(err)
      debug('newsletter:fail', { i: i + 1, to: subscriber.email, ms: Date.now() - t0, ...meta })
      errors.push(subscriber.email)
    }
  }

  debug('newsletter:done', {
    ms: Date.now() - tGlobal,
    success: subscribers.length - errors.length,
    failed: errors.length,
  })

  return {
    success: subscribers.length - errors.length,
    failed: errors.length,
    failedEmails: errors,
  }
}

module.exports = { sendMail, sendNewsletter }