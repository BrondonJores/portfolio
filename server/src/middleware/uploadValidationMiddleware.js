/* Middleware de validation d'images : MIME annonce + signature binaire (magic bytes). */
const { createHttpError } = require('../utils/httpError')

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/**
 * Verifie qu'un buffer commence par une signature hexadecimale.
 * @param {Buffer} buffer Buffer binaire a verifier.
 * @param {number[]} signature Signature attendue.
 * @returns {boolean} true si la signature correspond.
 */
function startsWithSignature(buffer, signature) {
  if (!Buffer.isBuffer(buffer) || buffer.length < signature.length) {
    return false
  }

  for (let index = 0; index < signature.length; index += 1) {
    if (buffer[index] !== signature[index]) {
      return false
    }
  }

  return true
}

/**
 * Detecte le vrai type MIME image a partir du contenu binaire.
 * @param {Buffer} buffer Buffer image.
 * @returns {string | null} MIME detecte ou null si inconnu/invalide.
 */
function detectMimeFromMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null
  }

  if (startsWithSignature(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg'
  }

  if (startsWithSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png'
  }

  if (
    startsWithSignature(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithSignature(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return 'image/gif'
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }

  return null
}

/**
 * Valide un upload image Multer contre la liste blanche de formats autorises.
 * @param {import('express').Request} req Requete contenant `file`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware suivant.
 * @returns {void}
 */
function validateImageUpload(req, res, next) {
  const file = req.file

  if (!file) {
    next(createHttpError(400, 'Aucun fichier fourni.'))
    return
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    next(createHttpError(400, 'Type de fichier non autorise. Utilisez jpg, png, webp ou gif.'))
    return
  }

  const detectedMime = detectMimeFromMagicBytes(file.buffer)
  if (!detectedMime) {
    next(createHttpError(400, 'Le fichier envoye n est pas une image valide.'))
    return
  }

  if (detectedMime !== file.mimetype) {
    next(createHttpError(400, 'Le type MIME annonce ne correspond pas au contenu du fichier.'))
    return
  }

  next()
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  detectMimeFromMagicBytes,
  validateImageUpload,
}

