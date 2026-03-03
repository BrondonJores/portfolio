'use strict'
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comments', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      article_id: { type: Sequelize.INTEGER, allowNull: false },
      author_name: { type: Sequelize.STRING(100), allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      approved: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('comments')
  },
}
