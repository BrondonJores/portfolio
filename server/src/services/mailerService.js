/* Service d'envoi d'emails via Brevo API */
const { generateNewsletterHtml } = require('../templates/newsletterTemplate')

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`${name} manquant`)
  return v
}

async function brevoSendEmail({ fromName, fromEmail, toEmail, subject, html }) {
  const apiKey = requireEnv('BREVO_API_KEY')

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

async function sendMail({ from, to, subject, html }) {
  const m = /"([^"]+)"\s*<([^>]+)>/.exec(from || '')
  const fromName = m?.[1] || 'Newsletter'
  const fromEmail = m?.[2] || requireEnv('BREVO_SENDER_EMAIL')

  return brevoSendEmail({
    fromName,
    fromEmail,
    toEmail: to,
    subject,
    html,
  })
}

async function sendNewsletter({ campaign, subscribers, fromName, fromEmail, settings = {} }) {
  const appUrl = settings.site_url || process.env.APP_URL || ''

  const senderEmail = fromEmail || settings.newsletter_from_email || process.env.BREVO_SENDER_EMAIL
  if (!senderEmail) throw new Error('Email expéditeur manquant (newsletter_from_email ou BREVO_SENDER_EMAIL)')

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
      await brevoSendEmail({
        fromName: fromName || settings.newsletter_from_name || 'Newsletter',
        fromEmail: senderEmail,
        toEmail: subscriber.email,
        subject: campaign.subject,
        html,
      })
    } catch (err) {
      errors.push(subscriber.email)
    }
  }

  return {
    success: subscribers.length - errors.length,
    failed: errors.length,
    failedEmails: errors,
  }
}

module.exports = { sendMail, sendNewsletter }