/* Service metier newsletter : regles applicatives et acces donnees. */
const { NewsletterCampaign, Subscriber } = require('../models')
const mailerService = require('./mailerService')
const settingService = require('./settingService')
const subscriberService = require('./subscriberService')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')

/**
 * Construit le service newsletter avec dependances injectables.
 * @param {object} [deps={}] Dependances externes (modeles, mailer, env, logger...).
 * @returns {object} API metier newsletter.
 */
function createNewsletterService(deps = {}) {
  const campaignModel = deps.campaignModel || NewsletterCampaign
  const subscriberModel = deps.subscriberModel || Subscriber
  const sendNewsletterFn = deps.sendNewsletter || mailerService.sendNewsletter
  const resolveDeliveryModeFn = deps.resolveDeliveryMode || mailerService.resolveDeliveryMode
  const getSettingsMapFn = deps.getSettingsMap || settingService.getSettingsMap
  const prepareSubscribersForNewsletterFn =
    deps.prepareSubscribersForNewsletter || subscriberService.prepareSubscribersForNewsletter
  const env = deps.env || process.env
  const now = deps.now || (() => new Date())
  const logger = deps.logger || console

  const mailDebug = String(env.MAIL_DEBUG || env.SMTP_DEBUG || '').toLowerCase() === 'true'

  /**
   * Journalise une trace metier newsletter uniquement si le debug mail est actif.
   * @param {...unknown} args Donnees a logger.
   * @returns {void}
   */
  function debug(...args) {
    if (mailDebug) {
      logger.log('[newsletter]', ...args)
    }
  }

  /**
   * Sanitise une erreur brute pour journalisation/reponse technique.
   * @param {unknown} err Erreur d'origine.
   * @returns {{error:string,code:unknown,stack:unknown}} Erreur simplifiee.
   */
  function sanitizeError(err) {
    return {
      error: err?.message || 'Erreur',
      code: err?.code,
      stack: mailDebug ? err?.stack : undefined,
    }
  }

  /**
   * Liste les campagnes newsletter.
   * @returns {Promise<Array>} Campagnes triees.
   */
  async function getAllCampaigns(params = {}) {
    const { limit, offset } = resolveLimitOffsetPagination(params, {
      defaultLimit: 20,
      maxLimit: 200,
    })

    const result = await campaignModel.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    return buildPaginatedPayload({
      items: result.rows,
      total: result.count,
      limit,
      offset,
    })
  }

  /**
   * Recupere une campagne par identifiant.
   * @param {number|string} id Identifiant campagne.
   * @returns {Promise<object>} Campagne trouvee.
   * @throws {Error} Erreur 404 si campagne introuvable.
   */
  async function getCampaignById(id) {
    const campaign = await campaignModel.findByPk(id)
    if (!campaign) {
      throw createHttpError(404, 'Campagne introuvable.')
    }
    return campaign
  }

  /**
   * Cree une campagne en statut `draft`.
   * @param {object} payload Donnees campagne.
   * @returns {Promise<object>} Campagne creee.
   */
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

  /**
   * Met a jour une campagne non envoyee.
   * @param {number|string} id Identifiant campagne.
   * @param {object} payload Donnees a mettre a jour.
   * @returns {Promise<object>} Campagne mise a jour.
   * @throws {Error} Erreur 404/400 selon le statut.
   */
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

  /**
   * Supprime une campagne si elle n'a pas encore ete envoyee.
   * @param {number|string} id Identifiant campagne.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404/400 selon le statut.
   */
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

  /**
   * Envoie une campagne a tous les abonnes confirmes puis marque la campagne comme envoyee.
   * @param {number|string} id Identifiant campagne.
   * @returns {Promise<{campaign:object,mailer:object}>} Campagne mise a jour + bilan mailer.
   * @throws {Error} Erreurs metier 404/400/502.
   */
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
    const subscribersWithUnsubscribeTokens = await prepareSubscribersForNewsletterFn(subscribers)

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
        subscribers: subscribersWithUnsubscribeTokens,
        fromName: settings.newsletter_from_name || 'Newsletter',
        fromEmail:
          settings.newsletter_from_email ||
          env.BREVO_SENDER_EMAIL ||
          env.DEV_SMTP_USER ||
          env.SMTP_USER,
        settings,
      })

      if (Number(result?.success || 0) <= 0) {
        throw createHttpError(
          502,
          "Aucun email n'a pu etre envoye. La campagne reste en brouillon.",
          mailDebug ? { mailer: result } : undefined
        )
      }

      await campaign.update({
        status: 'sent',
        sent_at: now(),
      })

      if (Number(result?.failed || 0) > 0) {
        debug('send:partial', {
          campaignId: campaign.id,
          failed: result.failed,
          success: result.success,
        })
      }

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
    getCampaignById,
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
