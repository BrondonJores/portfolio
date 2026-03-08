/* Service metier message : regles applicatives et acces donnees. */
const { Message } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')

/**
 * Construit le service message avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.messageModel] Modele message.
 * @param {Function} [deps.now] Fabrique de date courante.
 * @returns {object} API metier message.
 */
function createMessageService(deps = {}) {
  const messageModel = deps.messageModel || Message
  const now = deps.now || (() => new Date())

  /**
   * Cree un message de contact.
   * @param {{name:string,email:string,message:string}} payload Donnees du formulaire contact.
   * @returns {Promise<object>} Message persiste.
   */
  async function createContactMessage(payload) {
    const { name, email, message } = payload
    return messageModel.create({ name, email, message })
  }

  /**
   * Recupere tous les messages.
   * @returns {Promise<Array>} Liste triee par date descendante.
   */
  async function getAllMessages(params = {}) {
    const { limit, offset } = resolveLimitOffsetPagination(params, {
      defaultLimit: 25,
      maxLimit: 200,
    })

    const result = await messageModel.findAndCountAll({
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
   * Marque un message comme lu (date courante).
   * @param {number|string} id Identifiant message.
   * @returns {Promise<object>} Message mis a jour.
   * @throws {Error} Erreur 404 si message introuvable.
   */
  async function markMessageAsRead(id) {
    const message = await messageModel.findByPk(id)
    if (!message) {
      throw createHttpError(404, 'Message introuvable.')
    }

    await message.update({ read_at: now() })
    return message
  }

  return {
    createContactMessage,
    getAllMessages,
    markMessageAsRead,
  }
}

module.exports = {
  createMessageService,
  ...createMessageService(),
}
