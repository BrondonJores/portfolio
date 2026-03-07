/* Routes publiques de l'API */
const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { getAllPublic: getProjects, getBySlug: getProjectBySlug } = require('../controllers/projectController')
const { getAllPublic: getArticles, getBySlug: getArticleBySlug } = require('../controllers/articleController')
const { getAll: getSkills } = require('../controllers/skillController')
const { create: createMessage } = require('../controllers/messageController')
const { getAllPublic: getTestimonials } = require('../controllers/testimonialController')
const { getByArticleId, create: createComment } = require('../controllers/commentController')
const { getAll: getSettingsPublic } = require('../controllers/settingController')
const { getAllPublic: getThemePresetsPublic } = require('../controllers/themePresetController')
const { subscribe, unsubscribe } = require('../controllers/subscriberController')
const { validate } = require('../middleware/validateMiddleware')
const { createMessageValidator } = require('../validators/messageValidator')
const { subscribeValidator } = require('../validators/subscriberValidator')
const { createCommentValidator } = require('../validators/commentValidator')

const router = Router()

const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: { error: 'Trop de commentaires envoyes. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Trop de tentatives d'abonnement. Reessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
})

const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Trop de messages envoyes. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.get('/projects', getProjects)
router.get('/projects/:slug', getProjectBySlug)
router.get('/articles', getArticles)
router.get('/articles/:slug', getArticleBySlug)
router.get('/skills', getSkills)
router.post('/messages', messageLimiter, validate(createMessageValidator), createMessage)
router.get('/testimonials', getTestimonials)
router.get('/comments/:articleId', getByArticleId)
router.post('/comments', commentLimiter, validate(createCommentValidator), createComment)
router.get('/settings', getSettingsPublic)
router.get('/theme-presets', getThemePresetsPublic)
router.post('/subscribe', subscribeLimiter, validate(subscribeValidator), subscribe)
router.get('/unsubscribe/:token', unsubscribe)

module.exports = router
