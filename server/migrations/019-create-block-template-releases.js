/* Migration pour l'historique de releases des templates de blocs. */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('block_template_releases', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      block_template_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'block_templates',
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

    await queryInterface.addConstraint('block_template_releases', {
      type: 'unique',
      name: 'block_template_releases_template_version_unique',
      fields: ['block_template_id', 'version_number'],
    })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'block_template_releases',
      'block_template_releases_template_version_unique'
    )
    await queryInterface.dropTable('block_template_releases')
  },
}
