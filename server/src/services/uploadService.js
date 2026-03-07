/* Service metier upload : regles applicatives et acces donnees. */
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

  /**
   * Upload un buffer image vers Cloudinary via upload stream.
   * @param {Buffer} buffer Buffer image en memoire.
   * @returns {Promise<object>} Reponse brute Cloudinary.
   */
  function uploadBufferToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'portfolio', resource_type: 'image' },
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
        result = await uploadBufferToCloudinary(file.buffer)
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

  return { uploadImage }
}

module.exports = {
  createUploadService,
  ...createUploadService(),
}
