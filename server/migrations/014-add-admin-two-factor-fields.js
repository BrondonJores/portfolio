/* Ajout des colonnes 2FA TOTP pour les administrateurs. */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admins', 'two_factor_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })

    await queryInterface.addColumn('admins', 'two_factor_secret_encrypted', {
      type: Sequelize.TEXT,
      allowNull: true,
    })

    await queryInterface.addColumn('admins', 'two_factor_recovery_codes', {
      type: Sequelize.TEXT,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admins', 'two_factor_recovery_codes')
    await queryInterface.removeColumn('admins', 'two_factor_secret_encrypted')
    await queryInterface.removeColumn('admins', 'two_factor_enabled')
  },
}

