/* Validateurs pour les routes d'abonnement newsletter */
const { body } = require('express-validator')

const subscribeValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
]

module.exports = { subscribeValidator }
