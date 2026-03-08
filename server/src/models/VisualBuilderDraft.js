/* Modele Sequelize pour les brouillons persistants du visual builder admin. */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const VisualBuilderDraft = sequelize.define(
  'VisualBuilderDraft',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    entity_type: {
      type: DataTypes.ENUM('article', 'project', 'newsletter'),
      allowNull: false,
    },
    channel: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    resource_id: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
      defaultValue: '',
    },
    blocks: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    content_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    created_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'visual_builder_drafts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['entity_type', 'channel'],
      },
      {
        fields: ['updated_at'],
      },
      {
        fields: ['resource_id'],
      },
    ],
  }
)

module.exports = VisualBuilderDraft
