/* Validateurs pour les routes d'authentification */
const { body } = require('express-validator')

const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Adresse email invalide.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est obligatoire.'),
]

const verifyTwoFactorValidator = [
  body('mfa_token')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Token MFA manquant.')
    .isLength({ max: 4096 })
    .withMessage('Token MFA invalide.'),
  body('totp_code')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Code TOTP invalide.')
    .trim()
    .isLength({ min: 6, max: 12 })
    .withMessage('Code TOTP invalide.'),
  body('recovery_code')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Code de recuperation invalide.')
    .trim()
    .isLength({ min: 6, max: 32 })
    .withMessage('Code de recuperation invalide.'),
  body().custom((value) => {
    const hasTotp = Boolean(value?.totp_code)
    const hasRecovery = Boolean(value?.recovery_code)
    if (!hasTotp && !hasRecovery) {
      throw new Error('Code TOTP ou code de recuperation requis.')
    }
    return true
  }),
]

const twoFactorEnableValidator = [
  body('setup_token')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Token setup 2FA manquant.')
    .isLength({ max: 4096 })
    .withMessage('Token setup 2FA invalide.'),
  body('totp_code')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Code TOTP requis.')
    .isLength({ min: 6, max: 12 })
    .withMessage('Code TOTP invalide.'),
]

const twoFactorDisableValidator = [
  body('totp_code')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Code TOTP invalide.')
    .trim()
    .isLength({ min: 6, max: 12 })
    .withMessage('Code TOTP invalide.'),
  body('recovery_code')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Code de recuperation invalide.')
    .trim()
    .isLength({ min: 6, max: 32 })
    .withMessage('Code de recuperation invalide.'),
  body().custom((value) => {
    const hasTotp = Boolean(value?.totp_code)
    const hasRecovery = Boolean(value?.recovery_code)
    if (!hasTotp && !hasRecovery) {
      throw new Error('Code TOTP ou code de recuperation requis.')
    }
    return true
  }),
]

const regenerateRecoveryCodesValidator = [
  body('totp_code')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Code TOTP requis.')
    .isLength({ min: 6, max: 12 })
    .withMessage('Code TOTP invalide.'),
]

module.exports = {
  loginValidator,
  verifyTwoFactorValidator,
  twoFactorEnableValidator,
  twoFactorDisableValidator,
  regenerateRecoveryCodesValidator,
}
