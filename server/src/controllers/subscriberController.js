/* Controleur des abonnes newsletter */
const crypto = require('crypto')
const { Subscriber } = require('../models')

/* Abonnement a la newsletter (route publique) */
async function subscribe(req, res, next) {
  try {
    const { email } = req.body
    const token = crypto.randomBytes(32).toString('hex')
    await Subscriber.create({ email, unsubscribe_token: token })
    return res.status(201).json({ data: { message: 'Abonnement confirme.' } })
  } catch (err) {
    /* Doublon : renvoyer 200 silencieux pour ne pas reveler si l'email existe deja */
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(200).json({ data: { message: 'Abonnement confirme.' } })
    }
    next(err)
  }
}

/* Desabonnement via token (route publique) */
async function unsubscribe(req, res, next) {
  try {
    const { token } = req.params
    await Subscriber.destroy({ where: { unsubscribe_token: token } })
    return res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Desabonnement</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Vous avez ete desabonne(e).</h1><p>Vous ne recevrez plus nos newsletters.</p></body></html>`)
  } catch (err) {
    next(err)
  }
}

/* Liste de tous les abonnes (admin) */
async function getAll(req, res, next) {
  try {
    const subscribers = await Subscriber.findAll({ order: [['created_at', 'DESC']] })
    return res.json({ data: subscribers })
  } catch (err) {
    next(err)
  }
}

/* Suppression d'un abonne (admin) */
async function remove(req, res, next) {
  try {
    const { id } = req.params
    await Subscriber.destroy({ where: { id } })
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
}

module.exports = { subscribe, unsubscribe, getAll, remove }
