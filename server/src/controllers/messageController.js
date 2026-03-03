/* Controleur des messages de contact */
const { Message } = require('../models')

/* Envoi d'un message de contact (route publique) */
async function create(req, res, next) {
  try {
    const { name, email, message } = req.body

    const newMessage = await Message.create({ name, email, message })

    return res.status(201).json({ message: 'Message envoye avec succes.' })
  } catch (err) {
    next(err)
  }
}

/* Recuperation de tous les messages (admin) */
async function getAll(req, res, next) {
  try {
    const messages = await Message.findAll({ order: [['created_at', 'DESC']] })
    return res.json({ data: messages })
  } catch (err) {
    next(err)
  }
}

/* Marquage d'un message comme lu */
async function markAsRead(req, res, next) {
  try {
    const msg = await Message.findByPk(req.params.id)

    if (!msg) {
      return res.status(404).json({ error: 'Message introuvable.' })
    }

    await msg.update({ read_at: new Date() })

    return res.json({ data: msg })
  } catch (err) {
    next(err)
  }
}

module.exports = { create, getAll, markAsRead }
