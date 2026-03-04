/* Service d'envoi d'emails via nodemailer */
const nodemailer = require('nodemailer')
const { generateNewsletterHtml } = require('../templates/newsletterTemplate')

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,         
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', 
    auth: {
      user: process.env.SMTP_USER,        
      pass: process.env.SMTP_PASS,        
    },
    tls: {
      rejectUnauthorized: false,   
    },
  })
}

async function sendMail({ from, to, subject, html }) {
  const transporter = createTransport()

  await transporter.verify()

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
  })
}

async function sendNewsletter({
  campaign,
  subscribers,
  fromName,
  fromEmail,
  settings = {},
}) {
  const transporter = createTransport()
  await transporter.verify()

  const appUrl =
    settings.site_url ||
    process.env.APP_URL ||
    process.env.VITE_API_URL ||
    ''

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
      await transporter.sendMail({
        from: `"${fromName || 'Newsletter'}" <${fromEmail}>`,
        to: subscriber.email,
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