/* Validateurs pour les routes de projets */
const { body } = require('express-validator')

const taxonomyValidators = [
  body('taxonomy')
    .optional()
    .isObject()
    .withMessage('La taxonomie doit etre un objet.'),
  body('taxonomy.type')
    .optional({ nullable: true })
    .isString()
    .withMessage('Le type de projet doit etre une chaine.')
    .isLength({ max: 80 })
    .withMessage('Le type ne peut pas depasser 80 caracteres.'),
  body('taxonomy.stack')
    .optional()
    .isArray({ max: 5 })
    .withMessage('La stack doit etre un tableau (max 5).'),
  body('taxonomy.stack.*')
    .optional()
    .isString()
    .withMessage('Chaque element stack doit etre une chaine.')
    .isLength({ max: 80 })
    .withMessage('Un element stack ne peut pas depasser 80 caracteres.'),
  body('taxonomy.technologies')
    .optional()
    .isArray({ max: 18 })
    .withMessage('Les technologies doivent etre un tableau (max 18).'),
  body('taxonomy.technologies.*')
    .optional()
    .isString()
    .withMessage('Chaque technologie doit etre une chaine.')
    .isLength({ max: 80 })
    .withMessage('Une technologie ne peut pas depasser 80 caracteres.'),
  body('taxonomy.domains')
    .optional()
    .isArray({ max: 6 })
    .withMessage('Les domaines doivent etre un tableau (max 6).'),
  body('taxonomy.domains.*')
    .optional()
    .isString()
    .withMessage('Chaque domaine doit etre une chaine.')
    .isLength({ max: 80 })
    .withMessage('Un domaine ne peut pas depasser 80 caracteres.'),
  body('taxonomy.labels')
    .optional()
    .isArray({ max: 12 })
    .withMessage('Les labels doivent etre un tableau (max 12).'),
  body('taxonomy.labels.*')
    .optional()
    .isString()
    .withMessage('Chaque label doit etre une chaine.')
    .isLength({ max: 80 })
    .withMessage('Un label ne peut pas depasser 80 caracteres.'),
]

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
  ...taxonomyValidators,
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
  ...taxonomyValidators,
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
