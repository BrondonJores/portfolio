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
const { authenticate } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validateMiddleware')
const { createProjectValidator, updateProjectValidator } = require('../validators/projectValidator')
const { createArticleValidator, updateArticleValidator } = require('../validators/articleValidator')
const { createSkillValidator, updateSkillValidator } = require('../validators/skillValidator')

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

module.exports = router
