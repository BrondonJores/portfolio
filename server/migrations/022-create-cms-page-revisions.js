/* Migration de l'historique des revisions des pages CMS. */
'use strict'

module.exports = {
  /**
   * Cree la table `cms_page_revisions`.
   * @param {import('sequelize').QueryInterface} queryInterface Interface de migration.
   * @param {import('sequelize')} Sequelize Librairie Sequelize.
   * @returns {Promise<void>} Promise resolue apres creation.
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cms_page_revisions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      page_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cms_pages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      stage: {
        type: Sequelize.ENUM('draft', 'published', 'rollback'),
        allowNull: false,
        defaultValue: 'draft',
      },
      change_note: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      snapshot: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })

    await queryInterface.addConstraint('cms_page_revisions', {
      type: 'unique',
      name: 'cms_page_revisions_page_version_unique',
      fields: ['page_id', 'version_number'],
    })

    await queryInterface.addIndex('cms_page_revisions', ['page_id'])
    await queryInterface.addIndex('cms_page_revisions', ['created_at'])
  },

  /**
   * Supprime la table `cms_page_revisions`.
   * @param {import('sequelize').QueryInterface} queryInterface Interface de migration.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'cms_page_revisions',
      'cms_page_revisions_page_version_unique'
    )
    await queryInterface.dropTable('cms_page_revisions')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cms_page_revisions_stage";')
  },
}
