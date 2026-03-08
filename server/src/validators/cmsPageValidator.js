/* Validateurs des routes pages CMS (admin + public). */
const { body, param, query } = require('express-validator')

const PAGE_STATUSES = ['draft', 'published', 'archived']
const SLUG_PATTERN = /^[a-z0-9-]{1,160}$/

/**
 * Validation de l'identifiant page en parametre.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const cmsPageIdParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant page invalide.'),
]

/**
 * Validation de la liste admin des pages.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const listAdminCmsPagesValidator = [
  query('status')
    .optional()
    .isIn(PAGE_STATUSES)
    .withMessage('Le status doit etre draft, published ou archived.'),
  query('q')
    .optional()
    .isString()
    .withMessage('La recherche q doit etre une chaine.')
    .isLength({ max: 120 })
    .withMessage('La recherche q ne peut pas depasser 120 caracteres.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('limit doit etre un entier entre 1 et 200.'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset doit etre un entier superieur ou egal a 0.'),
]

/**
 * Validation de la liste publique des pages.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const listPublicCmsPagesValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit doit etre un entier entre 1 et 100.'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset doit etre un entier superieur ou egal a 0.'),
]

/**
 * Validation de creation page CMS.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const createCmsPageValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Le titre de la page est obligatoire.')
    .isLength({ max: 180 })
    .withMessage('Le titre de la page ne peut pas depasser 180 caracteres.'),
  body('slug')
    .optional({ nullable: true })
    .matches(SLUG_PATTERN)
    .withMessage('Le slug doit contenir uniquement [a-z0-9-] (max 160).'),
  body('blocks')
    .optional()
    .isArray({ max: 250 })
    .withMessage('blocks doit etre un tableau de 250 elements maximum.'),
  body('layout')
    .optional()
    .custom((value) => Array.isArray(value) || (value && typeof value === 'object'))
    .withMessage('layout doit etre un tableau ou un objet contenant des blocs.'),
  body('seo')
    .optional()
    .isObject()
    .withMessage('seo doit etre un objet.'),
  body('change_note')
    .optional({ nullable: true })
    .isString()
    .withMessage('change_note doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('change_note ne peut pas depasser 255 caracteres.'),
]

/**
 * Validation de mise a jour page CMS.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const updateCmsPageValidator = [
  ...cmsPageIdParamValidator,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le titre ne peut pas etre vide.')
    .isLength({ max: 180 })
    .withMessage('Le titre ne peut pas depasser 180 caracteres.'),
  body('slug')
    .optional({ nullable: true })
    .matches(SLUG_PATTERN)
    .withMessage('Le slug doit contenir uniquement [a-z0-9-] (max 160).'),
  body('status')
    .optional()
    .isIn(PAGE_STATUSES)
    .withMessage('Le status doit etre draft, published ou archived.'),
  body('blocks')
    .optional()
    .isArray({ max: 250 })
    .withMessage('blocks doit etre un tableau de 250 elements maximum.'),
  body('layout')
    .optional()
    .custom((value) => Array.isArray(value) || (value && typeof value === 'object'))
    .withMessage('layout doit etre un tableau ou un objet contenant des blocs.'),
  body('seo')
    .optional()
    .isObject()
    .withMessage('seo doit etre un objet.'),
  body('change_note')
    .optional({ nullable: true })
    .isString()
    .withMessage('change_note doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('change_note ne peut pas depasser 255 caracteres.'),
]

/**
 * Validation publication page CMS.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const publishCmsPageValidator = [
  ...cmsPageIdParamValidator,
  body('change_note')
    .optional({ nullable: true })
    .isString()
    .withMessage('change_note doit etre une chaine.')
    .isLength({ max: 255 })
    .withMessage('change_note ne peut pas depasser 255 caracteres.'),
]

/**
 * Validation rollback page CMS.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const rollbackCmsPageValidator = [
  ...cmsPageIdParamValidator,
  body('revisionId')
    .isInt({ min: 1 })
    .withMessage('revisionId est obligatoire et doit etre un entier positif.'),
]

/**
 * Validation slug public.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const cmsPageSlugParamValidator = [
  param('slug')
    .matches(SLUG_PATTERN)
    .withMessage('Slug de page invalide.'),
]

module.exports = {
  cmsPageIdParamValidator,
  listAdminCmsPagesValidator,
  listPublicCmsPagesValidator,
  createCmsPageValidator,
  updateCmsPageValidator,
  publishCmsPageValidator,
  rollbackCmsPageValidator,
  cmsPageSlugParamValidator,
}
