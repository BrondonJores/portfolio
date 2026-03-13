/* Modele Sequelize pour les administrateurs */
const { DataTypes } = require('sequelize')
const bcrypt = require('bcryptjs')
const sequelize = require('../config/database')

const Admin = sequelize.define(
  'Admin',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    refresh_token_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    session_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    two_factor_secret_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    two_factor_recovery_codes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    defaultScope: {
      /* Les donnees sensibles ne sont jamais incluses par defaut */
      attributes: { exclude: ['password_hash', 'two_factor_secret_encrypted', 'two_factor_recovery_codes'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password_hash'] },
      },
      withTwoFactorSecrets: {
        attributes: { include: ['two_factor_secret_encrypted', 'two_factor_recovery_codes'] },
      },
    },
  }
)

/* Hachage du mot de passe avant la creation */
Admin.addHook('beforeCreate', async (admin) => {
  if (admin.password_hash) {
    admin.password_hash = await bcrypt.hash(admin.password_hash, 12)
  }
})

/* Comparaison du mot de passe en clair avec le hash stocke */
Admin.prototype.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password_hash)
}

module.exports = Admin
