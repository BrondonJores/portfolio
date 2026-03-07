/* Validateurs pour les routes d'abonnement newsletter */
const { body } = require('express-validator')

const subscribeValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
  body('captcha_token')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Le token reCAPTCHA est invalide.')
    .isLength({ max: 4096 })
    .withMessage('Le token reCAPTCHA est invalide.'),
]

module.exports = { subscribeValidator }
