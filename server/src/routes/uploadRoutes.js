/* Routes d'upload de medias admin (images + mascottes). */
const { Router } = require('express')
const multer = require('multer')
const { authenticate } = require('../middleware/authMiddleware')
const {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MASCOT_MIME_TYPES,
  MAX_MASCOT_UPLOAD_BYTES,
  validateImageUpload,
  validateMascotUpload,
} = require('../middleware/uploadValidationMiddleware')
const { uploadImage, uploadMascot } = require('../controllers/uploadController')

/**
 * Filtre rapide Multer sur le MIME annonce.
 * La validation finale se fait dans `validateImageUpload` avec magic bytes.
 * @param {import('express').Request} _req Requete HTTP.
 * @param {Express.Multer.File} file Fichier courant.
 * @param {Function} cb Callback Multer.
 * @returns {void}
 */
function fileFilter(_req, file, cb) {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(null, true)
    return
  }

  cb(new Error('Type de fichier non autorise. Utilisez jpg, png, webp ou gif.'))
}

/**
 * Filtre Multer pour les assets mascottes.
 * @param {import('express').Request} _req Requete HTTP.
 * @param {Express.Multer.File} file Fichier courant.
 * @param {Function} cb Callback Multer.
 * @returns {void}
 */
function mascotFileFilter(_req, file, cb) {
  if (ALLOWED_MASCOT_MIME_TYPES.has(file.mimetype)) {
    cb(null, true)
    return
  }

  cb(new Error('Type de fichier non autorise pour une mascotte.'))
}

const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

const mascotUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: mascotFileFilter,
  limits: { fileSize: MAX_MASCOT_UPLOAD_BYTES },
})

/* POST /api/upload : authentification + upload image + validation binaire. */
const router = Router()
router.post('/', authenticate, imageUpload.single('image'), validateImageUpload, uploadImage)

/* POST /api/upload/mascot : upload des assets animables (gif/webm/json/lottie/riv...). */
router.post('/mascot', authenticate, mascotUpload.single('asset'), validateMascotUpload, uploadMascot)

module.exports = router
