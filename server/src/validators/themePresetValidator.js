/* Validateurs pour les routes admin des presets de theme. */
const { body } = require('express-validator')

const createThemePresetValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du preset est obligatoire.')
    .isLength({ max: 120 })
    .withMessage('Le nom du preset ne peut pas depasser 120 caracteres.'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('La description doit etre une chaine.')
    .isLength({ max: 2000 })
    .withMessage('La description ne peut pas depasser 2000 caracteres.'),
  body('settings')
    .isObject()
    .withMessage('Le preset doit contenir un objet settings.'),
]

const updateThemePresetValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom du preset ne peut pas etre vide.')
    .isLength({ max: 120 })
    .withMessage('Le nom du preset ne peut pas depasser 120 caracteres.'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('La description doit etre une chaine.')
    .isLength({ max: 2000 })
    .withMessage('La description ne peut pas depasser 2000 caracteres.'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Les settings doivent etre un objet.'),
]

module.exports = {
  createThemePresetValidator,
  updateThemePresetValidator,
}
