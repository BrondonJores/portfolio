/* Point d'entree des modeles Sequelize */
const sequelize = require('../config/database')
const Admin = require('./Admin')
const Project = require('./Project')
const Article = require('./Article')
const Skill = require('./Skill')
const Message = require('./Message')
const Testimonial = require('./Testimonial')
const Comment = require('./Comment')
const Setting = require('./Setting')
const Subscriber = require('./Subscriber')
const NewsletterCampaign = require('./NewsletterCampaign')

module.exports = { sequelize, Admin, Project, Article, Skill, Message, Testimonial, Comment, Setting, Subscriber, NewsletterCampaign }
