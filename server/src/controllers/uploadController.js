/* Controleur d'upload d'images */
const path = require('path')

/**
 * POST /api/upload
 * Reçoit un fichier image via Multer et retourne son URL publique.
 */
function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier fourni.' })
  }

  const url = `/uploads/${req.file.filename}`
  return res.status(201).json({ url })
}

module.exports = { uploadImage }
