/* Modele Sequelize pour les evenements de securite (audit/intrusion). */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const SecurityEvent = sequelize.define(
  'SecurityEvent',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    event_type: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    severity: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'info',
    },
    source: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'server',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    request_path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    http_method: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    origin: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'security_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
)

module.exports = SecurityEvent
