/* Migration de persistance des brouillons du visual builder admin. */
'use strict'

module.exports = {
  /**
   * Cree la table `visual_builder_drafts` pour stocker les brouillons serveur.
   * @param {import('sequelize').QueryInterface} queryInterface Interface de migration.
   * @param {import('sequelize')} Sequelize Librairie Sequelize.
   * @returns {Promise<void>} Promise resolue apres creation de table.
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visual_builder_drafts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      entity_type: {
        type: Sequelize.ENUM('article', 'project', 'newsletter'),
        allowNull: false,
      },
      channel: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      resource_id: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(160),
        allowNull: false,
        defaultValue: '',
      },
      blocks: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      content_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      created_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updated_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })

    await queryInterface.addConstraint('visual_builder_drafts', {
      type: 'unique',
      name: 'visual_builder_drafts_entity_channel_unique',
      fields: ['entity_type', 'channel'],
    })

    await queryInterface.addIndex('visual_builder_drafts', ['updated_at'])
    await queryInterface.addIndex('visual_builder_drafts', ['resource_id'])
  },

  /**
   * Supprime la table `visual_builder_drafts`.
   * @param {import('sequelize').QueryInterface} queryInterface Interface de migration.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'visual_builder_drafts',
      'visual_builder_drafts_entity_channel_unique'
    )
    await queryInterface.dropTable('visual_builder_drafts')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_visual_builder_drafts_entity_type";')
  },
}
