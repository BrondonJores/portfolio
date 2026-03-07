/* Modele Sequelize pour les versions historisees des presets de theme. */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const ThemePresetRelease = sequelize.define(
  'ThemePresetRelease',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    theme_preset_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    change_note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: 'theme_preset_releases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['theme_preset_id', 'version_number'],
      },
      {
        fields: ['theme_preset_id'],
      },
    ],
  }
)

module.exports = ThemePresetRelease
