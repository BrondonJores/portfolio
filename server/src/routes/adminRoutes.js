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
const {
  getAll: getAllBlockTemplates,
  create: createBlockTemplate,
  update: updateBlockTemplate,
  remove: deleteBlockTemplate,
  importMany: importBlockTemplates,
  listReleases: listBlockTemplateReleases,
  rollback: rollbackBlockTemplate,
  exportPackage: exportBlockTemplatePackage,
  importPackage: importBlockTemplatePackage,
} = require('../controllers/blockTemplateController')
const {
  getAll: getAllThemePresets,
  create: createThemePreset,
  update: updateThemePreset,
  remove: deleteThemePreset,
  apply: applyThemePreset,
  listReleases: listThemePresetReleases,
  rollback: rollbackThemePreset,
  exportPackage: exportThemePresetPackage,
  importPackage: importThemePresetPackage,
} = require('../controllers/themePresetController')
const { getAllAdmin: getThemeMarketplaceAdmin, importFromMarketplace: importThemeFromMarketplace } = require('../controllers/themeMarketplaceController')
const { listSecurityEvents, securitySummary } = require('../controllers/securityController')
const {
  getCurrent: getCurrentVisualBuilderDraft,
  upsertCurrent: upsertCurrentVisualBuilderDraft,
  removeCurrent: deleteCurrentVisualBuilderDraft,
} = require('../controllers/visualBuilderDraftController')
const {
  getAllAdmin: getAllCmsPagesAdmin,
  getByIdAdmin: getCmsPageByIdAdmin,
  create: createCmsPage,
  update: updateCmsPage,
  publish: publishCmsPage,
  unpublish: unpublishCmsPage,
  remove: deleteCmsPage,
  listRevisions: listCmsPageRevisions,
  rollback: rollbackCmsPage,
} = require('../controllers/cmsPageController')
const { authenticate } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validateMiddleware')
const { createProjectValidator, updateProjectValidator } = require('../validators/projectValidator')
const { createArticleValidator, updateArticleValidator } = require('../validators/articleValidator')
const { createSkillValidator, updateSkillValidator } = require('../validators/skillValidator')
const {
  blockTemplateIdParamValidator,
  listBlockTemplateValidator,
  createBlockTemplateValidator,
  updateBlockTemplateValidator,
  importBlockTemplatesValidator,
  rollbackBlockTemplateValidator,
  importBlockTemplatePackageValidator,
} = require('../validators/blockTemplateValidator')
const {
  themePresetIdParamValidator,
  createThemePresetValidator,
  updateThemePresetValidator,
  rollbackThemePresetValidator,
  importThemePresetPackageValidator,
} = require('../validators/themePresetValidator')
const { marketplaceListValidator, importThemeMarketplaceValidator } = require('../validators/themeMarketplaceValidator')
const {
  currentVisualBuilderDraftQueryValidator,
  upsertVisualBuilderDraftValidator,
} = require('../validators/visualBuilderDraftValidator')
const {
  cmsPageIdParamValidator,
  listAdminCmsPagesValidator,
  createCmsPageValidator,
  updateCmsPageValidator,
  publishCmsPageValidator,
  rollbackCmsPageValidator,
} = require('../validators/cmsPageValidator')

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

/* Routes persistance visual builder admin */
router.get(
  '/visual-builder/current',
  validate(currentVisualBuilderDraftQueryValidator),
  getCurrentVisualBuilderDraft
)
router.put(
  '/visual-builder/current',
  validate(upsertVisualBuilderDraftValidator),
  upsertCurrentVisualBuilderDraft
)
router.delete(
  '/visual-builder/current',
  validate(currentVisualBuilderDraftQueryValidator),
  deleteCurrentVisualBuilderDraft
)

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
router.post('/block-templates/import-package', validate(importBlockTemplatePackageValidator), importBlockTemplatePackage)
router.put('/block-templates/:id', validate(updateBlockTemplateValidator), updateBlockTemplate)
router.delete('/block-templates/:id', validate(blockTemplateIdParamValidator), deleteBlockTemplate)
router.get('/block-templates/:id/releases', validate(blockTemplateIdParamValidator), listBlockTemplateReleases)
router.post('/block-templates/:id/rollback', validate(rollbackBlockTemplateValidator), rollbackBlockTemplate)
router.get('/block-templates/:id/export-package', validate(blockTemplateIdParamValidator), exportBlockTemplatePackage)

/* Routes presets de theme admin */
router.get('/theme-presets', getAllThemePresets)
router.post('/theme-presets', validate(createThemePresetValidator), createThemePreset)
router.put('/theme-presets/:id', validate(updateThemePresetValidator), updateThemePreset)
router.delete('/theme-presets/:id', validate(themePresetIdParamValidator), deleteThemePreset)
router.post('/theme-presets/:id/apply', validate(themePresetIdParamValidator), applyThemePreset)
router.get('/theme-presets/:id/releases', validate(themePresetIdParamValidator), listThemePresetReleases)
router.post('/theme-presets/:id/rollback', validate(rollbackThemePresetValidator), rollbackThemePreset)
router.get('/theme-presets/:id/export-package', validate(themePresetIdParamValidator), exportThemePresetPackage)
router.post('/theme-presets/import-package', validate(importThemePresetPackageValidator), importThemePresetPackage)
router.get('/theme-marketplace', validate(marketplaceListValidator), getThemeMarketplaceAdmin)
router.post('/theme-marketplace/:slug/import', validate(importThemeMarketplaceValidator), importThemeFromMarketplace)

/* Routes pages CMS admin */
router.get('/pages', validate(listAdminCmsPagesValidator), getAllCmsPagesAdmin)
router.get('/pages/:id', validate(cmsPageIdParamValidator), getCmsPageByIdAdmin)
router.post('/pages', validate(createCmsPageValidator), createCmsPage)
router.put('/pages/:id', validate(updateCmsPageValidator), updateCmsPage)
router.post('/pages/:id/publish', validate(publishCmsPageValidator), publishCmsPage)
router.post('/pages/:id/unpublish', validate(cmsPageIdParamValidator), unpublishCmsPage)
router.delete('/pages/:id', validate(cmsPageIdParamValidator), deleteCmsPage)
router.get('/pages/:id/revisions', validate(cmsPageIdParamValidator), listCmsPageRevisions)
router.post('/pages/:id/rollback', validate(rollbackCmsPageValidator), rollbackCmsPage)

module.exports = router
