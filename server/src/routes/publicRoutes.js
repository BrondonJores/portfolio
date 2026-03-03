/* Routes publiques de l'API */
const { Router } = require('express')
const { getAllPublic: getProjects, getBySlug: getProjectBySlug } = require('../controllers/projectController')
const { getAllPublic: getArticles, getBySlug: getArticleBySlug } = require('../controllers/articleController')
const { getAll: getSkills } = require('../controllers/skillController')
const { create: createMessage } = require('../controllers/messageController')
const { getAllPublic: getTestimonials } = require('../controllers/testimonialController')
const { getByArticleId, create: createComment } = require('../controllers/commentController')
const { getAll: getSettingsPublic } = require('../controllers/settingController')
const { validate } = require('../middleware/validateMiddleware')
const { createMessageValidator } = require('../validators/messageValidator')

const router = Router()

router.get('/projects', getProjects)
router.get('/projects/:slug', getProjectBySlug)
router.get('/articles', getArticles)
router.get('/articles/:slug', getArticleBySlug)
router.get('/skills', getSkills)
router.post('/messages', validate(createMessageValidator), createMessage)
router.get('/testimonials', getTestimonials)
router.get('/comments/:articleId', getByArticleId)
router.post('/comments', createComment)
router.get('/settings', getSettingsPublic)

module.exports = router
