/* Modele Sequelize pour les items marketplace persistes en base. */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const MarketplaceItem = sequelize.define(
  'MarketplaceItem',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('theme', 'template'),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    short_description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    style: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    author: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    source: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'official',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'marketplace_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['type', 'slug'],
      },
      {
        fields: ['type', 'is_active'],
      },
    ],
  }
)

module.exports = MarketplaceItem
