/* Modele Sequelize pour les campagnes newsletter */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const NewsletterCampaign = sequelize.define('NewsletterCampaign', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subject: { type: DataTypes.STRING(200), allowNull: false },
  preheader: { type: DataTypes.STRING(255), allowNull: true }, 
  body_html: { type: DataTypes.TEXT('long'), allowNull: false },

  cta_label: { type: DataTypes.STRING(100), allowNull: true }, 
  cta_url: { type: DataTypes.STRING(500), allowNull: true },   

  articles: { type: DataTypes.JSON, allowNull: true },        

  status: { type: DataTypes.ENUM('draft', 'sent'), defaultValue: 'draft' },
  sent_at: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'newsletter_campaigns',
  timestamps: false,
})

module.exports = NewsletterCampaign
