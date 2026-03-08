/* Validateurs des routes de persistance du visual builder admin. */
const { body, query } = require('express-validator')

const BUILDER_ENTITIES = ['article', 'project', 'newsletter', 'page']
const CHANNEL_REGEX = /^[a-z0-9:_-]{3,120}$/

/**
 * Validation query pour recuperer/supprimer un brouillon courant.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const currentVisualBuilderDraftQueryValidator = [
  query('entity')
    .isIn(BUILDER_ENTITIES)
    .withMessage("L'entite builder doit etre article, project, newsletter ou page."),
  query('channel')
    .isString()
    .withMessage('Le channel builder est obligatoire.')
    .matches(CHANNEL_REGEX)
    .withMessage('Le channel builder doit contenir entre 3 et 120 caracteres [a-z0-9:_-].'),
]

/**
 * Validation body pour creer/mettre a jour un brouillon builder.
 * @type {Array<import('express-validator').ValidationChain>}
 */
const upsertVisualBuilderDraftValidator = [
  body('entity')
    .isIn(BUILDER_ENTITIES)
    .withMessage("L'entite builder doit etre article, project, newsletter ou page."),
  body('channel')
    .isString()
    .withMessage('Le channel builder est obligatoire.')
    .matches(CHANNEL_REGEX)
    .withMessage('Le channel builder doit contenir entre 3 et 120 caracteres [a-z0-9:_-].'),
  body('title')
    .optional({ nullable: true })
    .isString()
    .withMessage('Le titre builder doit etre une chaine.')
    .isLength({ max: 160 })
    .withMessage('Le titre builder ne peut pas depasser 160 caracteres.'),
  body('blocks')
    .isArray({ max: 250 })
    .withMessage('Le payload builder doit contenir un tableau blocks de maximum 250 elements.'),
]

module.exports = {
  currentVisualBuilderDraftQueryValidator,
  upsertVisualBuilderDraftValidator,
}
