/* Migration pour la creation de la table articles */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('articles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(200),
        unique: true,
      },
      excerpt: {
        type: Sequelize.TEXT,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      cover_image: {
        type: Sequelize.STRING(255),
      },
      likes: {
        type: Sequelize.INTEGER,
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      published: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
    await queryInterface.dropTable('articles')
  },
}
