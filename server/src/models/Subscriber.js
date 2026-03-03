/* Modele Sequelize pour les abonnes a la newsletter */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Subscriber = sequelize.define('Subscriber', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  confirmed: { type: DataTypes.BOOLEAN, defaultValue: true },
  unsubscribe_token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'newsletter_subscribers',
  timestamps: false,
})

module.exports = Subscriber
