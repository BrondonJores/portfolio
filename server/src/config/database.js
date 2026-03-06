/* Configuration de la connexion a la base de donnees */
require('dotenv').config()
const { Sequelize } = require('sequelize')

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const dbSslEnabled = parseBooleanEnv(process.env.DB_SSL, process.env.NODE_ENV === 'production')
const dbSslRejectUnauthorized = parseBooleanEnv(process.env.DB_SSL_REJECT_UNAUTHORIZED, false)

const dialectOptions = dbSslEnabled
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: dbSslRejectUnauthorized,
      },
    }
  : undefined

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    ...(dialectOptions ? { dialectOptions } : {}),
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
)

module.exports = sequelize
