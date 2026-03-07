/* Service d'envoi d'emails (Brevo en prod, SMTP optionnel en dev) */
const nodemailerLib = require('nodemailer')
const { generateNewsletterHtml } = require('../templates/newsletterTemplate')

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function requireEnv(env, name) {
  const value = env[name]
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

function createMailerService(deps = {}) {
  const env = deps.env || process.env
  const nodemailer = deps.nodemailer || nodemailerLib
  const fetchFn = deps.fetch || global.fetch
  const renderNewsletterHtml = deps.generateNewsletterHtml || generateNewsletterHtml

  function resolveDeliveryMode() {
    const explicitMode = String(env.MAIL_DELIVERY_MODE || '').trim().toLowerCase()
    if (explicitMode === 'dev') {
      return 'mock'
    }

    if (explicitMode === 'brevo' || explicitMode === 'smtp' || explicitMode === 'mock') {
      return explicitMode
    }

    const hasBrevo = Boolean(env.BREVO_API_KEY) && Boolean(env.BREVO_SENDER_EMAIL)
    if (hasBrevo) {
      return 'brevo'
    }

    if (env.DEV_SMTP_HOST || env.SMTP_HOST) {
      return 'smtp'
    }

    return 'brevo'
  }

  function resolveDefaultSender(mode) {
    if (mode === 'mock') {
      return {
        name: 'Mock Sender',
        email: 'mock@example.test',
      }
    }

    if (mode === 'smtp') {
      const parsed = parseFromValue(env.DEV_SMTP_FROM || env.SMTP_FROM)
      return {
        name: parsed.name || 'Portfolio Dev',
        email: parsed.email || env.DEV_SMTP_USER || env.SMTP_USER || 'noreply@localhost',
      }
    }

    return {
      name: 'Newsletter',
      email: requireEnv(env, 'BREVO_SENDER_EMAIL'),
    }
  }

  async function brevoSendEmail({ fromName, fromEmail, toEmail, subject, html }) {
    if (typeof fetchFn !== 'function') {
      throw new Error('fetch indisponible pour le provider Brevo')
    }

    const apiKey = requireEnv(env, 'BREVO_API_KEY')

    const payload = {
      sender: { name: fromName || 'Newsletter', email: fromEmail },
      to: [{ email: toEmail }],
      subject,
      htmlContent: html,
    }

    const response = await fetchFn('https://api.brevo.com/v3/smtp/email', {
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
    const host = env.DEV_SMTP_HOST || env.SMTP_HOST
    const port = Number(env.DEV_SMTP_PORT || env.SMTP_PORT || 1025)
    const secure = parseBooleanEnv(
      env.DEV_SMTP_SECURE !== undefined ? env.DEV_SMTP_SECURE : env.SMTP_SECURE,
      false
    )
    const user = env.DEV_SMTP_USER || env.SMTP_USER || ''
    const pass = env.DEV_SMTP_PASS || env.SMTP_PASS || ''

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
    if (mode === 'mock') {
      return {
        mocked: true,
        accepted: [toEmail],
        envelope: { from: fromEmail, to: [toEmail] },
        message: `Mock send: ${subject}`,
        fromName,
        htmlLength: typeof html === 'string' ? html.length : 0,
      }
    }

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
    const appUrl = settings.site_url || env.APP_URL || ''
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

      const html = renderNewsletterHtml(settings, templatePayload)

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

  return {
    sendMail,
    sendNewsletter,
    resolveDeliveryMode,
  }
}

module.exports = {
  createMailerService,
  ...createMailerService(),
}