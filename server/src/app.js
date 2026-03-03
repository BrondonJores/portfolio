/* Application Express principale */
require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const routes = require('./routes')
const { errorHandler } = require('./middleware/errorMiddleware')

const app = express()

/* En-tetes de securite HTTP */
app.use(helmet())

/* Configuration CORS restrictive */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
)

/* Parseur de cookies pour les tokens HTTP-only */
app.use(cookieParser())

/* Parseur JSON limite a 10 Mo */
app.use(express.json({ limit: '10mb' }))

/* Journalisation HTTP en developpement */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

/* Rate limiter global : 100 requetes par 15 minutes */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requetes. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

/* Montage des routes sur /api */
app.use('/api', routes)

/* Middleware de gestion des erreurs globales */
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Serveur demarre sur le port ${PORT}`)
})

module.exports = app
