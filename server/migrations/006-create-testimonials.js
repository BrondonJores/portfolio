/* Migration pour la creation de la table testimonials */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('testimonials', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      author_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      author_role: {
        type: Sequelize.STRING(100),
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      visible: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('testimonials')
  },
}
