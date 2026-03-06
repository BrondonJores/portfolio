/* Controleur d upload d images */
const fs = require('fs/promises')
const cloudinary = require('../cloudinary')

async function cleanupTempFile(filePath) {
  if (!filePath) {
    return
  }

  try {
    await fs.unlink(filePath)
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      console.error('Impossible de supprimer le fichier temporaire:', err)
    }
  }
}

/**
 * POST /api/upload
 * Recoit un fichier image via Multer et retourne son URL publique Cloudinary.
 */
async function uploadImage(req, res) {
  const tempFilePath = req.file?.path

  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier fourni.' })
  }

  try {
    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: 'portfolio',
    })

    return res.status(201).json({ url: result.secure_url })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Upload echoue.' })
  } finally {
    await cleanupTempFile(tempFilePath)
  }
}

module.exports = { uploadImage }
