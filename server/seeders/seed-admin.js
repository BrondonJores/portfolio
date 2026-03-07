/* Seeder pour la creation de l'administrateur initial. */
'use strict'

require('dotenv').config()
const bcrypt = require('bcryptjs')

/**
 * Verifie qu'un email ressemble a une adresse valide.
 * @param {string} email Email a verifier.
 * @returns {boolean} true si le format est acceptable.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

/**
 * Verifie la robustesse minimale du mot de passe admin.
 * Regles: >= 14 chars, majuscule, minuscule, chiffre, caractere special.
 * @param {string} password Mot de passe brut.
 * @returns {boolean} true si le mot de passe est suffisamment robuste.
 */
function isStrongPassword(password) {
  const value = String(password || '')
  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{14,}$/
  return strongPasswordPattern.test(value)
}

/**
 * Lit et valide les identifiants admin depuis l'environnement.
 * @returns {{email:string,password:string,username:string}} Credentials valides.
 * @throws {Error} Erreur explicite si la configuration est invalide.
 */
function getAdminCredentialsFromEnv() {
  const email = String(process.env.ADMIN_EMAIL || '').trim()
  const password = String(process.env.ADMIN_PASSWORD || '')
  const username = String(process.env.ADMIN_USERNAME || 'admin').trim()

  if (!email) {
    throw new Error('ADMIN_EMAIL manquant. Definis une adresse admin explicite avant le seed.')
  }

  if (!isValidEmail(email)) {
    throw new Error('ADMIN_EMAIL invalide.')
  }

  if (!password) {
    throw new Error('ADMIN_PASSWORD manquant. Definis un mot de passe fort avant le seed.')
  }

  if (!isStrongPassword(password)) {
    throw new Error(
      'ADMIN_PASSWORD trop faible: minimum 14 caracteres avec majuscule, minuscule, chiffre et special.'
    )
  }

  if (!username) {
    throw new Error('ADMIN_USERNAME invalide.')
  }

  return { email, password, username }
}

module.exports = {
  /**
   * Cree l'admin initial avec credentials obligatoires provenant de l'environnement.
   * @param {import('sequelize').QueryInterface} queryInterface Interface de migration Sequelize.
   * @returns {Promise<void>} Promise resolue une fois l'insert termine.
   */
  async up(queryInterface) {
    const { email, password, username } = getAdminCredentialsFromEnv()
    const passwordHash = await bcrypt.hash(password, 12)

    await queryInterface.bulkInsert('admins', [
      {
        username,
        email,
        password_hash: passwordHash,
        created_at: new Date(),
      },
    ])
  },

  /**
   * Supprime l'admin seed correspondant a ADMIN_EMAIL.
   * @param {import('sequelize').QueryInterface} queryInterface Interface de migration Sequelize.
   * @returns {Promise<void>} Promise resolue apres suppression ciblee.
   */
  async down(queryInterface) {
    const email = String(process.env.ADMIN_EMAIL || '').trim()
    if (!email) {
      return
    }

    await queryInterface.bulkDelete('admins', { email }, {})
  },
}

