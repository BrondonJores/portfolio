/* Ajoute la taxonomie structuree aux projets (option A). */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('projects')
    if (!table.taxonomy) {
      await queryInterface.addColumn('projects', 'taxonomy', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      })
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('projects')
    if (table.taxonomy) {
      await queryInterface.removeColumn('projects', 'taxonomy')
    }
  },
}
