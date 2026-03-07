const {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getAllSubscribers,
  deleteSubscriber,
} = require('../services/subscriberService')

async function subscribe(req, res, next) {
  try {
    const result = await subscribeToNewsletter(req.body.email)
    const status = result.alreadySubscribed ? 200 : 201
    return res.status(status).json({ data: { message: result.message } })
  } catch (err) {
    next(err)
  }
}

async function unsubscribe(req, res, next) {
  try {
    await unsubscribeFromNewsletter(req.params.token)
    return res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Desabonnement</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;"><h1>Vous avez ete desabonne(e).</h1><p>Vous ne recevrez plus nos newsletters.</p></body></html>')
  } catch (err) {
    next(err)
  }
}

async function getAll(req, res, next) {
  try {
    const subscribers = await getAllSubscribers()
    return res.json({ data: subscribers })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    await deleteSubscriber(req.params.id)
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
}

module.exports = { subscribe, unsubscribe, getAll, remove }