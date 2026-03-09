/* Routes publiques de l'API */
const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { getAllPublic: getProjects, getBySlug: getProjectBySlug } = require('../controllers/projectController')
const {
  getAllPublic: getArticles,
  getBySlug: getArticleBySlug,
  likeBySlug: likeArticleBySlug,
  unlikeBySlug: unlikeArticleBySlug,
} = require('../controllers/articleController')
const { getAll: getSkills } = require('../controllers/skillController')
const { getAllPublic: getCertifications } = require('../controllers/certificationController')
const { create: createMessage } = require('../controllers/messageController')
const { getAllPublic: getTestimonials } = require('../controllers/testimonialController')
const { getByArticleId, create: createComment } = require('../controllers/commentController')
const { getPublic: getSettingsPublic } = require('../controllers/settingController')
const { getAllPublic: getThemePresetsPublic } = require('../controllers/themePresetController')
const { getAllPublic: getThemeMarketplacePublic } = require('../controllers/themeMarketplaceController')
const { getAllPublic: getAllCmsPagesPublic, getBySlugPublic: getCmsPageBySlugPublic } = require('../controllers/cmsPageController')
const { subscribe, showUnsubscribeConfirmation, unsubscribe } = require('../controllers/subscriberController')
const { getSitemapXml } = require('../controllers/sitemapController')
const { validate } = require('../middleware/validateMiddleware')
const { createRecaptchaGuard } = require('../middleware/recaptchaMiddleware')
const { createMessageValidator } = require('../validators/messageValidator')
const { subscribeValidator } = require('../validators/subscriberValidator')
const { createCommentValidator } = require('../validators/commentValidator')
const { marketplaceListValidator } = require('../validators/themeMarketplaceValidator')
const { listPublicCmsPagesValidator, cmsPageSlugParamValidator } = require('../validators/cmsPageValidator')

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

const likeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  message: { error: 'Trop de likes envoyes. Reessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const verifyMessageCaptcha = createRecaptchaGuard({ action: 'contact_message' })
const verifyCommentCaptcha = createRecaptchaGuard({ action: 'comment_create' })
const verifySubscribeCaptcha = createRecaptchaGuard({ action: 'newsletter_subscribe' })

router.get('/sitemap.xml', getSitemapXml)
router.get('/projects', getProjects)
router.get('/projects/:slug', getProjectBySlug)
router.get('/articles', getArticles)
router.get('/articles/:slug', getArticleBySlug)
router.post('/articles/:slug/likes', likeLimiter, likeArticleBySlug)
router.delete('/articles/:slug/likes', likeLimiter, unlikeArticleBySlug)
router.get('/skills', getSkills)
router.get('/certifications', getCertifications)
router.post('/messages', messageLimiter, validate(createMessageValidator), verifyMessageCaptcha, createMessage)
router.get('/testimonials', getTestimonials)
router.get('/comments/:articleId', getByArticleId)
router.post('/comments', commentLimiter, validate(createCommentValidator), verifyCommentCaptcha, createComment)
router.get('/settings', getSettingsPublic)
router.get('/theme-presets', getThemePresetsPublic)
router.get('/theme-marketplace', validate(marketplaceListValidator), getThemeMarketplacePublic)
router.get('/pages', validate(listPublicCmsPagesValidator), getAllCmsPagesPublic)
router.get('/pages/:slug', validate(cmsPageSlugParamValidator), getCmsPageBySlugPublic)
router.post('/subscribe', subscribeLimiter, validate(subscribeValidator), verifySubscribeCaptcha, subscribe)
router.get('/unsubscribe/:token', showUnsubscribeConfirmation)
router.post('/unsubscribe/:token', unsubscribe)

module.exports = router
