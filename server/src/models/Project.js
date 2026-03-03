/* Modele Sequelize pour les projets */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Project = sequelize.define(
  'Project',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    content: {
      type: DataTypes.TEXT('long'),
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    github_url: {
      type: DataTypes.STRING(255),
    },
    demo_url: {
      type: DataTypes.STRING(255),
    },
    image_url: {
      type: DataTypes.STRING(255),
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    published: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'projects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

module.exports = Project
