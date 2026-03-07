/* Validateurs pour les routes admin des presets de theme. */
const { body, param } = require('express-validator')

const themePresetIdParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant preset invalide.'),
]

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
  body('change_note')
    .optional({ nullable: true })
    .isString()
    .withMessage('change_note doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('change_note ne peut pas depasser 255 caracteres.'),
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
  body('change_note')
    .optional({ nullable: true })
    .isString()
    .withMessage('change_note doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('change_note ne peut pas depasser 255 caracteres.'),
]

const rollbackThemePresetValidator = [
  ...themePresetIdParamValidator,
  body('releaseId')
    .isInt({ min: 1 })
    .withMessage('releaseId est obligatoire et doit etre un entier positif.'),
]

const importThemePresetPackageValidator = [
  body()
    .isObject()
    .withMessage('Le package preset doit etre un objet JSON.'),
  body('replaceExisting')
    .optional()
    .isBoolean()
    .withMessage('replaceExisting doit etre un booleen.'),
  body('change_note')
    .optional({ nullable: true })
    .isString()
    .withMessage('change_note doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('change_note ne peut pas depasser 255 caracteres.'),
  body('manifest')
    .optional()
    .isObject()
    .withMessage('manifest doit etre un objet.'),
  body('manifest.changeNote')
    .optional({ nullable: true })
    .isString()
    .withMessage('manifest.changeNote doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('manifest.changeNote ne peut pas depasser 255 caracteres.'),
  body('preset')
    .optional()
    .isObject()
    .withMessage('preset doit etre un objet.'),
  body('preset.name')
    .optional()
    .isString()
    .withMessage('preset.name doit etre une chaine.')
    .isLength({ min: 1, max: 120 })
    .withMessage('preset.name doit contenir entre 1 et 120 caracteres.'),
  body('preset.description')
    .optional({ nullable: true })
    .isString()
    .withMessage('preset.description doit etre une chaine.')
    .isLength({ max: 2000 })
    .withMessage('preset.description ne peut pas depasser 2000 caracteres.'),
  body('preset.settings')
    .optional()
    .isObject()
    .withMessage('preset.settings doit etre un objet.'),
]

module.exports = {
  themePresetIdParamValidator,
  createThemePresetValidator,
  updateThemePresetValidator,
  rollbackThemePresetValidator,
  importThemePresetPackageValidator,
}
