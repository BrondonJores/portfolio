/* Configuration de la connexion a la base de donnees */
require('dotenv').config()
const { Sequelize } = require('sequelize')

/* Instance Sequelize partagee dans toute l'application */
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgre',
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
