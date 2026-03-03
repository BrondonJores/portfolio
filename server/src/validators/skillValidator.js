/* Validateurs pour les routes de competences */
const { body } = require('express-validator')

const createSkillValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est obligatoire.')
    .isLength({ max: 100 })
    .withMessage('Le nom ne peut pas depasser 100 caracteres.'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('La categorie est obligatoire.')
    .isLength({ max: 50 })
    .withMessage('La categorie ne peut pas depasser 50 caracteres.'),
  body('level')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Le niveau doit etre un entier entre 0 et 100.'),
]

const updateSkillValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Le nom ne peut pas depasser 100 caracteres.'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('La categorie ne peut pas depasser 50 caracteres.'),
  body('level')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Le niveau doit etre un entier entre 0 et 100.'),
]

module.exports = { createSkillValidator, updateSkillValidator }
