/* Migration pour la creation de la table certifications. */
'use strict'

module.exports = {
  /**
   * Cree la table certifications avec champs metier + media.
   * @param {import('sequelize').QueryInterface} queryInterface Interface query Sequelize.
   * @param {import('sequelize')} Sequelize Librairie Sequelize.
   * @returns {Promise<void>} Promise resolue apres creation.
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('certifications', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      issuer: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      issued_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      credential_id: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      credential_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      badge_image_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      pdf_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      badges: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      published: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
  },

  /**
   * Supprime la table certifications.
   * @param {import('sequelize').QueryInterface} queryInterface Interface query Sequelize.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  async down(queryInterface) {
    await queryInterface.dropTable('certifications')
  },
}
