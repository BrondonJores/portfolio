/* Validateurs pour les routes de projets */
const { body } = require('express-validator')

const createProjectValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Le titre est obligatoire.')
    .isLength({ max: 150 })
    .withMessage('Le titre ne peut pas depasser 150 caracteres.'),
  body('description')
    .optional()
    .trim(),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent etre un tableau.'),
  body('github_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('URL GitHub invalide.'),
  body('demo_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('URL de demo invalide.'),
]

const updateProjectValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le titre ne peut pas etre vide.')
    .isLength({ max: 150 })
    .withMessage('Le titre ne peut pas depasser 150 caracteres.'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent etre un tableau.'),
  body('github_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('URL GitHub invalide.'),
  body('demo_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('URL de demo invalide.'),
]

const importProjectsValidator = [
  body('projects')
    .isArray({ min: 1, max: 200 })
    .withMessage("L'import doit contenir entre 1 et 200 projets."),
  body('replaceExisting')
    .optional()
    .isBoolean()
    .withMessage('replaceExisting doit etre un booleen.'),
]

module.exports = { createProjectValidator, updateProjectValidator, importProjectsValidator }
