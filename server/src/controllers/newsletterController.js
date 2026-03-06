/* Controleur des campagnes newsletter */
const { NewsletterCampaign, Subscriber, Setting } = require('../models')
const { sendNewsletter, resolveDeliveryMode } = require('../services/mailerService')

const MAIL_DEBUG = String(process.env.MAIL_DEBUG || process.env.SMTP_DEBUG || '').toLowerCase() === 'true'

function debug(...args) {
  if (MAIL_DEBUG) {
    console.log('[newsletter]', ...args)
  }
}

function sanitizeError(err) {
  return {
    error: err?.message || 'Erreur',
    code: err?.code,
    stack: MAIL_DEBUG ? err?.stack : undefined,
  }
}

async function getAll(req, res, next) {
  try {
    const campaigns = await NewsletterCampaign.findAll({
      order: [['created_at', 'DESC']],
    })
    return res.json({ data: campaigns })
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const {
      subject,
      preheader,
      body_html,
      cta_label,
      cta_url,
      articles,
    } = req.body

    const campaign = await NewsletterCampaign.create({
      subject,
      preheader,
      body_html,
      cta_label,
      cta_url,
      articles,
      status: 'draft',
    })

    return res.status(201).json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params
    const {
      subject,
      preheader,
      body_html,
      cta_label,
      cta_url,
      articles,
    } = req.body

    const campaign = await NewsletterCampaign.findByPk(id)

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne introuvable.' })
    }

    if (campaign.status === 'sent') {
      return res.status(400).json({ error: 'Impossible de modifier une campagne deja envoyee.' })
    }

    await campaign.update({
      subject,
      preheader,
      body_html,
      cta_label,
      cta_url,
      articles,
    })

    return res.json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params
    const campaign = await NewsletterCampaign.findByPk(id)

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne introuvable.' })
    }

    if (campaign.status === 'sent') {
      return res.status(400).json({ error: 'Impossible de supprimer une campagne deja envoyee.' })
    }

    await campaign.destroy()
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
}

async function send(req, res, next) {
  const t0 = Date.now()

  try {
    const { id } = req.params
    const campaign = await NewsletterCampaign.findByPk(id)

    if (!campaign) {
      return res.status(404).json({ error: 'Campagne introuvable.' })
    }

    if (campaign.status === 'sent') {
      return res.status(400).json({ error: 'Cette campagne a deja ete envoyee.' })
    }

    const subscribers = await Subscriber.findAll({
      where: { confirmed: true },
    })

    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'Aucun abonne confirme.' })
    }

    const settingRows = await Setting.findAll()
    const settings = {}
    settingRows.forEach((row) => {
      settings[row.key] = row.value
    })

    debug('send:start', {
      campaignId: campaign.id,
      subscribers: subscribers.length,
      deliveryMode: resolveDeliveryMode(),
      devSmtpHost: process.env.DEV_SMTP_HOST || process.env.SMTP_HOST,
      devSmtpPort: process.env.DEV_SMTP_PORT || process.env.SMTP_PORT,
      brevoConfigured: Boolean(process.env.BREVO_API_KEY),
    })

    const result = await sendNewsletter({
      campaign,
      subscribers,
      fromName: settings.newsletter_from_name || 'Newsletter',
      fromEmail: settings.newsletter_from_email || process.env.BREVO_SENDER_EMAIL || process.env.DEV_SMTP_USER || process.env.SMTP_USER,
      settings,
    })

    debug('send:mailerResult', result)

    await campaign.update({
      status: 'sent',
      sent_at: new Date(),
    })

    debug('send:done', { ms: Date.now() - t0 })

    return res.json({ data: campaign, mailer: result })
  } catch (err) {
    debug('send:error', sanitizeError(err))

    const msg = err?.message || ''
    if (/Connection timeout/i.test(msg) || /timeout/i.test(msg)) {
      return res.status(502).json({
        error: 'Mail provider timeout. Le serveur ne parvient pas a joindre le service d envoi.',
        details: MAIL_DEBUG ? sanitizeError(err) : undefined,
      })
    }

    next(err)
  }
}

module.exports = { getAll, create, update, remove, send }
