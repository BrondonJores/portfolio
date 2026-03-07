const jwtLib = require('jsonwebtoken')
const { Admin } = require('../models')
const { createHttpError } = require('../utils/httpError')

function createAuthService(deps = {}) {
  const adminModel = deps.adminModel || Admin
  const jwt = deps.jwt || jwtLib
  const env = deps.env || process.env

  function generateAccessToken(payload) {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES || '15m',
    })
  }

  function generateRefreshToken(payload) {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES || '7d',
    })
  }

  function getRefreshCookieOptions() {
    const isProd = env.NODE_ENV === 'production'

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    }
  }

  function toPublicUser(admin) {
    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
    }
  }

  async function loginAdmin({ email, password }) {
    const admin = await adminModel.scope('withPassword').findOne({ where: { email } })

    if (!admin) {
      throw createHttpError(401, 'Identifiants invalides.')
    }

    const isValid = await admin.comparePassword(password)
    if (!isValid) {
      throw createHttpError(401, 'Identifiants invalides.')
    }

    const user = toPublicUser(admin)
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    return { user, accessToken, refreshToken }
  }

  function refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw createHttpError(401, 'Refresh token manquant.')
    }

    let payload
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET)
    } catch {
      throw createHttpError(401, 'Refresh token invalide ou expire.')
    }

    const accessToken = generateAccessToken({
      id: payload.id,
      username: payload.username,
      email: payload.email,
    })

    return { accessToken }
  }

  return {
    loginAdmin,
    refreshAccessToken,
    getRefreshCookieOptions,
  }
}

module.exports = {
  createAuthService,
  ...createAuthService(),
}