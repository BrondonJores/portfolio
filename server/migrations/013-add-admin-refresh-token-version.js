/* Ajout de la colonne de rotation des refresh tokens admin. */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admins', 'refresh_token_version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admins', 'refresh_token_version')
  },
}

