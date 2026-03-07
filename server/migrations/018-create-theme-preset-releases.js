/* Migration pour l'historique de releases des presets de theme. */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('theme_preset_releases', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      theme_preset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'theme_presets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      change_note: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      snapshot: {
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

    await queryInterface.addConstraint('theme_preset_releases', {
      type: 'unique',
      name: 'theme_preset_releases_preset_version_unique',
      fields: ['theme_preset_id', 'version_number'],
    })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'theme_preset_releases',
      'theme_preset_releases_preset_version_unique'
    )
    await queryInterface.dropTable('theme_preset_releases')
  },
}
