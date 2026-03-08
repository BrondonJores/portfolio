/* Modele Sequelize pour l'historique des revisions des pages CMS. */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const CmsPageRevision = sequelize.define(
  'CmsPageRevision',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    page_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stage: {
      type: DataTypes.ENUM('draft', 'published', 'rollback'),
      allowNull: false,
      defaultValue: 'draft',
    },
    change_note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    created_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'cms_page_revisions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['page_id', 'version_number'],
      },
      {
        fields: ['page_id'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
)

module.exports = CmsPageRevision
