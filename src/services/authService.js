/* Service d'authentification administrateur */
import { api } from './api.js'

const AUTH_REQUEST_OPTIONS = Object.freeze({ skipAuthRefresh: true })

export const login = (email, password) => api.post('/auth/login', { email, password }, AUTH_REQUEST_OPTIONS)
export const verifyTwoFactor = ({ mfaToken, totpCode, recoveryCode }) =>
  api.post('/auth/verify-2fa', {
    mfa_token: mfaToken,
    ...(totpCode ? { totp_code: totpCode } : {}),
    ...(recoveryCode ? { recovery_code: recoveryCode } : {}),
  }, AUTH_REQUEST_OPTIONS)
export const logout = () => api.post('/auth/logout', undefined, AUTH_REQUEST_OPTIONS)
export const refresh = () => api.post('/auth/refresh', undefined, AUTH_REQUEST_OPTIONS)
export const getMe = () => api.get('/auth/me')
export const getTwoFactorStatus = () => api.get('/auth/2fa/status')
export const createTwoFactorSetup = () => api.post('/auth/2fa/setup', {})
export const enableTwoFactor = ({ setupToken, totpCode }) =>
  api.post('/auth/2fa/enable', {
    setup_token: setupToken,
    totp_code: totpCode,
  })
export const disableTwoFactor = ({ totpCode, recoveryCode }) =>
  api.post('/auth/2fa/disable', {
    ...(totpCode ? { totp_code: totpCode } : {}),
    ...(recoveryCode ? { recovery_code: recoveryCode } : {}),
  })
export const regenerateTwoFactorRecoveryCodes = ({ totpCode }) =>
  api.post('/auth/2fa/recovery-codes', {
    totp_code: totpCode,
  })
