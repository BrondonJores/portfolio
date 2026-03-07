const {
  loginAdmin,
  refreshAccessToken,
  getRefreshCookieOptions,
} = require('../services/authService')

async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await loginAdmin(req.body)

    res.cookie('refresh_token', refreshToken, getRefreshCookieOptions())
    return res.json({ accessToken, user })
  } catch (err) {
    next(err)
  }
}

async function refresh(req, res, next) {
  try {
    const result = refreshAccessToken(req.cookies.refresh_token)
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

function logout(req, res) {
  res.clearCookie('refresh_token', getRefreshCookieOptions())
  return res.json({ message: 'Deconnexion reussie.' })
}

function me(req, res) {
  return res.json({ user: req.user })
}

module.exports = { login, refresh, logout, me }