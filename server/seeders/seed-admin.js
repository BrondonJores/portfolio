/* Seeder pour la creation de l'administrateur initial */
'use strict'

require('dotenv').config()
const bcrypt = require('bcryptjs')

module.exports = {
  async up(queryInterface) {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!'

    const passwordHash = await bcrypt.hash(password, 12)

    await queryInterface.bulkInsert('admins', [
      {
        username: 'admin',
        email,
        password_hash: passwordHash,
        created_at: new Date(),
      },
    ])

    console.log(`Administrateur cree avec l'email : ${email}`)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('admins', null, {})
  },
}
