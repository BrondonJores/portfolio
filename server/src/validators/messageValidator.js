/* Validateurs pour les routes de messages */
const { body } = require('express-validator')

const createMessageValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est obligatoire.')
    .isLength({ max: 100 })
    .withMessage('Le nom ne peut pas depasser 100 caracteres.'),
  body('email')
    .isEmail()
    .withMessage('Adresse email invalide.')
    .normalizeEmail(),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Le message est obligatoire.')
    .isLength({ max: 5000 })
    .withMessage('Le message ne peut pas depasser 5000 caracteres.'),
]

module.exports = { createMessageValidator }
