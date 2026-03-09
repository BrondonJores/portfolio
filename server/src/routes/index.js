/* Registre central des routes de l'application */
const { Router } = require('express')
const authRoutes = require('./authRoutes')
const publicRoutes = require('./publicRoutes')
const adminRoutes = require('./adminRoutes')
const uploadRoutes = require('./uploadRoutes')

const router = Router()

router.use('/auth', authRoutes)      // Routes d'authentification
router.use('/', publicRoutes)        // Routes publiques
router.use('/admin', adminRoutes)    // Routes admin
router.use('/upload', uploadRoutes)  // Routes upload Cloudinary (images, PDF, mascottes)

module.exports = router
