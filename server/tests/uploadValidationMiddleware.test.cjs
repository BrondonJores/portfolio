/* Tests unitaires du middleware de validation d'upload image. */
const assert = require('node:assert/strict')
const {
  detectMimeFromMagicBytes,
  validateImageUpload,
} = require('../src/middleware/uploadValidationMiddleware')

let failures = 0

/**
 * Execute un cas de test.
 * @param {string} name Nom du cas.
 * @param {Function} callback Scenario.
 * @returns {void}
 */
function runCase(name, callback) {
  try {
    callback()
    console.log(`PASS - ${name}`)
  } catch (err) {
    failures += 1
    console.error(`FAIL - ${name}`)
    console.error(err.stack || err.message || err)
  }
}

/**
 * Execute le middleware upload et retourne l'erreur eventuelle.
 * @param {object} req Requete fake.
 * @returns {Error|null} Erreur retournee a `next`, sinon null.
 */
function runUploadValidation(req) {
  let capturedError = null

  validateImageUpload(req, {}, (err) => {
    capturedError = err || null
  })

  return capturedError
}

runCase('detectMimeFromMagicBytes detects jpeg signature', () => {
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  assert.equal(detectMimeFromMagicBytes(jpegBuffer), 'image/jpeg')
})

runCase('detectMimeFromMagicBytes returns null on non image payload', () => {
  const randomBuffer = Buffer.from('not-an-image')
  assert.equal(detectMimeFromMagicBytes(randomBuffer), null)
})

runCase('validateImageUpload rejects MIME/content mismatch', () => {
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  const err = runUploadValidation({
    file: {
      mimetype: 'image/png',
      buffer: jpegBuffer,
    },
  })

  assert.ok(err)
  assert.equal(err.statusCode, 400)
})

runCase('validateImageUpload accepts valid png', () => {
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03, 0x04])
  const err = runUploadValidation({
    file: {
      mimetype: 'image/png',
      buffer: pngBuffer,
    },
  })

  assert.equal(err, null)
})

if (failures > 0) {
  console.error(`\nUnit tests failed: ${failures}`)
  process.exit(1)
}

console.log('\nUnit tests passed.')

