/* Modele Sequelize pour les versions historisees des templates de blocs. */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const BlockTemplateRelease = sequelize.define(
  'BlockTemplateRelease',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    block_template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    change_note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: 'block_template_releases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['block_template_id', 'version_number'],
      },
      {
        fields: ['block_template_id'],
      },
    ],
  }
)

module.exports = BlockTemplateRelease
