/* Routes protegees du tableau de bord administrateur */
const { Router } = require('express')
const { getAllAdmin: getProjects, create: createProject, update: updateProject, remove: deleteProject } = require('../controllers/projectController')
const { getAllAdmin: getArticles, create: createArticle, update: updateArticle, remove: deleteArticle } = require('../controllers/articleController')
const { getAll: getSkills, create: createSkill, update: updateSkill, remove: deleteSkill } = require('../controllers/skillController')
const { getAll: getMessages, markAsRead } = require('../controllers/messageController')
const { getAllAdmin: getTestimonials, create: createTestimonial, update: updateTestimonial, remove: deleteTestimonial } = require('../controllers/testimonialController')
const { getAll: getComments, approve: approveComment, remove: deleteComment } = require('../controllers/commentController')
const { getAll: getSettings, upsert: upsertSettings } = require('../controllers/settingController')
const { getStats } = require('../controllers/statsController')
const { getAll: getAllSubscribers, remove: deleteSubscriber } = require('../controllers/subscriberController')
const { getAll: getAllCampaigns, create: createCampaign, update: updateCampaign, remove: deleteCampaign, send: sendCampaign } = require('../controllers/newsletterController')
const { getAll: getAllBlockTemplates, create: createBlockTemplate, update: updateBlockTemplate, remove: deleteBlockTemplate, importMany: importBlockTemplates } = require('../controllers/blockTemplateController')
const { getAll: getAllThemePresets, create: createThemePreset, update: updateThemePreset, remove: deleteThemePreset, apply: applyThemePreset } = require('../controllers/themePresetController')
const { listSecurityEvents, securitySummary } = require('../controllers/securityController')
const { authenticate } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validateMiddleware')
const { createProjectValidator, updateProjectValidator } = require('../validators/projectValidator')
const { createArticleValidator, updateArticleValidator } = require('../validators/articleValidator')
const { createSkillValidator, updateSkillValidator } = require('../validators/skillValidator')
const { listBlockTemplateValidator, createBlockTemplateValidator, updateBlockTemplateValidator, importBlockTemplatesValidator } = require('../validators/blockTemplateValidator')
const { createThemePresetValidator, updateThemePresetValidator } = require('../validators/themePresetValidator')

const router = Router()

/* Toutes les routes admin necessitent une authentification */
router.use(authenticate)

/* Route des statistiques du tableau de bord */
router.get('/stats', getStats)

/* Routes des projets admin */
router.get('/projects', getProjects)
router.post('/projects', validate(createProjectValidator), createProject)
router.put('/projects/:id', validate(updateProjectValidator), updateProject)
router.delete('/projects/:id', deleteProject)

/* Routes des articles admin */
router.get('/articles', getArticles)
router.post('/articles', validate(createArticleValidator), createArticle)
router.put('/articles/:id', validate(updateArticleValidator), updateArticle)
router.delete('/articles/:id', deleteArticle)

/* Routes des competences admin */
router.get('/skills', getSkills)
router.post('/skills', validate(createSkillValidator), createSkill)
router.put('/skills/:id', validate(updateSkillValidator), updateSkill)
router.delete('/skills/:id', deleteSkill)

/* Routes des messages admin */
router.get('/messages', getMessages)
router.put('/messages/:id/read', markAsRead)

/* Routes des temoignages admin */
router.get('/testimonials', getTestimonials)
router.post('/testimonials', createTestimonial)
router.put('/testimonials/:id', updateTestimonial)
router.delete('/testimonials/:id', deleteTestimonial)

/* Routes des commentaires admin */
router.get('/comments', getComments)
router.put('/comments/:id/approve', approveComment)
router.delete('/comments/:id', deleteComment)

/* Routes des parametres admin */
router.get('/settings', getSettings)
router.put('/settings', upsertSettings)

/* Routes securite admin */
router.get('/security/events', listSecurityEvents)
router.get('/security/summary', securitySummary)

/* Routes newsletter admin */
router.get('/newsletter', getAllCampaigns)
router.post('/newsletter', createCampaign)
router.put('/newsletter/:id', updateCampaign)
router.delete('/newsletter/:id', deleteCampaign)
router.post('/newsletter/:id/send', sendCampaign)

/* Routes abonnes admin */
router.get('/subscribers', getAllSubscribers)
router.delete('/subscribers/:id', deleteSubscriber)

/* Routes templates de blocs admin */
router.get('/block-templates', validate(listBlockTemplateValidator), getAllBlockTemplates)
router.post('/block-templates', validate(createBlockTemplateValidator), createBlockTemplate)
router.post('/block-templates/import', validate(importBlockTemplatesValidator), importBlockTemplates)
router.put('/block-templates/:id', validate(updateBlockTemplateValidator), updateBlockTemplate)
router.delete('/block-templates/:id', deleteBlockTemplate)

/* Routes presets de theme admin */
router.get('/theme-presets', getAllThemePresets)
router.post('/theme-presets', validate(createThemePresetValidator), createThemePreset)
router.put('/theme-presets/:id', validate(updateThemePresetValidator), updateThemePreset)
router.delete('/theme-presets/:id', deleteThemePreset)
router.post('/theme-presets/:id/apply', applyThemePreset)

module.exports = router
