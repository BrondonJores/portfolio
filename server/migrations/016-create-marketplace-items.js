/* Migration pour la table marketplace_items (themes/templates persistes). */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('marketplace_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      type: {
        type: Sequelize.ENUM('theme', 'template'),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      short_description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      style: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      author: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      featured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      source: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'official',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addConstraint('marketplace_items', {
      type: 'unique',
      name: 'marketplace_items_type_slug_unique',
      fields: ['type', 'slug'],
    })
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('marketplace_items', 'marketplace_items_type_slug_unique')
    await queryInterface.dropTable('marketplace_items')

    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketplace_items_type";')
    } catch {
      /* Ignore si le dialecte ne supporte pas DROP TYPE. */
    }
  },
}
