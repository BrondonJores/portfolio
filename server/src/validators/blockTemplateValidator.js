/* Validateurs pour les routes de templates de blocs admin. */
const { body, param, query } = require('express-validator')

const TEMPLATE_CONTEXTS = ['article', 'project', 'newsletter', 'all']

const blockTemplateIdParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant template invalide.'),
]

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
  body('change_note')
    .optional({ nullable: true })
    .isString()
    .withMessage('change_note doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('change_note ne peut pas depasser 255 caracteres.'),
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
  body('change_note')
    .optional({ nullable: true })
    .isString()
    .withMessage('change_note doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('change_note ne peut pas depasser 255 caracteres.'),
]

const importBlockTemplatesValidator = [
  body('templates')
    .isArray({ min: 1, max: 100 })
    .withMessage("L'import doit contenir entre 1 et 100 templates."),
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
]

const rollbackBlockTemplateValidator = [
  ...blockTemplateIdParamValidator,
  body('releaseId')
    .isInt({ min: 1 })
    .withMessage('releaseId est obligatoire et doit etre un entier positif.'),
]

const importBlockTemplatePackageValidator = [
  body()
    .isObject()
    .withMessage('Le package template doit etre un objet JSON.'),
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
  body('template')
    .optional()
    .isObject()
    .withMessage('template doit etre un objet.'),
  body('template.name')
    .optional()
    .isString()
    .withMessage('template.name doit etre une chaine.')
    .isLength({ min: 1, max: 120 })
    .withMessage('template.name doit contenir entre 1 et 120 caracteres.'),
  body('template.context')
    .optional()
    .isIn(TEMPLATE_CONTEXTS)
    .withMessage('template.context doit etre article, project, newsletter ou all.'),
  body('template.description')
    .optional({ nullable: true })
    .isString()
    .withMessage('template.description doit etre une chaine.')
    .isLength({ max: 2000 })
    .withMessage('template.description ne peut pas depasser 2000 caracteres.'),
  body('template.blocks')
    .optional()
    .isArray({ min: 1 })
    .withMessage('template.blocks doit contenir au moins un bloc.'),
]

module.exports = {
  blockTemplateIdParamValidator,
  listBlockTemplateValidator,
  createBlockTemplateValidator,
  updateBlockTemplateValidator,
  importBlockTemplatesValidator,
  rollbackBlockTemplateValidator,
  importBlockTemplatePackageValidator,
}
