'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('newsletter_subscribers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      confirmed: { type: Sequelize.BOOLEAN, defaultValue: true },
      unsubscribe_token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('newsletter_subscribers')
  },
}
