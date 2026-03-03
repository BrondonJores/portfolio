/* Point d'entree des modeles Sequelize */
const sequelize = require('../config/database')
const Admin = require('./Admin')
const Project = require('./Project')
const Article = require('./Article')
const Skill = require('./Skill')
const Message = require('./Message')
const Testimonial = require('./Testimonial')

module.exports = { sequelize, Admin, Project, Article, Skill, Message, Testimonial }
