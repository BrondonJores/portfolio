require('dotenv').config()

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const dbSslEnabled = parseBooleanEnv(process.env.DB_SSL, process.env.NODE_ENV === 'production')
const dbSslRejectUnauthorized = parseBooleanEnv(process.env.DB_SSL_REJECT_UNAUTHORIZED, false)

const sharedConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
}

if (dbSslEnabled) {
  sharedConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: dbSslRejectUnauthorized,
    },
  }
}

module.exports = {
  development: { ...sharedConfig },
  test: { ...sharedConfig },
  production: { ...sharedConfig },
}
