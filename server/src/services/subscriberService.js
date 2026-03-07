/* Service metier subscriber : regles applicatives et acces donnees. */
const cryptoLib = require('crypto')
const { Subscriber } = require('../models')

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

  /**
   * Cree un abonnement newsletter et genere un token de desinscription.
   * Retourne `alreadySubscribed=true` en cas d'email deja present.
   * @param {string} email Email a abonner.
   * @returns {Promise<{message:string,alreadySubscribed:boolean}>} Resultat metier d'abonnement.
   */
  async function subscribeToNewsletter(email) {
    const token = crypto.randomBytes(32).toString('hex')

    try {
      await subscriberModel.create({
        email,
        unsubscribe_token: token,
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
    await subscriberModel.destroy({ where: { unsubscribe_token: token } })
  }

  /**
   * Liste tous les abonnes.
   * @returns {Promise<Array>} Liste des abonnes.
   */
  async function getAllSubscribers() {
    return subscriberModel.findAll({ order: [['created_at', 'DESC']] })
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
    getAllSubscribers,
    deleteSubscriber,
  }
}

module.exports = {
  createSubscriberService,
  ...createSubscriberService(),
}
