/* Middleware de validation d'uploads : images et assets mascottes. */
const path = require('path')
const { createHttpError } = require('../utils/httpError')

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const ALLOWED_MASCOT_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'webm',
  'mp4',
  'json',
  'lottie',
  'riv',
])

const MASCOT_EXTENSION_MIME_MAP = {
  jpg: new Set(['image/jpeg']),
  jpeg: new Set(['image/jpeg']),
  png: new Set(['image/png']),
  webp: new Set(['image/webp']),
  gif: new Set(['image/gif']),
  webm: new Set(['video/webm', 'application/octet-stream']),
  mp4: new Set(['video/mp4', 'application/mp4']),
  json: new Set(['application/json', 'text/json', 'text/plain', 'application/octet-stream']),
  lottie: new Set([
    'application/zip',
    'application/octet-stream',
    'application/x-zip-compressed',
    'application/x-lottie',
    'application/vnd.lottie+json',
  ]),
  riv: new Set(['application/octet-stream', 'application/riv', 'application/x-riv', 'application/x-rive']),
}

const ALLOWED_MASCOT_MIME_TYPES = new Set(
  Object.values(MASCOT_EXTENSION_MIME_MAP).flatMap((values) => Array.from(values))
)

const MAX_MASCOT_UPLOAD_BYTES = 12 * 1024 * 1024
const LOTTIE_SHAPE_HINT_KEYS = new Set(['v', 'layers', 'assets', 'ip', 'op', 'fr'])

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
 * Retourne l'extension normalisee d'un nom de fichier.
 * @param {string} originalName Nom original du fichier.
 * @returns {string} Extension en minuscule, sans point.
 */
function getExtension(originalName) {
  if (typeof originalName !== 'string' || !originalName.trim()) {
    return ''
  }
  return path.extname(originalName).replace('.', '').toLowerCase()
}

/**
 * Detecte le vrai type MIME image a partir du contenu binaire.
 * @param {Buffer} buffer Buffer image.
 * @returns {string | null} MIME detecte ou null si inconnu/invalide.
 */
function detectImageMimeFromMagicBytes(buffer) {
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
 * Detecte le vrai type MIME video supporte (webm/mp4) via magic bytes.
 * @param {Buffer} buffer Buffer binaire.
 * @returns {string | null} MIME video detecte ou null.
 */
function detectVideoMimeFromMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null
  }

  if (startsWithSignature(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    return 'video/webm'
  }

  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    return 'video/mp4'
  }

  return null
}

/**
 * Verifie qu'un JSON ressemble a une animation Lottie.
 * @param {Buffer} buffer Contenu JSON brut.
 * @returns {boolean} true si la structure ressemble a une animation Lottie.
 */
function isLikelyLottieJson(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return false
  }

  try {
    const parsed = JSON.parse(buffer.toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false
    }

    const keys = Object.keys(parsed)
    return keys.some((key) => LOTTIE_SHAPE_HINT_KEYS.has(key))
  } catch {
    return false
  }
}

/**
 * Valide qu'un buffer binaire ressemble a un fichier Rive (.riv).
 * Ici on applique des garde-fous pragmatiques: taille minimale, donnees binaires
 * et exclusion de faux positifs (image/video/json).
 * @param {Buffer} buffer Buffer brut.
 * @returns {boolean} true si le fichier semble etre un .riv exploitable.
 */
function isLikelyRiveBinary(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 64) {
    return false
  }

  if (detectImageMimeFromMagicBytes(buffer) || detectVideoMimeFromMagicBytes(buffer)) {
    return false
  }

  const firstByte = buffer[0]
  if (firstByte === 0x7b || firstByte === 0x5b) {
    return false
  }

  return true
}

/**
 * Verifie qu'un fichier .lottie ressemble a une archive zip valide.
 * @param {Buffer} buffer Buffer brut.
 * @returns {boolean} true si la signature ZIP est detectee.
 */
function isLikelyDotLottieArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return false
  }

  return startsWithSignature(buffer, [0x50, 0x4b, 0x03, 0x04])
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

  const detectedMime = detectImageMimeFromMagicBytes(file.buffer)
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

/**
 * Valide un upload de mascotte (image/video/lottie/rive).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware suivant.
 * @returns {void}
 */
function validateMascotUpload(req, res, next) {
  const file = req.file
  if (!file) {
    next(createHttpError(400, 'Aucun fichier fourni.'))
    return
  }

  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    next(createHttpError(400, 'Le fichier envoye est vide ou invalide.'))
    return
  }

  if (file.size > MAX_MASCOT_UPLOAD_BYTES) {
    next(createHttpError(400, 'Fichier trop volumineux. Taille max: 12 Mo.'))
    return
  }

  const extension = getExtension(file.originalname)
  if (!ALLOWED_MASCOT_EXTENSIONS.has(extension)) {
    next(createHttpError(400, 'Extension non autorisee. Formats: gif, webp, png, jpg, webm, mp4, json, lottie, riv.'))
    return
  }

  const normalizedMime = String(file.mimetype || '').toLowerCase()
  if (!ALLOWED_MASCOT_MIME_TYPES.has(normalizedMime)) {
    next(createHttpError(400, 'Type MIME non autorise pour ce type de fichier.'))
    return
  }

  const allowedMimesForExtension = MASCOT_EXTENSION_MIME_MAP[extension]
  if (!allowedMimesForExtension.has(normalizedMime)) {
    next(createHttpError(400, 'Le type MIME ne correspond pas a l extension du fichier.'))
    return
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    const imageMime = detectImageMimeFromMagicBytes(file.buffer)
    if (!imageMime) {
      next(createHttpError(400, 'Image mascotte invalide (signature binaire incorrecte).'))
      return
    }
    const canonical = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`
    if (imageMime !== canonical && !(extension === 'jpeg' && imageMime === 'image/jpeg')) {
      next(createHttpError(400, 'Le contenu binaire de l image ne correspond pas a son extension.'))
      return
    }
  }

  if (['webm', 'mp4'].includes(extension)) {
    const videoMime = detectVideoMimeFromMagicBytes(file.buffer)
    const expected = extension === 'webm' ? 'video/webm' : 'video/mp4'
    if (videoMime !== expected) {
      next(createHttpError(400, 'Le contenu video ne correspond pas a son extension.'))
      return
    }
  }

  if (extension === 'json' && !isLikelyLottieJson(file.buffer)) {
    next(createHttpError(400, 'Le fichier JSON ne ressemble pas a une animation Lottie valide.'))
    return
  }

  if (extension === 'lottie' && !isLikelyDotLottieArchive(file.buffer)) {
    next(createHttpError(400, 'Le fichier .lottie doit etre une archive valide.'))
    return
  }

  if (extension === 'riv' && !isLikelyRiveBinary(file.buffer)) {
    next(createHttpError(400, 'Le fichier .riv semble invalide ou corrompu.'))
    return
  }

  next()
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MASCOT_MIME_TYPES,
  MAX_MASCOT_UPLOAD_BYTES,
  detectImageMimeFromMagicBytes,
  detectVideoMimeFromMagicBytes,
  validateImageUpload,
  validateMascotUpload,
}
