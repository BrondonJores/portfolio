/* Validateurs pour les routes de commentaires */
const { body } = require('express-validator')

const createCommentValidator = [
  body('article_id')
    .isInt({ min: 1 })
    .withMessage("L'identifiant d'article est invalide.")
    .toInt(),
  body('author_name')
    .trim()
    .notEmpty()
    .withMessage("Le nom de l'auteur est obligatoire.")
    .isLength({ max: 100 })
    .withMessage("Le nom de l'auteur ne peut pas depasser 100 caracteres."),
  body('author_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Adresse email invalide.')
    .normalizeEmail(),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Le commentaire est obligatoire.')
    .isLength({ max: 3000 })
    .withMessage('Le commentaire ne peut pas depasser 3000 caracteres.'),
]

module.exports = { createCommentValidator }
