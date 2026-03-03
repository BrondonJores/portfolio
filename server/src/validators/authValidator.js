/* Validateurs pour les routes d'authentification */
const { body } = require('express-validator')

const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Adresse email invalide.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est obligatoire.'),
]

module.exports = { loginValidator }
