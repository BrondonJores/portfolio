/* Validateurs pour les routes d'articles */
const { body } = require('express-validator')

const createArticleValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Le titre est obligatoire.')
    .isLength({ max: 200 })
    .withMessage('Le titre ne peut pas depasser 200 caracteres.'),
  body('content')
    .notEmpty()
    .withMessage('Le contenu est obligatoire.'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent etre un tableau.'),
]

const updateArticleValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le titre ne peut pas etre vide.')
    .isLength({ max: 200 })
    .withMessage('Le titre ne peut pas depasser 200 caracteres.'),
  body('content')
    .optional()
    .notEmpty()
    .withMessage('Le contenu ne peut pas etre vide.'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent etre un tableau.'),
]

const importArticlesValidator = [
  body('articles')
    .isArray({ min: 1, max: 200 })
    .withMessage("L'import doit contenir entre 1 et 200 articles."),
  body('replaceExisting')
    .optional()
    .isBoolean()
    .withMessage('replaceExisting doit etre un booleen.'),
]

module.exports = { createArticleValidator, updateArticleValidator, importArticlesValidator }
