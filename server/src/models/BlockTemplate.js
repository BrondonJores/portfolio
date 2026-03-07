/* Modele Sequelize pour les templates de blocs reutilisables dans l'admin. */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const BlockTemplate = sequelize.define(
  'BlockTemplate',
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
    context: {
      type: DataTypes.ENUM('article', 'project', 'newsletter', 'all'),
      allowNull: false,
      defaultValue: 'all',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    blocks: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: 'block_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

module.exports = BlockTemplate
