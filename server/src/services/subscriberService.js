/* Service metier subscriber : regles applicatives et acces donnees. */
const cryptoLib = require('crypto')
const sequelizeLib = require('sequelize')
const { Subscriber } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')

/**
 * Construit le service abonne avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.subscriberModel] Modele subscriber.
 * @param {object} [deps.crypto] API crypto.
 * @returns {object} API metier subscriber.
 */
function createSubscriberService(deps = {}) {
  const subscriberModel = deps.subscriberModel || Subscriber
  const crypto = deps.crypto || cryptoLib
  const sequelizeOps = deps.sequelizeOps || sequelizeLib
  const { Op } = sequelizeOps

  /**
   * Genere un token brut de desinscription (envoye par email uniquement).
   * @returns {string} Token aleatoire hexadecimal.
   */
  function generateUnsubscribeToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Hache un token de desinscription pour stockage en base.
   * @param {string} token Token brut.
   * @returns {string} Hash SHA-256 hexadecimal.
   */
  function hashUnsubscribeToken(token) {
    return crypto
      .createHash('sha256')
      .update(String(token || ''), 'utf8')
      .digest('hex')
  }

  /**
   * Normalise un token issu d'un parametre URL.
   * @param {unknown} token Valeur brute.
   * @returns {string} Token normalise.
   */
  function normalizeIncomingToken(token) {
    return String(token || '').trim()
  }

  /**
   * Cree un abonnement newsletter et genere un token de desinscription.
   * Retourne `alreadySubscribed=true` en cas d'email deja present.
   * @param {string} email Email a abonner.
   * @returns {Promise<{message:string,alreadySubscribed:boolean}>} Resultat metier d'abonnement.
   */
  async function subscribeToNewsletter(email) {
    const token = generateUnsubscribeToken()
    const tokenHash = hashUnsubscribeToken(token)

    try {
      await subscriberModel.create({
        email,
        unsubscribe_token: tokenHash,
      })
      return { message: 'Abonnement confirme.', alreadySubscribed: false }
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return { message: 'Abonnement confirme.', alreadySubscribed: true }
      }
      throw err
    }
  }

  /**
   * Supprime l'abonnement correspondant a un token.
   * @param {string} token Token de desabonnement.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  async function unsubscribeFromNewsletter(token) {
    const normalizedToken = normalizeIncomingToken(token)
    if (!normalizedToken) {
      return
    }

    const hashedToken = hashUnsubscribeToken(normalizedToken)
    await subscriberModel.destroy({
      where: {
        [Op.or]: [
          { unsubscribe_token: normalizedToken },
          { unsubscribe_token: hashedToken },
        ],
      },
    })
  }

  /**
   * Regroupe et prepare les abonnes avant envoi:
   * - genere un token brut unique par abonne (lien email),
   * - persiste uniquement son hash en base.
   * @param {Array<object>} subscribers Liste abonnes Sequelize.
   * @returns {Promise<Array<object>>} Liste avec token brut pret pour le mailer.
   */
  async function prepareSubscribersForNewsletter(subscribers) {
    const source = Array.isArray(subscribers) ? subscribers : []
    const prepared = []

    for (const subscriber of source) {
      const rawToken = generateUnsubscribeToken()
      const hashedToken = hashUnsubscribeToken(rawToken)

      if (subscriber && typeof subscriber.update === 'function') {
        await subscriber.update({ unsubscribe_token: hashedToken })
      } else {
        const subscriberId = Number.parseInt(String(subscriber?.id || ''), 10)
        if (!Number.isFinite(subscriberId) || subscriberId <= 0) {
          throw createHttpError(500, "Impossible de generer le lien de desinscription de l'abonne.")
        }
        await subscriberModel.update(
          { unsubscribe_token: hashedToken },
          { where: { id: subscriberId } }
        )
      }

      const payload =
        subscriber && typeof subscriber.toJSON === 'function' ? subscriber.toJSON() : { ...(subscriber || {}) }
      prepared.push({
        ...payload,
        unsubscribe_token: rawToken,
      })
    }

    return prepared
  }

  /**
   * Liste tous les abonnes.
   * @returns {Promise<Array>} Liste des abonnes.
   */
  async function getAllSubscribers(params = {}) {
    const { limit, offset } = resolveLimitOffsetPagination(params, {
      defaultLimit: 25,
      maxLimit: 200,
    })

    const result = await subscriberModel.findAndCountAll({
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
   * Supprime un abonne par identifiant.
   * @param {number|string} id Identifiant subscriber.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  async function deleteSubscriber(id) {
    await subscriberModel.destroy({ where: { id } })
  }

  return {
    subscribeToNewsletter,
    unsubscribeFromNewsletter,
    prepareSubscribersForNewsletter,
    getAllSubscribers,
    deleteSubscriber,
  }
}

module.exports = {
  createSubscriberService,
  ...createSubscriberService(),
}
