const {
  createContactMessage,
  getAllMessages,
  markMessageAsRead,
} = require('../services/messageService')

async function create(req, res, next) {
  try {
    await createContactMessage(req.body)
    return res.status(201).json({ message: 'Message envoye avec succes.' })
  } catch (err) {
    next(err)
  }
}

async function getAll(req, res, next) {
  try {
    const messages = await getAllMessages()
    return res.json({ data: messages })
  } catch (err) {
    next(err)
  }
}

async function markAsRead(req, res, next) {
  try {
    const message = await markMessageAsRead(req.params.id)
    return res.json({ data: message })
  } catch (err) {
    next(err)
  }
}

module.exports = { create, getAll, markAsRead }