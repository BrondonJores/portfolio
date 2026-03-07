/* Migration pour la creation de la table block_templates. */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('block_templates', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      context: {
        type: Sequelize.ENUM('article', 'project', 'newsletter', 'all'),
        allowNull: false,
        defaultValue: 'all',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      blocks: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
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
    await queryInterface.dropTable('block_templates')

    /* Nettoyage explicite du type ENUM PostgreSQL si necessaire. */
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_block_templates_context";')
    } catch {
      /* Ignore si le dialecte ne supporte pas DROP TYPE. */
    }
  },
}
