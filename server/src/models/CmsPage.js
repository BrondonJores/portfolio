/* Modele Sequelize pour les pages CMS (draft + publication). */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const CmsPage = sequelize.define(
  'CmsPage',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
    },
    draft_title: {
      type: DataTypes.STRING(180),
      allowNull: false,
      defaultValue: '',
    },
    draft_layout: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    draft_seo: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    published_title: {
      type: DataTypes.STRING(180),
      allowNull: true,
    },
    published_layout: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    published_seo: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    published_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'cms_pages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['updated_at'],
      },
    ],
  }
)

module.exports = CmsPage
