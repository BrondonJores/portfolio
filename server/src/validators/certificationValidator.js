/* Validateurs pour les routes de certifications. */
const { body } = require('express-validator')

const BADGE_MAX_ITEMS = 24
const BADGE_MAX_LENGTH = 40

/**
 * Parse permissif booleen.
 * @param {unknown} value Valeur source.
 * @returns {boolean} Booleen normalise.
 */
function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())
}

/**
 * Normalise les badges depuis tableau CSV/string.
 * @param {unknown} value Valeur brute.
 * @returns {string[]} Liste badges nettoyee.
 */
function normalizeBadges(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  return Array.from(
    new Set(
      source
        .map((entry) => String(entry || '').trim().slice(0, BADGE_MAX_LENGTH))
        .filter(Boolean)
    )
  ).slice(0, BADGE_MAX_ITEMS)
}

const createCertificationValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Le titre est obligatoire.')
    .isLength({ max: 160 })
    .withMessage('Le titre ne peut pas depasser 160 caracteres.'),
  body('issuer')
    .trim()
    .notEmpty()
    .withMessage('L organisme emetteur est obligatoire.')
    .isLength({ max: 120 })
    .withMessage('L organisme emetteur ne peut pas depasser 120 caracteres.'),
  body('description')
    .optional()
    .isString()
    .withMessage('La description doit etre un texte.')
    .isLength({ max: 20000 })
    .withMessage('La description est trop longue.'),
  body('issued_at')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('La date d obtention doit etre une date valide (YYYY-MM-DD).'),
  body('expires_at')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("La date d expiration doit etre une date valide (YYYY-MM-DD)."),
  body('credential_id')
    .optional()
    .isString()
    .isLength({ max: 120 })
    .withMessage("L identifiant de credential ne peut pas depasser 120 caracteres."),
  body('credential_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Le lien credential doit etre une URL valide.')
    .isLength({ max: 255 })
    .withMessage('Le lien credential est trop long.'),
  body('image_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("L URL de l image doit etre valide.")
    .isLength({ max: 255 })
    .withMessage("L URL de l image est trop longue."),
  body('badge_image_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("L URL du badge doit etre valide.")
    .isLength({ max: 255 })
    .withMessage("L URL du badge est trop longue."),
  body('pdf_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("L URL du PDF doit etre valide.")
    .isLength({ max: 255 })
    .withMessage("L URL du PDF est trop longue."),
  body('sort_order')
    .optional()
    .isInt({ min: 0, max: 100000 })
    .withMessage('Le tri doit etre un entier positif.'),
  body('published')
    .optional()
    .customSanitizer((value) => toBoolean(value))
    .isBoolean()
    .withMessage('Le champ published doit etre booleen.'),
  body('badges')
    .optional()
    .customSanitizer((value) => normalizeBadges(value))
    .isArray({ max: BADGE_MAX_ITEMS })
    .withMessage(`Les badges doivent etre un tableau de maximum ${BADGE_MAX_ITEMS} elements.`),
]

const updateCertificationValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le titre ne peut pas etre vide.')
    .isLength({ max: 160 })
    .withMessage('Le titre ne peut pas depasser 160 caracteres.'),
  body('issuer')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('L organisme emetteur ne peut pas etre vide.')
    .isLength({ max: 120 })
    .withMessage('L organisme emetteur ne peut pas depasser 120 caracteres.'),
  body('description')
    .optional()
    .isString()
    .withMessage('La description doit etre un texte.')
    .isLength({ max: 20000 })
    .withMessage('La description est trop longue.'),
  body('issued_at')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('La date d obtention doit etre une date valide (YYYY-MM-DD).'),
  body('expires_at')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("La date d expiration doit etre une date valide (YYYY-MM-DD)."),
  body('credential_id')
    .optional()
    .isString()
    .isLength({ max: 120 })
    .withMessage("L identifiant de credential ne peut pas depasser 120 caracteres."),
  body('credential_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Le lien credential doit etre une URL valide.')
    .isLength({ max: 255 })
    .withMessage('Le lien credential est trop long.'),
  body('image_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("L URL de l image doit etre valide.")
    .isLength({ max: 255 })
    .withMessage("L URL de l image est trop longue."),
  body('badge_image_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("L URL du badge doit etre valide.")
    .isLength({ max: 255 })
    .withMessage("L URL du badge est trop longue."),
  body('pdf_url')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("L URL du PDF doit etre valide.")
    .isLength({ max: 255 })
    .withMessage("L URL du PDF est trop longue."),
  body('sort_order')
    .optional()
    .isInt({ min: 0, max: 100000 })
    .withMessage('Le tri doit etre un entier positif.'),
  body('published')
    .optional()
    .customSanitizer((value) => toBoolean(value))
    .isBoolean()
    .withMessage('Le champ published doit etre booleen.'),
  body('badges')
    .optional()
    .customSanitizer((value) => normalizeBadges(value))
    .isArray({ max: BADGE_MAX_ITEMS })
    .withMessage(`Les badges doivent etre un tableau de maximum ${BADGE_MAX_ITEMS} elements.`),
]

module.exports = {
  createCertificationValidator,
  updateCertificationValidator,
}
