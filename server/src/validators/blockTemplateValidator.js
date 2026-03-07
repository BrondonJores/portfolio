/* Validateurs pour les routes de templates de blocs admin. */
const { body, query } = require('express-validator')

const TEMPLATE_CONTEXTS = ['article', 'project', 'newsletter', 'all']

const listBlockTemplateValidator = [
  query('context')
    .optional()
    .isIn(TEMPLATE_CONTEXTS)
    .withMessage('Le contexte doit etre article, project, newsletter ou all.'),
]

const createBlockTemplateValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du template est obligatoire.')
    .isLength({ max: 120 })
    .withMessage('Le nom du template ne peut pas depasser 120 caracteres.'),
  body('context')
    .optional()
    .isIn(TEMPLATE_CONTEXTS)
    .withMessage('Le contexte doit etre article, project, newsletter ou all.'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('La description doit etre une chaine.')
    .isLength({ max: 2000 })
    .withMessage('La description ne peut pas depasser 2000 caracteres.'),
  body('blocks')
    .isArray({ min: 1 })
    .withMessage('Le template doit contenir au moins un bloc.'),
]

const updateBlockTemplateValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom du template ne peut pas etre vide.')
    .isLength({ max: 120 })
    .withMessage('Le nom du template ne peut pas depasser 120 caracteres.'),
  body('context')
    .optional()
    .isIn(TEMPLATE_CONTEXTS)
    .withMessage('Le contexte doit etre article, project, newsletter ou all.'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('La description doit etre une chaine.')
    .isLength({ max: 2000 })
    .withMessage('La description ne peut pas depasser 2000 caracteres.'),
  body('blocks')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Le template doit contenir au moins un bloc.'),
]

const importBlockTemplatesValidator = [
  body('templates')
    .isArray({ min: 1, max: 100 })
    .withMessage("L'import doit contenir entre 1 et 100 templates."),
  body('replaceExisting')
    .optional()
    .isBoolean()
    .withMessage('replaceExisting doit etre un booleen.'),
]

module.exports = {
  listBlockTemplateValidator,
  createBlockTemplateValidator,
  updateBlockTemplateValidator,
  importBlockTemplatesValidator,
}
