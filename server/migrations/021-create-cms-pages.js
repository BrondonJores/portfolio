/* Migration de la table des pages CMS (draft + publication). */
'use strict'

module.exports = {
  /**
   * Cree la table `cms_pages`.
   * @param {import('sequelize').QueryInterface} queryInterface Interface de migration.
   * @param {import('sequelize')} Sequelize Librairie Sequelize.
   * @returns {Promise<void>} Promise resolue apres creation.
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cms_pages', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      slug: {
        type: Sequelize.STRING(160),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      draft_title: {
        type: Sequelize.STRING(180),
        allowNull: false,
        defaultValue: '',
      },
      draft_layout: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      draft_seo: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      published_title: {
        type: Sequelize.STRING(180),
        allowNull: true,
      },
      published_layout: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      published_seo: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updated_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      published_by_admin_id: {
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

    await queryInterface.addIndex('cms_pages', ['status'])
    await queryInterface.addIndex('cms_pages', ['updated_at'])
  },

  /**
   * Supprime la table `cms_pages`.
   * @param {import('sequelize').QueryInterface} queryInterface Interface de migration.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  async down(queryInterface) {
    await queryInterface.dropTable('cms_pages')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cms_pages_status";')
  },
}
