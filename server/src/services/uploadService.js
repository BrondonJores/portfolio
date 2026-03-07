/* Service metier upload : regles applicatives et acces donnees. */
const fsLib = require('fs/promises')
const cloudinaryLib = require('../cloudinary')
const { createHttpError } = require('../utils/httpError')

/**
 * Construit le service upload avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.fileSystem] API filesystem.
 * @param {object} [deps.cloudinary] SDK cloudinary.
 * @param {object} [deps.logger] Logger cible.
 * @returns {{uploadImage: Function}} API upload.
 */
function createUploadService(deps = {}) {
  const fileSystem = deps.fileSystem || fsLib
  const cloudinary = deps.cloudinary || cloudinaryLib
  const logger = deps.logger || console

  /**
   * Supprime un fichier temporaire et ignore proprement ENOENT.
   * @param {string|undefined} filePath Chemin du fichier temporaire.
   * @returns {Promise<void>} Promise resolue apres tentative de nettoyage.
   */
  async function cleanupTempFile(filePath) {
    if (!filePath) {
      return
    }

    try {
      await fileSystem.unlink(filePath)
    } catch (err) {
      if (err?.code !== 'ENOENT') {
        logger.error('Impossible de supprimer le fichier temporaire:', err)
      }
    }
  }

  /**
   * Upload une image vers Cloudinary puis nettoie le fichier temporaire local.
   * @param {{path:string}|undefined} file Objet `req.file` fourni par Multer.
   * @returns {Promise<{url:string}>} URL publique Cloudinary.
   * @throws {Error} Erreur 400 si fichier absent, 500 si upload impossible.
   */
  async function uploadImage(file) {
    if (!file) {
      throw createHttpError(400, 'Aucun fichier fourni.')
    }

    const tempFilePath = file.path

    try {
      const result = await cloudinary.uploader.upload(tempFilePath, {
        folder: 'portfolio',
      })

      return { url: result.secure_url }
    } catch (err) {
      logger.error(err)
      throw createHttpError(500, 'Upload echoue.')
    } finally {
      await cleanupTempFile(tempFilePath)
    }
  }

  return { uploadImage }
}

module.exports = {
  createUploadService,
  ...createUploadService(),
}
