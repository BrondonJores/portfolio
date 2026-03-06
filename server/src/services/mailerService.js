/* Service d'envoi d'emails (Brevo en prod, SMTP optionnel en dev) */
const nodemailer = require('nodemailer')
const { generateNewsletterHtml } = require('../templates/newsletterTemplate')

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} manquant`)
  }
  return value
}

function parseFromValue(fromValue) {
  const raw = String(fromValue || '').trim()
  if (!raw) {
    return { name: '', email: '' }
  }

  const match = /"?(.*?)"?\s*<([^>]+)>/.exec(raw)
  if (match) {
    return {
      name: (match[1] || '').trim(),
      email: (match[2] || '').trim(),
    }
  }

  if (raw.includes('@')) {
    return { name: '', email: raw }
  }

  return { name: raw, email: '' }
}

function resolveDeliveryMode() {
  const explicitMode = String(process.env.MAIL_DELIVERY_MODE || '').trim().toLowerCase()
  if (explicitMode === 'brevo' || explicitMode === 'smtp') {
    return explicitMode
  }

  const hasBrevo = Boolean(process.env.BREVO_API_KEY) && Boolean(process.env.BREVO_SENDER_EMAIL)
  if (hasBrevo) {
    return 'brevo'
  }

  if (process.env.DEV_SMTP_HOST || process.env.SMTP_HOST) {
    return 'smtp'
  }

  return 'brevo'
}

function resolveDefaultSender(mode) {
  if (mode === 'smtp') {
    const parsed = parseFromValue(process.env.DEV_SMTP_FROM || process.env.SMTP_FROM)
    return {
      name: parsed.name || 'Portfolio Dev',
      email: parsed.email || process.env.DEV_SMTP_USER || process.env.SMTP_USER || 'noreply@localhost',
    }
  }

  return {
    name: 'Newsletter',
    email: requireEnv('BREVO_SENDER_EMAIL'),
  }
}

async function brevoSendEmail({ fromName, fromEmail, toEmail, subject, html }) {
  const apiKey = requireEnv('BREVO_API_KEY')

  const payload = {
    sender: { name: fromName || 'Newsletter', email: fromEmail },
    to: [{ email: toEmail }],
    subject,
    htmlContent: html,
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Brevo API error: ${response.status} ${text}`)
  }

  return response.json().catch(() => ({}))
}

async function smtpSendEmail({ fromName, fromEmail, toEmail, subject, html }) {
  const host = process.env.DEV_SMTP_HOST || process.env.SMTP_HOST
  const port = Number(process.env.DEV_SMTP_PORT || process.env.SMTP_PORT || 1025)
  const secure = parseBooleanEnv(
    process.env.DEV_SMTP_SECURE !== undefined ? process.env.DEV_SMTP_SECURE : process.env.SMTP_SECURE,
    false
  )
  const user = process.env.DEV_SMTP_USER || process.env.SMTP_USER || ''
  const pass = process.env.DEV_SMTP_PASS || process.env.SMTP_PASS || ''

  if (!host) {
    throw new Error('DEV_SMTP_HOST/SMTP_HOST manquant')
  }

  if (!Number.isFinite(port)) {
    throw new Error('DEV_SMTP_PORT/SMTP_PORT invalide')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user ? { auth: { user, pass } } : {}),
  })

  const from = `"${fromName || 'Portfolio Dev'}" <${fromEmail}>`
  return transporter.sendMail({
    from,
    to: toEmail,
    subject,
    html,
  })
}

async function sendWithProvider({ mode, fromName, fromEmail, toEmail, subject, html }) {
  if (mode === 'smtp') {
    return smtpSendEmail({ fromName, fromEmail, toEmail, subject, html })
  }
  return brevoSendEmail({ fromName, fromEmail, toEmail, subject, html })
}

async function sendMail({ from, to, subject, html }) {
  const mode = resolveDeliveryMode()
  const fromParsed = parseFromValue(from)
  const defaultSender = resolveDefaultSender(mode)

  return sendWithProvider({
    mode,
    fromName: fromParsed.name || defaultSender.name,
    fromEmail: fromParsed.email || defaultSender.email,
    toEmail: to,
    subject,
    html,
  })
}

async function sendNewsletter({ campaign, subscribers, fromName, fromEmail, settings = {} }) {
  const mode = resolveDeliveryMode()
  const appUrl = settings.site_url || process.env.APP_URL || ''
  const defaultSender = resolveDefaultSender(mode)

  const senderName = fromName || settings.newsletter_from_name || defaultSender.name
  const senderEmail = fromEmail || settings.newsletter_from_email || defaultSender.email

  if (!senderEmail) {
    throw new Error('Email expediteur manquant')
  }

  const errors = []

  for (const subscriber of subscribers) {
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
      await sendWithProvider({
        mode,
        fromName: senderName,
        fromEmail: senderEmail,
        toEmail: subscriber.email,
        subject: campaign.subject,
        html,
      })
    } catch {
      errors.push(subscriber.email)
    }
  }

  return {
    success: subscribers.length - errors.length,
    failed: errors.length,
    failedEmails: errors,
    mode,
  }
}

module.exports = { sendMail, sendNewsletter, resolveDeliveryMode }
