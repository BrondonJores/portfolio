const cryptoLib = require('crypto')
const { Subscriber } = require('../models')

function createSubscriberService(deps = {}) {
  const subscriberModel = deps.subscriberModel || Subscriber
  const crypto = deps.crypto || cryptoLib

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

  async function unsubscribeFromNewsletter(token) {
    await subscriberModel.destroy({ where: { unsubscribe_token: token } })
  }

  async function getAllSubscribers() {
    return subscriberModel.findAll({ order: [['created_at', 'DESC']] })
  }

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