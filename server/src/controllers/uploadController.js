const { uploadImage: uploadImageFile } = require('../services/uploadService')

async function uploadImage(req, res, next) {
  try {
    const result = await uploadImageFile(req.file)
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadImage }