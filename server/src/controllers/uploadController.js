/* Controleur d'upload d'images */
const cloudinary = require('../cloudinary')

/**
 * POST /api/upload
 * Reçoit un fichier image via Multer et retourne son URL publique Cloudinary.
 */
async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier fourni.' })
  }

  try {
    // Upload du fichier sur Cloudinary dans le dossier "portfolio"
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'portfolio',
    })

    // Retourne l'URL publique sécurisée
    return res.status(201).json({ url: result.secure_url })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Upload échoué.' })
  }
}

module.exports = { uploadImage }