/* Migration pour la table theme_presets (presets de styles admin). */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('theme_presets', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('theme_presets')
  },
}
