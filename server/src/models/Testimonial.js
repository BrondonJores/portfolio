/* Modele Sequelize pour les temoignages */
const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Testimonial = sequelize.define(
  'Testimonial',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    author_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    author_role: {
      type: DataTypes.STRING(100),
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'testimonials',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
)

module.exports = Testimonial
