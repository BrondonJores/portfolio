/* Modele Sequelize pour les competences */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Skill = sequelize.define(
  'Skill',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 80,
      validate: { min: 0, max: 100 },
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'skills',
    timestamps: false,
  }
)

module.exports = Skill
