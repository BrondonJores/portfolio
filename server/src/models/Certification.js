/* Modele Sequelize pour les certifications. */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Certification = sequelize.define(
  'Certification',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    issuer: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    issued_at: {
      type: DataTypes.DATEONLY,
    },
    expires_at: {
      type: DataTypes.DATEONLY,
    },
    credential_id: {
      type: DataTypes.STRING(120),
    },
    credential_url: {
      type: DataTypes.STRING(255),
    },
    image_url: {
      type: DataTypes.STRING(255),
    },
    badge_image_url: {
      type: DataTypes.STRING(255),
    },
    pdf_url: {
      type: DataTypes.STRING(255),
    },
    badges: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    published: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'certifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

module.exports = Certification
