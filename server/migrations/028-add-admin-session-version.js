/* Ajout de la colonne de version de session admin (access tokens). */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admins', 'session_version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admins', 'session_version')
  },
}
