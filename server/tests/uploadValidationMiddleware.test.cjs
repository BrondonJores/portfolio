/* Tests unitaires du middleware de validation d'uploads. */
const assert = require('node:assert/strict')
const {
  detectImageMimeFromMagicBytes,
  detectPdfMimeFromMagicBytes,
  detectVideoMimeFromMagicBytes,
  validateDocumentUpload,
  validateImageUpload,
  validateMascotUpload,
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

/**
 * Execute le middleware mascotte et retourne l'erreur eventuelle.
 * @param {object} req Requete fake.
 * @returns {Error|null} Erreur retournee a `next`, sinon null.
 */
function runMascotUploadValidation(req) {
  let capturedError = null

  validateMascotUpload(req, {}, (err) => {
    capturedError = err || null
  })

  return capturedError
}

/**
 * Execute le middleware document et retourne l'erreur eventuelle.
 * @param {object} req Requete fake.
 * @returns {Error|null} Erreur retournee a `next`, sinon null.
 */
function runDocumentUploadValidation(req) {
  let capturedError = null

  validateDocumentUpload(req, {}, (err) => {
    capturedError = err || null
  })

  return capturedError
}

runCase('detectImageMimeFromMagicBytes detects jpeg signature', () => {
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  assert.equal(detectImageMimeFromMagicBytes(jpegBuffer), 'image/jpeg')
})

runCase('detectImageMimeFromMagicBytes returns null on non image payload', () => {
  const randomBuffer = Buffer.from('not-an-image')
  assert.equal(detectImageMimeFromMagicBytes(randomBuffer), null)
})

runCase('detectVideoMimeFromMagicBytes detects webm signature', () => {
  const webmBuffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81])
  assert.equal(detectVideoMimeFromMagicBytes(webmBuffer), 'video/webm')
})

runCase('detectPdfMimeFromMagicBytes detects pdf signature', () => {
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
  assert.equal(detectPdfMimeFromMagicBytes(pdfBuffer), 'application/pdf')
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

runCase('validateDocumentUpload accepts valid pdf', () => {
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3])
  const err = runDocumentUploadValidation({
    file: {
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    },
  })

  assert.equal(err, null)
})

runCase('validateDocumentUpload rejects invalid pdf payload', () => {
  const fakeBuffer = Buffer.from('not-a-pdf')
  const err = runDocumentUploadValidation({
    file: {
      mimetype: 'application/pdf',
      size: fakeBuffer.length,
      buffer: fakeBuffer,
    },
  })

  assert.ok(err)
  assert.equal(err.statusCode, 400)
})

runCase('validateMascotUpload accepts lottie json payload', () => {
  const lottieJson = Buffer.from(JSON.stringify({
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 60,
    layers: [],
  }), 'utf8')

  const err = runMascotUploadValidation({
    file: {
      mimetype: 'application/json',
      originalname: 'hero.json',
      size: lottieJson.length,
      buffer: lottieJson,
    },
  })

  assert.equal(err, null)
})

runCase('validateMascotUpload rejects invalid lottie json structure', () => {
  const notLottie = Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8')

  const err = runMascotUploadValidation({
    file: {
      mimetype: 'application/json',
      originalname: 'hero.json',
      size: notLottie.length,
      buffer: notLottie,
    },
  })

  assert.ok(err)
  assert.equal(err.statusCode, 400)
})

runCase('validateMascotUpload rejects dotlottie extension', () => {
  const dotLottieBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00])
  const err = runMascotUploadValidation({
    file: {
      mimetype: 'application/zip',
      originalname: 'guide.lottie',
      size: dotLottieBuffer.length,
      buffer: dotLottieBuffer,
    },
  })

  assert.ok(err)
  assert.equal(err.statusCode, 400)
})

runCase('validateMascotUpload accepts webm buffer', () => {
  const webmBuffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x00, 0x00, 0x00, 0x00])

  const err = runMascotUploadValidation({
    file: {
      mimetype: 'video/webm',
      originalname: 'walk.webm',
      size: webmBuffer.length,
      buffer: webmBuffer,
    },
  })

  assert.equal(err, null)
})

runCase('validateMascotUpload accepts binary riv payload', () => {
  const rivBuffer = Buffer.alloc(96, 0x8b)

  const err = runMascotUploadValidation({
    file: {
      mimetype: 'application/octet-stream',
      originalname: 'helper.riv',
      size: rivBuffer.length,
      buffer: rivBuffer,
    },
  })

  assert.equal(err, null)
})

runCase('validateMascotUpload rejects extension/mime mismatch', () => {
  const rivBuffer = Buffer.alloc(96, 0x8b)

  const err = runMascotUploadValidation({
    file: {
      mimetype: 'video/webm',
      originalname: 'helper.riv',
      size: rivBuffer.length,
      buffer: rivBuffer,
    },
  })

  assert.ok(err)
  assert.equal(err.statusCode, 400)
})

if (failures > 0) {
  console.error(`\nUnit tests failed: ${failures}`)
  process.exit(1)
}

console.log('\nUnit tests passed.')
