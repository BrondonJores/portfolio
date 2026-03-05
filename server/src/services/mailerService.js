/* Service d'envoi d'emails via Brevo SMTP ou API (fallback) */
const nodemailer = require('nodemailer')
const dns = require('dns')
const { generateNewsletterHtml } = require('../templates/newsletterTemplate')

const SMTP_DEBUG = String(process.env.SMTP_DEBUG || '').toLowerCase() === 'true'

function debug(...args) {
  if (SMTP_DEBUG) console.log('[mailer]', ...args)
}

function createTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },

    requireTLS: !secure,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    dnsTimeout: 10000,

    lookup: (hostname, options, cb) => dns.lookup(hostname, { family: 4 }, cb),
  })
}

function isTimeoutError(err) {
  const msg = err?.message || ''
  return err?.code === 'ETIMEDOUT' || /timeout/i.test(msg)
}

/* Brevo API */
async function brevoSendEmail({ fromName, fromEmail, toEmail, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY manquant')

  const payload = {
    sender: { name: fromName || 'Newsletter', email: fromEmail },
    to: [{ email: toEmail }],
    subject,
    htmlContent: html,
  }

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Brevo API error: ${resp.status} ${text}`)
  }

  return resp.json().catch(() => ({}))
}

/* Envoi mail simple */
async function sendMail({ from, to, subject, html }) {
  const transporter = createTransport()

  if (SMTP_DEBUG) {
    debug('smtp:verify:start', { host: process.env.SMTP_HOST, port: process.env.SMTP_PORT })
    await transporter.verify()
    debug('smtp:verify:ok')
  }

  try {
    return await transporter.sendMail({ from, to, subject, html })
  } catch (err) {
    // Fallback API si timeout réseau sur Render
    if (isTimeoutError(err)) {
      debug('smtp:timeout -> fallback brevo api', { to })
      const m = /"([^"]+)"\s*<([^>]+)>/.exec(from || '')
      const fromName = m?.[1] || 'Newsletter'
      const fromEmail = m?.[2] || process.env.SMTP_USER
      return brevoSendEmail({ fromName, fromEmail, toEmail: to, subject, html })
    }
    throw err
  }
}

async function sendNewsletter({ campaign, subscribers, fromName, fromEmail, settings = {} }) {
  const appUrl =
    settings.site_url ||
    process.env.APP_URL ||
    process.env.VITE_API_URL ||
    ''

  const errors = []
  const t0 = Date.now()

  debug('newsletter:start', {
    campaignId: campaign?.id,
    subscribers: subscribers?.length || 0,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
  })

  // Option: tente SMTP verify une seule fois (et fallback API si timeout)
  let smtpOk = true
  const transporter = createTransport()
  try {
    if (SMTP_DEBUG) debug('smtp:verify:start')
    await transporter.verify()
    if (SMTP_DEBUG) debug('smtp:verify:ok')
  } catch (err) {
    smtpOk = false
    debug('smtp:verify:failed', { message: err.message, code: err.code })
  }

  for (let i = 0; i < subscribers.length; i++) {
    const subscriber = subscribers[i]
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
      if (smtpOk) {
        await transporter.sendMail({
          from: `"${fromName || 'Newsletter'}" <${fromEmail}>`,
          to: subscriber.email,
          subject: campaign.subject,
          html,
        })
      } else {
        await brevoSendEmail({
          fromName: fromName || 'Newsletter',
          fromEmail,
          toEmail: subscriber.email,
          subject: campaign.subject,
          html,
        })
      }

      debug('newsletter:sent', { i: i + 1, to: subscriber.email })
    } catch (err) {
      debug('newsletter:fail', { i: i + 1, to: subscriber.email, message: err.message, code: err.code })
      errors.push(subscriber.email)
    }
  }

  debug('newsletter:done', {
    ms: Date.now() - t0,
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