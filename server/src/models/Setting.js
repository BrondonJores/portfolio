const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  value: { type: DataTypes.TEXT, allowNull: true },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'settings', timestamps: false })

module.exports = Setting
