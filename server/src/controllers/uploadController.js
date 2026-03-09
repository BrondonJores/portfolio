/* Controleur HTTP upload : delegue le metier au service associe. */
const {
  uploadImage: uploadImageFile,
  uploadMascotAsset: uploadMascotAssetFile,
  uploadDocument: uploadDocumentFile,
} = require('../services/uploadService')

/**
 * Recoit un fichier image via Multer puis delegue l'upload au service.
 * @param {import('express').Request} req Requete contenant `file`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de l'URL upload.
 */
async function uploadImage(req, res, next) {
  try {
    const result = await uploadImageFile(req.file)
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Recoit un asset mascotte (gif/webm/json/riv...) via Multer puis delegue l'upload.
 * @param {import('express').Request} req Requete contenant `file`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de l'URL upload.
 */
async function uploadMascot(req, res, next) {
  try {
    const result = await uploadMascotAssetFile(req.file)
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Recoit un document PDF via Multer puis delegue l'upload au service.
 * @param {import('express').Request} req Requete contenant `file`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi de l'URL upload.
 */
async function uploadDocument(req, res, next) {
  try {
    const result = await uploadDocumentFile(req.file)
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadImage, uploadMascot, uploadDocument }
