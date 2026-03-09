/* Service metier upload : regles applicatives et acces donnees. */
const path = require('path')
const cloudinaryLib = require('../cloudinary')
const { createHttpError } = require('../utils/httpError')

/**
 * Construit le service upload avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.cloudinary] SDK cloudinary.
 * @param {object} [deps.logger] Logger cible.
 * @returns {{uploadImage: Function}} API upload.
 */
function createUploadService(deps = {}) {
  const cloudinary = deps.cloudinary || cloudinaryLib
  const logger = deps.logger || console
  const ALLOWED_MASCOT_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'webm', 'mp4', 'json', 'riv'])
  const RAW_MASCOT_FORMATS = new Set(['json', 'riv'])
  const ALLOWED_DOCUMENT_FORMATS = new Set(['pdf'])

  /**
   * Derive un identifiant Cloudinary securise depuis un nom de fichier.
   * @param {string} originalName Nom original du fichier.
   * @returns {string} Identifiant nettoye.
   */
  function sanitizePublicIdFromFilename(originalName) {
    const filename = path.parse(String(originalName || 'mascot')).name
    const normalized = filename
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)

    return normalized || `mascot-${Date.now()}`
  }

  /**
   * Extrait l'extension normalisee d'un nom de fichier.
   * @param {string} originalName Nom original.
   * @returns {string} Extension en minuscule sans point.
   */
  function extractExtension(originalName) {
    return path.extname(String(originalName || '')).replace('.', '').toLowerCase()
  }

  /**
   * Upload un buffer image vers Cloudinary via upload stream.
   * @param {Buffer} buffer Buffer image en memoire.
   * @param {object} [options={}] Options Cloudinary.
   * @returns {Promise<object>} Reponse brute Cloudinary.
   */
  function uploadBufferToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (err, result) => {
          if (err) {
            reject(err)
            return
          }
          resolve(result)
        }
      )

      stream.end(buffer)
    })
  }

  /**
   * Upload une image vers Cloudinary.
   * Supporte en priorite les fichiers en memoire (Multer memoryStorage).
   * @param {{buffer?:Buffer,path?:string}|undefined} file Objet `req.file` fourni par Multer.
   * @returns {Promise<{url:string}>} URL publique Cloudinary.
   * @throws {Error} Erreur 400 si fichier absent, 500 si upload impossible.
   */
  async function uploadImage(file) {
    if (!file) {
      throw createHttpError(400, 'Aucun fichier fourni.')
    }

    try {
      let result

      if (Buffer.isBuffer(file.buffer)) {
        result = await uploadBufferToCloudinary(file.buffer, {
          folder: 'portfolio',
          resource_type: 'image',
        })
      } else if (file.path) {
        result = await cloudinary.uploader.upload(file.path, {
          folder: 'portfolio',
          resource_type: 'image',
        })
      } else {
        throw createHttpError(400, 'Fichier invalide.')
      }

      return { url: result.secure_url }
    } catch (err) {
      if (err?.statusCode) {
        throw err
      }
      logger.error(err)
      throw createHttpError(500, 'Upload echoue.')
    }
  }

  /**
   * Upload un asset mascotte (image/video/lottie-json/rive) vers Cloudinary.
   * @param {{buffer?:Buffer,path?:string,originalname?:string}|undefined} file Fichier Multer.
   * @returns {Promise<{url:string,resourceType:string,format:string}>} Meta upload utile au front.
   */
  async function uploadMascotAsset(file) {
    if (!file) {
      throw createHttpError(400, 'Aucun fichier fourni.')
    }

    const extension = extractExtension(file.originalname)
    if (!ALLOWED_MASCOT_FORMATS.has(extension)) {
      throw createHttpError(400, 'Format mascotte non autorise.')
    }

    const resourceType = RAW_MASCOT_FORMATS.has(extension) ? 'raw' : 'auto'
    const uploadOptions = {
      folder: 'portfolio/mascots',
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      public_id: sanitizePublicIdFromFilename(file.originalname),
    }

    try {
      let result

      if (Buffer.isBuffer(file.buffer)) {
        result = await uploadBufferToCloudinary(file.buffer, uploadOptions)
      } else if (file.path) {
        result = await cloudinary.uploader.upload(file.path, uploadOptions)
      } else {
        throw createHttpError(400, 'Fichier invalide.')
      }

      return {
        url: result.secure_url,
        resourceType: result.resource_type || '',
        format: result.format || extension,
      }
    } catch (err) {
      if (err?.statusCode) {
        throw err
      }
      logger.error(err)
      throw createHttpError(500, 'Upload mascotte echoue.')
    }
  }

  /**
   * Upload un document PDF vers Cloudinary (resource raw).
   * @param {{buffer?:Buffer,path?:string,originalname?:string}|undefined} file Fichier Multer.
   * @returns {Promise<{url:string,resourceType:string,format:string}>} Meta upload utile au front.
   */
  async function uploadDocument(file) {
    if (!file) {
      throw createHttpError(400, 'Aucun fichier fourni.')
    }

    const extension = extractExtension(file.originalname)
    if (!ALLOWED_DOCUMENT_FORMATS.has(extension)) {
      throw createHttpError(400, 'Format document non autorise.')
    }

    const uploadOptions = {
      folder: 'portfolio/documents',
      resource_type: 'raw',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      public_id: sanitizePublicIdFromFilename(file.originalname),
    }

    try {
      let result

      if (Buffer.isBuffer(file.buffer)) {
        result = await uploadBufferToCloudinary(file.buffer, uploadOptions)
      } else if (file.path) {
        result = await cloudinary.uploader.upload(file.path, uploadOptions)
      } else {
        throw createHttpError(400, 'Fichier invalide.')
      }

      return {
        url: result.secure_url,
        resourceType: result.resource_type || 'raw',
        format: result.format || extension,
      }
    } catch (err) {
      if (err?.statusCode) {
        throw err
      }
      logger.error(err)
      throw createHttpError(500, 'Upload document echoue.')
    }
  }

  return { uploadImage, uploadMascotAsset, uploadDocument }
}

module.exports = {
  createUploadService,
  ...createUploadService(),
}
