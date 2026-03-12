/* Controleur HTTP auth : delegue le metier auth/2FA au service associe. */
const {
  loginAdmin,
  verifyTwoFactorLogin,
  beginTwoFactorSetup,
  enableTwoFactorForAdmin,
  disableTwoFactorForAdmin,
  regenerateTwoFactorRecoveryCodes,
  getTwoFactorStatus,
  refreshAdminSession,
  logoutAdminSession,
  getRefreshCookieOptions,
} = require('../services/authService')
const { logSecurityEventFromRequest } = require('../services/securityEventService')

/**
 * Authentifie un administrateur.
 * - Si 2FA desactive: pose le refresh token en cookie + renvoie access token.
 * - Si 2FA active: renvoie un challenge MFA (sans cookie de session).
 * @param {import('express').Request} req Requete contenant email/mot de passe.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse.
 */
async function login(req, res, next) {
  try {
    const result = await loginAdmin(req.body)

    if (result.mfaRequired) {
      return res.json({
        mfaRequired: true,
        mfaToken: result.mfaToken,
        user: result.user,
      })
    }

    res.cookie('refresh_token', result.refreshToken, getRefreshCookieOptions())
    return res.json({
      mfaRequired: false,
      accessToken: result.accessToken,
      user: result.user,
    })
  } catch (err) {
    if (err?.statusCode === 401) {
      await logSecurityEventFromRequest(req, {
        eventType: 'auth.login_failed',
        severity: 'warning',
        source: 'auth_controller',
        email: req.body?.email,
        message: err.message || 'Echec de connexion admin.',
      })
    }
    next(err)
  }
}

/**
 * Finalise une connexion via code 2FA (TOTP ou recovery code).
 * @param {import('express').Request} req Requete contenant challenge token + code.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres ouverture de session.
 */
async function verifyTwoFactor(req, res, next) {
  try {
    const { mfa_token, totp_code, recovery_code } = req.body
    const result = await verifyTwoFactorLogin({
      mfaToken: mfa_token,
      totpCode: totp_code,
      recoveryCode: recovery_code,
    })

    res.cookie('refresh_token', result.refreshToken, getRefreshCookieOptions())
    return res.json({
      mfaRequired: false,
      accessToken: result.accessToken,
      user: result.user,
      usedRecoveryCode: result.usedRecoveryCode === true,
      recoveryCodesRemaining: result.recoveryCodesRemaining,
    })
  } catch (err) {
    if (err?.statusCode === 401) {
      await logSecurityEventFromRequest(req, {
        eventType: 'auth.2fa_failed',
        severity: 'warning',
        source: 'auth_controller',
        message: err.message || 'Echec verification 2FA.',
        metadata: {
          hasTotpCode: Boolean(req.body?.totp_code),
          hasRecoveryCode: Boolean(req.body?.recovery_code),
        },
      })
    }
    next(err)
  }
}

/**
 * Lance un setup 2FA pour l'admin courant (secret + otpauth + setup token).
 * @param {import('express').Request} req Requete authentifiee.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres generation setup.
 */
async function setupTwoFactor(req, res, next) {
  try {
    const result = await beginTwoFactorSetup(req.user.id)
    return res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

/**
 * Active le 2FA pour l'admin courant apres verification du code setup.
 * @param {import('express').Request} req Requete authentifiee.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres activation.
 */
async function enableTwoFactor(req, res, next) {
  try {
    const result = await enableTwoFactorForAdmin({
      adminId: req.user.id,
      setupToken: req.body.setup_token,
      totpCode: req.body.totp_code,
    })
    return res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

/**
 * Desactive le 2FA pour l'admin courant.
 * @param {import('express').Request} req Requete authentifiee.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres desactivation.
 */
async function disableTwoFactor(req, res, next) {
  try {
    const result = await disableTwoFactorForAdmin({
      adminId: req.user.id,
      totpCode: req.body.totp_code,
      recoveryCode: req.body.recovery_code,
    })
    return res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

/**
 * Regenere les recovery codes 2FA (verification TOTP requise).
 * @param {import('express').Request} req Requete authentifiee.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres regeneration.
 */
async function regenerateRecoveryCodes(req, res, next) {
  try {
    const result = await regenerateTwoFactorRecoveryCodes({
      adminId: req.user.id,
      totpCode: req.body.totp_code,
    })
    return res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

/**
 * Retourne l'etat 2FA de l'admin courant.
 * @param {import('express').Request} req Requete authentifiee.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse.
 */
async function twoFactorStatus(req, res, next) {
  try {
    const status = await getTwoFactorStatus(req.user.id)
    return res.json({ data: status })
  } catch (err) {
    next(err)
  }
}

/**
 * Renouvelle un access token a partir du refresh token stocke en cookie.
 * @param {import('express').Request} req Requete contenant `cookies.refresh_token`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi du nouvel access token.
 */
async function refresh(req, res, next) {
  try {
    const { accessToken, refreshToken, user } = await refreshAdminSession(req.cookies.refresh_token)
    res.cookie('refresh_token', refreshToken, getRefreshCookieOptions())
    return res.json({ accessToken, user })
  } catch (err) {
    next(err)
  }
}

/**
 * Deconnecte l'utilisateur et invalide la version refresh token courante.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres deconnexion.
 */
async function logout(req, res, next) {
  try {
    await logoutAdminSession(req.cookies.refresh_token)
    res.clearCookie('refresh_token', getRefreshCookieOptions())
    return res.json({ message: 'Deconnexion reussie.' })
  } catch (err) {
    next(err)
  }
}

/**
 * Retourne le profil de l'utilisateur authentifie (payload JWT access).
 * @param {import('express').Request} req Requete enrichie avec `req.user`.
 * @param {import('express').Response} res Reponse HTTP.
 * @returns {import('express').Response} Reponse JSON contenant l'utilisateur courant.
 */
function me(req, res) {
  return res.json({ user: req.user })
}

module.exports = {
  login,
  verifyTwoFactor,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  regenerateRecoveryCodes,
  twoFactorStatus,
  refresh,
  logout,
  me,
}
