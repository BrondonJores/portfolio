/* Registre central des routes de l'application */
const { Router } = require('express')
const authRoutes = require('./authRoutes')
const publicRoutes = require('./publicRoutes')
const adminRoutes = require('./adminRoutes')

const router = Router()

router.use('/auth', authRoutes)
router.use('/', publicRoutes)
router.use('/admin', adminRoutes)

module.exports = router
