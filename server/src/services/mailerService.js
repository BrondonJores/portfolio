/* Service d'envoi d'emails via nodemailer */
const nodemailer = require('nodemailer')

/* Cree le transport SMTP a partir des variables d'environnement */
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/* Envoi d'un email simple */
async function sendMail({ from, to, subject, html }) {
  const transporter = createTransport()
  try {
    await transporter.sendMail({ from, to, subject, html })
  } catch (err) {
    console.error('[mailerService] sendMail error:', err.message)
    throw new Error('Erreur lors de l\'envoi de l\'email.')
  }
}

/* Envoi de la campagne newsletter a tous les abonnes */
async function sendNewsletter({ campaign, subscribers, fromName, fromEmail, footerText }) {
  const transporter = createTransport()
  const appUrl = process.env.APP_URL || process.env.VITE_API_URL || ''
  const errors = []

  for (const subscriber of subscribers) {
    const unsubscribeLink = `${appUrl}/api/unsubscribe/${subscriber.unsubscribe_token}`
    const footer = `<p style="font-size:12px;color:#888;">${footerText || ''} <a href="${unsubscribeLink}">Se desabonner</a></p>`
    const html = `${campaign.body_html}${footer}`
    try {
      await transporter.sendMail({
        from: `"${fromName || 'Newsletter'}" <${fromEmail}>`,
        to: subscriber.email,
        subject: campaign.subject,
        html,
      })
    } catch (err) {
      console.error(`[mailerService] sendNewsletter error for ${subscriber.email}:`, err.message)
      errors.push(subscriber.email)
    }
  }

  if (errors.length > 0) {
    console.warn(`[mailerService] ${errors.length} email(s) failed to send.`)
  }
}

module.exports = { sendMail, sendNewsletter }
