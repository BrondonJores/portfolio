const fsLib = require('fs/promises')
const cloudinaryLib = require('../cloudinary')
const { createHttpError } = require('../utils/httpError')

function createUploadService(deps = {}) {
  const fileSystem = deps.fileSystem || fsLib
  const cloudinary = deps.cloudinary || cloudinaryLib
  const logger = deps.logger || console

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