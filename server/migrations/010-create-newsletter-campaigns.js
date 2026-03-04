'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('newsletter_campaigns', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      subject: { type: Sequelize.STRING(200), allowNull: false },
      preheader: { type: Sequelize.STRING(255), allowNull: true },     
      body_html: { type: Sequelize.TEXT, allowNull: false },

      cta_label: { type: Sequelize.STRING(100), allowNull: true },    
      cta_url: { type: Sequelize.STRING(500), allowNull: true },       

      articles: { type: Sequelize.JSON, allowNull: true },             

      status: { type: Sequelize.ENUM('draft', 'sent'), defaultValue: 'draft' },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('newsletter_campaigns')
  },
}