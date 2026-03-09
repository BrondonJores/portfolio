/* Routes d'upload de medias admin (images, PDF et mascottes). */
const { Router } = require('express')
const multer = require('multer')
const path = require('path')
const { authenticate } = require('../middleware/authMiddleware')
const { createHttpError } = require('../utils/httpError')
const {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_MASCOT_MIME_TYPES,
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_MASCOT_UPLOAD_BYTES,
  validateImageUpload,
  validateDocumentUpload,
  validateMascotUpload,
} = require('../middleware/uploadValidationMiddleware')
const { uploadImage, uploadMascot, uploadDocument } = require('../controllers/uploadController')
const ALLOWED_MASCOT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'webm', 'mp4', 'json', 'riv'])
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['pdf'])

/**
 * Extrait l'extension normalisee d'un nom de fichier.
 * @param {string} originalName Nom original.
 * @returns {string} Extension sans point en minuscule.
 */
function getExtension(originalName) {
  return path.extname(String(originalName || '')).replace('.', '').toLowerCase()
}

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

  cb(createHttpError(400, 'Type de fichier non autorise. Utilisez jpg, png, webp ou gif.'))
}

/**
 * Filtre Multer pour les assets mascottes.
 * @param {import('express').Request} _req Requete HTTP.
 * @param {Express.Multer.File} file Fichier courant.
 * @param {Function} cb Callback Multer.
 * @returns {void}
 */
function mascotFileFilter(_req, file, cb) {
  const extension = getExtension(file?.originalname)
  if (ALLOWED_MASCOT_MIME_TYPES.has(file.mimetype) || ALLOWED_MASCOT_EXTENSIONS.has(extension)) {
    cb(null, true)
    return
  }

  cb(createHttpError(400, 'Type de fichier non autorise pour une mascotte.'))
}

/**
 * Filtre Multer pour les documents PDF.
 * @param {import('express').Request} _req Requete HTTP.
 * @param {Express.Multer.File} file Fichier courant.
 * @param {Function} cb Callback Multer.
 * @returns {void}
 */
function documentFileFilter(_req, file, cb) {
  const extension = getExtension(file?.originalname)
  if (ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype) || ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    cb(null, true)
    return
  }

  cb(createHttpError(400, 'Type de document non autorise. Utilisez uniquement un PDF.'))
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

const documentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_DOCUMENT_UPLOAD_BYTES },
})

/* POST /api/upload : authentification + upload image + validation binaire. */
const router = Router()
router.post('/', authenticate, imageUpload.single('image'), validateImageUpload, uploadImage)

/* POST /api/upload/mascot : upload des assets animables (gif/webm/json/riv...). */
router.post('/mascot', authenticate, mascotUpload.single('asset'), validateMascotUpload, uploadMascot)
router.post('/document', authenticate, documentUpload.single('document'), validateDocumentUpload, uploadDocument)

module.exports = router
