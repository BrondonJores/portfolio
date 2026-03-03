/* Modele Sequelize pour les campagnes newsletter */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const NewsletterCampaign = sequelize.define('NewsletterCampaign', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subject: { type: DataTypes.STRING(200), allowNull: false },
  body_html: { type: DataTypes.TEXT('long'), allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'sent'), defaultValue: 'draft' },
  sent_at: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'newsletter_campaigns',
  timestamps: false,
})

module.exports = NewsletterCampaign
