const { NewsletterCampaign, Subscriber } = require('../models')
const mailerService = require('./mailerService')
const settingService = require('./settingService')
const { createHttpError } = require('../utils/httpError')

function createNewsletterService(deps = {}) {
  const campaignModel = deps.campaignModel || NewsletterCampaign
  const subscriberModel = deps.subscriberModel || Subscriber
  const sendNewsletterFn = deps.sendNewsletter || mailerService.sendNewsletter
  const resolveDeliveryModeFn = deps.resolveDeliveryMode || mailerService.resolveDeliveryMode
  const getSettingsMapFn = deps.getSettingsMap || settingService.getSettingsMap
  const env = deps.env || process.env
  const now = deps.now || (() => new Date())
  const logger = deps.logger || console

  const mailDebug = String(env.MAIL_DEBUG || env.SMTP_DEBUG || '').toLowerCase() === 'true'

  function debug(...args) {
    if (mailDebug) {
      logger.log('[newsletter]', ...args)
    }
  }

  function sanitizeError(err) {
    return {
      error: err?.message || 'Erreur',
      code: err?.code,
      stack: mailDebug ? err?.stack : undefined,
    }
  }

  async function getAllCampaigns() {
    return campaignModel.findAll({
      order: [['created_at', 'DESC']],
    })
  }

  async function createCampaign(payload) {
    const { subject, preheader, body_html, cta_label, cta_url, articles } = payload

    return campaignModel.create({
      subject,
      preheader,
      body_html,
      cta_label,
      cta_url,
      articles,
      status: 'draft',
    })
  }

  async function updateCampaign(id, payload) {
    const campaign = await campaignModel.findByPk(id)

    if (!campaign) {
      throw createHttpError(404, 'Campagne introuvable.')
    }

    if (campaign.status === 'sent') {
      throw createHttpError(400, 'Impossible de modifier une campagne deja envoyee.')
    }

    const { subject, preheader, body_html, cta_label, cta_url, articles } = payload

    await campaign.update({
      subject,
      preheader,
      body_html,
      cta_label,
      cta_url,
      articles,
    })

    return campaign
  }

  async function deleteCampaign(id) {
    const campaign = await campaignModel.findByPk(id)

    if (!campaign) {
      throw createHttpError(404, 'Campagne introuvable.')
    }

    if (campaign.status === 'sent') {
      throw createHttpError(400, 'Impossible de supprimer une campagne deja envoyee.')
    }

    await campaign.destroy()
  }

  async function sendCampaign(id) {
    const t0 = Date.now()

    const campaign = await campaignModel.findByPk(id)
    if (!campaign) {
      throw createHttpError(404, 'Campagne introuvable.')
    }

    if (campaign.status === 'sent') {
      throw createHttpError(400, 'Cette campagne a deja ete envoyee.')
    }

    const subscribers = await subscriberModel.findAll({
      where: { confirmed: true },
    })

    if (subscribers.length === 0) {
      throw createHttpError(400, 'Aucun abonne confirme.')
    }

    const settings = await getSettingsMapFn()

    debug('send:start', {
      campaignId: campaign.id,
      subscribers: subscribers.length,
      deliveryMode: resolveDeliveryModeFn(),
      devSmtpHost: env.DEV_SMTP_HOST || env.SMTP_HOST,
      devSmtpPort: env.DEV_SMTP_PORT || env.SMTP_PORT,
      brevoConfigured: Boolean(env.BREVO_API_KEY),
    })

    try {
      const result = await sendNewsletterFn({
        campaign,
        subscribers,
        fromName: settings.newsletter_from_name || 'Newsletter',
        fromEmail:
          settings.newsletter_from_email ||
          env.BREVO_SENDER_EMAIL ||
          env.DEV_SMTP_USER ||
          env.SMTP_USER,
        settings,
      })

      await campaign.update({
        status: 'sent',
        sent_at: now(),
      })

      debug('send:done', { ms: Date.now() - t0, campaignId: campaign.id })

      return {
        campaign,
        mailer: result,
      }
    } catch (err) {
      debug('send:error', sanitizeError(err))

      const msg = err?.message || ''
      if (/Connection timeout/i.test(msg) || /timeout/i.test(msg)) {
        throw createHttpError(
          502,
          'Mail provider timeout. Le serveur ne parvient pas a joindre le service d envoi.',
          mailDebug ? sanitizeError(err) : undefined
        )
      }

      throw err
    }
  }

  return {
    getAllCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
  }
}

module.exports = {
  createNewsletterService,
  ...createNewsletterService(),
}