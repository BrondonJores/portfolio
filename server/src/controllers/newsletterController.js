/* Controleur des campagnes newsletter */
const { NewsletterCampaign, Subscriber, Setting } = require('../models')
const { sendNewsletter } = require('../services/mailerService')

/* Liste de toutes les campagnes (admin) */
async function getAll(req, res, next) {
  try {
    const campaigns = await NewsletterCampaign.findAll({ order: [['created_at', 'DESC']] })
    return res.json({ data: campaigns })
  } catch (err) {
    next(err)
  }
}

/* Creation d'une campagne (draft) */
async function create(req, res, next) {
  try {
    const { subject, body_html } = req.body
    const campaign = await NewsletterCampaign.create({ subject, body_html })
    return res.status(201).json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

/* Mise a jour d'une campagne draft */
async function update(req, res, next) {
  try {
    const { id } = req.params
    const { subject, body_html } = req.body
    const campaign = await NewsletterCampaign.findByPk(id)
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable.' })
    if (campaign.status === 'sent') return res.status(400).json({ error: 'Impossible de modifier une campagne deja envoyee.' })
    await campaign.update({ subject, body_html })
    return res.json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

/* Suppression d'une campagne draft */
async function remove(req, res, next) {
  try {
    const { id } = req.params
    const campaign = await NewsletterCampaign.findByPk(id)
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable.' })
    if (campaign.status === 'sent') return res.status(400).json({ error: 'Impossible de supprimer une campagne deja envoyee.' })
    await campaign.destroy()
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
}

/* Envoi d'une campagne a tous les abonnes */
async function send(req, res, next) {
  try {
    const { id } = req.params
    const campaign = await NewsletterCampaign.findByPk(id)
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable.' })
    if (campaign.status === 'sent') return res.status(400).json({ error: 'Cette campagne a deja ete envoyee.' })

    const subscribers = await Subscriber.findAll({ where: { confirmed: true } })
    if (subscribers.length === 0) return res.status(400).json({ error: 'Aucun abonne confirme.' })

    /* Recuperation des settings newsletter */
    const settingRows = await Setting.findAll({
      where: { key: ['newsletter_from_name', 'newsletter_from_email', 'newsletter_footer_text'] },
    })
    const settings = {}
    settingRows.forEach((s) => { settings[s.key] = s.value })

    await sendNewsletter({
      campaign,
      subscribers,
      fromName: settings['newsletter_from_name'] || 'Newsletter',
      fromEmail: settings['newsletter_from_email'] || process.env.SMTP_USER,
      footerText: settings['newsletter_footer_text'] || '',
    })

    await campaign.update({ status: 'sent', sent_at: new Date() })
    return res.json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, create, update, remove, send }
