/* Modele Sequelize pour les articles de blog */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Article = sequelize.define(
  'Article',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(200),
      unique: true,
    },
    excerpt: {
      type: DataTypes.TEXT,
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    cover_image: {
      type: DataTypes.STRING(255),
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'articles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

module.exports = Article
