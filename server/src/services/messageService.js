const { Message } = require('../models')
const { createHttpError } = require('../utils/httpError')

function createMessageService(deps = {}) {
  const messageModel = deps.messageModel || Message
  const now = deps.now || (() => new Date())

  async function createContactMessage(payload) {
    const { name, email, message } = payload
    return messageModel.create({ name, email, message })
  }

  async function getAllMessages() {
    return messageModel.findAll({ order: [['created_at', 'DESC']] })
  }

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