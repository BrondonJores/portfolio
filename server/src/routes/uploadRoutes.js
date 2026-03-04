/* Routes d'upload d'images */
const { Router } = require('express')
const multer = require('multer')
const { authenticate } = require('../middleware/authMiddleware')
const { uploadImage } = require('../controllers/uploadController')

/* Types MIME autorises */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/* Configuration Multer : stockage temporaire avant upload Cloudinary */
const storage = multer.diskStorage({
  destination: 'tmp', // dossier temporaire pour Multer (sera supprimé après Cloudinary)
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
  },
})

/* Filtrage par type MIME */
function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Type de fichier non autorisé. Utilisez jpg, png, webp ou gif.'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

/* POST /api/upload : Authentification requise + Multer */
const router = Router()
router.post('/', authenticate, upload.single('image'), uploadImage)

module.exports = router