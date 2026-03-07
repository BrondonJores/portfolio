/* Validateurs des routes marketplace de themes. */
const { body, param, query } = require('express-validator')

const marketplaceListValidator = [
  query('q')
    .optional()
    .isString()
    .withMessage('Le filtre q doit etre une chaine.')
    .isLength({ max: 80 })
    .withMessage('Le filtre q est limite a 80 caracteres.'),
  query('category')
    .optional()
    .isString()
    .withMessage('La categorie doit etre une chaine.')
    .isLength({ max: 40 })
    .withMessage('La categorie est limitee a 40 caracteres.'),
]

const importThemeMarketplaceValidator = [
  param('slug')
    .isString()
    .withMessage('Le slug du theme est obligatoire.')
    .matches(/^[a-z0-9-]{2,80}$/)
    .withMessage('Slug marketplace invalide.'),
  body('replaceExisting')
    .optional()
    .isBoolean()
    .withMessage('replaceExisting doit etre un booleen.'),
  body('applyAfterImport')
    .optional()
    .isBoolean()
    .withMessage('applyAfterImport doit etre un booleen.'),
]

module.exports = {
  marketplaceListValidator,
  importThemeMarketplaceValidator,
}
