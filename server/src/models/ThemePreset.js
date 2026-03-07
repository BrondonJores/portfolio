/* Modele Sequelize des presets de theme applicables depuis l'admin. */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const ThemePreset = sequelize.define(
  'ThemePreset',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: 'theme_presets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

module.exports = ThemePreset
