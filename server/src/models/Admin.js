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
  },
  {
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    defaultScope: {
      /* Le mot de passe n'est jamais inclus par defaut dans les reponses */
      attributes: { exclude: ['password_hash'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password_hash'] },
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
