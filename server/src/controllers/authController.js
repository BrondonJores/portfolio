/* Controleur d'authentification */
const jwt = require('jsonwebtoken')
const { Admin } = require('../models')

/* Generation d'un access token JWT */
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  })
}

/* Generation d'un refresh token JWT */
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  })
}

/* Options du cookie HTTP-only pour le refresh token */
function getRefreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    secure: isProd,                 // obligatoire en prod
    sameSite: isProd ? 'none' : 'lax', 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  }
}
/* Connexion administrateur */
async function login(req, res, next) {
  try {
    const { email, password } = req.body

    /* Recherche de l'admin avec le mot de passe inclus */
    const admin = await Admin.scope('withPassword').findOne({ where: { email } })

    if (!admin) {
      return res.status(401).json({ error: 'Identifiants invalides.' })
    }

    const isValid = await admin.comparePassword(password)
    if (!isValid) {
      return res.status(401).json({ error: 'Identifiants invalides.' })
    }

    const tokenPayload = { id: admin.id, username: admin.username, email: admin.email }
    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    /* Stockage du refresh token en cookie HTTP-only */
    res.cookie('refresh_token', refreshToken, getRefreshCookieOptions())

    return res.json({
      accessToken,
      user: { id: admin.id, username: admin.username, email: admin.email },
    })
  } catch (err) {
    next(err)
  }
}

/* Rafraichissement du token d'acces */
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refresh_token

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token manquant.' })
    }

    let payload
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch {
      return res.status(401).json({ error: 'Refresh token invalide ou expire.' })
    }

    const accessToken = generateAccessToken({
      id: payload.id,
      username: payload.username,
      email: payload.email,
    })

    return res.json({ accessToken })
  } catch (err) {
    next(err)
  }
}

/* Deconnexion : suppression du cookie refresh token */
function logout(req, res) {
  res.clearCookie('refresh_token', getRefreshCookieOptions())
  return res.json({ message: 'Deconnexion reussie.' })
}

/* Retourne les informations de l'administrateur connecte */
function me(req, res) {
  return res.json({ user: req.user })
}

module.exports = { login, refresh, logout, me }
