/* Routes d'upload d'images. */
const { Router } = require('express')
const multer = require('multer')
const { authenticate } = require('../middleware/authMiddleware')
const { ALLOWED_IMAGE_MIME_TYPES, validateImageUpload } = require('../middleware/uploadValidationMiddleware')
const { uploadImage } = require('../controllers/uploadController')

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

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

/* POST /api/upload : authentification + upload + validation binaire. */
const router = Router()
router.post('/', authenticate, upload.single('image'), validateImageUpload, uploadImage)

module.exports = router

