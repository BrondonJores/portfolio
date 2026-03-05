/* Controleur des campagnes newsletter */
const { NewsletterCampaign, Subscriber, Setting } = require('../models')
const { sendNewsletter } = require('../services/mailerService')

const SMTP_DEBUG = String(process.env.SMTP_DEBUG || '').toLowerCase() === 'true'

function debug(...args) {
  if (SMTP_DEBUG) console.log('[newsletter]', ...args)
}

function sanitizeError(err) {
  return {
    error: err?.message || 'Erreur',
    code: err?.code,
    stack: SMTP_DEBUG ? err?.stack : undefined,
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

    if (!campaign)
      return res.status(404).json({ error: 'Campagne introuvable.' })

    if (campaign.status === 'sent')
      return res
        .status(400)
        .json({ error: 'Impossible de modifier une campagne déjà envoyée.' })

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

    if (!campaign)
      return res.status(404).json({ error: 'Campagne introuvable.' })

    if (campaign.status === 'sent')
      return res
        .status(400)
        .json({ error: 'Impossible de supprimer une campagne déjà envoyée.' })

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

    if (!campaign)
      return res.status(404).json({ error: 'Campagne introuvable.' })

    if (campaign.status === 'sent')
      return res
        .status(400)
        .json({ error: 'Cette campagne a déjà été envoyée.' })

    const subscribers = await Subscriber.findAll({
      where: { confirmed: true },
    })

    if (subscribers.length === 0)
      return res
        .status(400)
        .json({ error: 'Aucun abonné confirmé.' })

    const settingRows = await Setting.findAll()
    const settings = {}
    settingRows.forEach((row) => {
      settings[row.key] = row.value
    })

    debug('send:start', {
      campaignId: campaign.id,
      subscribers: subscribers.length,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      smtpSecure: process.env.SMTP_SECURE,
    })

    // Envoi synchronisé (comme ton code), mais logs + erreurs plus explicites
    const result = await sendNewsletter({
      campaign,
      subscribers,
      fromName: settings.newsletter_from_name || 'Newsletter',
      fromEmail: settings.newsletter_from_email || process.env.SMTP_USER,
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

    // Si c'est un timeout SMTP, on renvoie un message clair
    const msg = err?.message || ''
    if (/Connection timeout/i.test(msg) || /timeout/i.test(msg)) {
      return res.status(502).json({
        error: 'Connection timeout (SMTP). Le serveur ne parvient pas à joindre le relay SMTP.',
        details: SMTP_DEBUG ? sanitizeError(err) : undefined,
      })
    }

    next(err)
  }
}

module.exports = { getAll, create, update, remove, send }