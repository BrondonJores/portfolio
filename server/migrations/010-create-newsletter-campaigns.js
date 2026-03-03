'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('newsletter_campaigns', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      subject: { type: Sequelize.STRING(200), allowNull: false },
      body_html: { type: Sequelize.TEXT('long'), allowNull: false },
      status: { type: Sequelize.ENUM('draft', 'sent'), defaultValue: 'draft' },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('newsletter_campaigns')
  },
}
