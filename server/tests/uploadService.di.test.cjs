/* Test unitaire DI : validation de l'URL retournee par uploadService pour les assets raw. */
const assert = require('node:assert/strict')

const { createUploadService } = require('../src/services/uploadService')

let failures = 0

/**
 * Execute un test asynchrone avec journalisation uniforme.
 * @param {string} name Nom du test.
 * @param {Function} callback Scenario asynchrone.
 * @returns {Promise<void>} Promise resolue apres execution.
 */
async function runCase(name, callback) {
  try {
    await callback()
    console.log(`PASS - ${name}`)
  } catch (err) {
    failures += 1
    console.error(`FAIL - ${name}`)
    console.error(err.stack || err.message || err)
  }
}

/**
 * Cree un SDK Cloudinary minimal mocke pour les tests DI.
 * @param {{secure_url:string,resource_type?:string,format?:string}} result Reponse simulee.
 * @returns {{uploader:{upload_stream:Function,upload:Function}}} Fake SDK.
 */
function createCloudinaryMock(result) {
  return {
    uploader: {
      upload_stream: (_options, callback) => ({
        end: () => callback(null, result),
      }),
      upload: async () => result,
    },
  }
}

/**
 * Point d'entree du fichier de tests DI.
 * @returns {Promise<void>} Promise resolue si tous les tests passent.
 */
async function main() {
  await runCase('uploadImage appends extension when Cloudinary URL has no suffix', async () => {
    const service = createUploadService({
      cloudinary: createCloudinaryMock({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/portfolio/cover-no-ext',
        resource_type: 'image',
        format: 'webp',
      }),
      logger: { error: () => {} },
    })

    const result = await service.uploadImage({
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      originalname: 'cover.png',
    })

    assert.equal(result.url.endsWith('.webp'), true)
  })

  await runCase('uploadMascotAsset keeps Cloudinary raw URL when no extension is provided', async () => {
    const service = createUploadService({
      cloudinary: createCloudinaryMock({
        secure_url: 'https://res.cloudinary.com/demo/raw/upload/v1/portfolio/mascots/code-dark',
        resource_type: 'raw',
        format: 'json',
      }),
      logger: { error: () => {} },
    })

    const result = await service.uploadMascotAsset({
      buffer: Buffer.from('{"v":"5.7.3"}'),
      originalname: 'code-dark.json',
    })

    assert.equal(result.url, 'https://res.cloudinary.com/demo/raw/upload/v1/portfolio/mascots/code-dark')
    assert.equal(result.format, 'json')
  })

  await runCase('uploadMascotAsset keeps Cloudinary raw URL for .riv when no extension is provided', async () => {
    const service = createUploadService({
      cloudinary: createCloudinaryMock({
        secure_url: 'https://res.cloudinary.com/demo/raw/upload/v1/portfolio/mascots/character-idle',
        resource_type: 'raw',
        format: 'riv',
      }),
      logger: { error: () => {} },
    })

    const result = await service.uploadMascotAsset({
      buffer: Buffer.from([0x52, 0x49, 0x56]),
      originalname: 'character-idle.riv',
    })

    assert.equal(result.url, 'https://res.cloudinary.com/demo/raw/upload/v1/portfolio/mascots/character-idle')
    assert.equal(result.format, 'riv')
  })

  await runCase('uploadMascotAsset keeps extension when URL already has one', async () => {
    const service = createUploadService({
      cloudinary: createCloudinaryMock({
        secure_url: 'https://res.cloudinary.com/demo/raw/upload/v1/portfolio/mascots/code-dark.json',
        resource_type: 'raw',
        format: 'json',
      }),
      logger: { error: () => {} },
    })

    const result = await service.uploadMascotAsset({
      buffer: Buffer.from('{"v":"5.7.3"}'),
      originalname: 'code-dark.json',
    })

    assert.equal(result.url, 'https://res.cloudinary.com/demo/raw/upload/v1/portfolio/mascots/code-dark.json')
  })

  await runCase('uploadMascotAsset keeps non-raw URLs unchanged', async () => {
    const service = createUploadService({
      cloudinary: createCloudinaryMock({
        secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/portfolio/mascots/loop.webm',
        resource_type: 'video',
        format: 'webm',
      }),
      logger: { error: () => {} },
    })

    const result = await service.uploadMascotAsset({
      buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
      originalname: 'loop.webm',
    })

    assert.equal(result.url, 'https://res.cloudinary.com/demo/video/upload/v1/portfolio/mascots/loop.webm')
    assert.equal(result.format, 'webm')
  })

  await runCase('uploadDocument appends .pdf when Cloudinary raw URL has no extension', async () => {
    const service = createUploadService({
      cloudinary: createCloudinaryMock({
        secure_url: 'https://res.cloudinary.com/demo/raw/upload/v1/portfolio/documents/certificat',
        resource_type: 'raw',
        format: 'pdf',
      }),
      logger: { error: () => {} },
    })

    const result = await service.uploadDocument({
      buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
      originalname: 'certificat.pdf',
    })

    assert.equal(result.url.endsWith('.pdf'), true)
    assert.equal(result.format, 'pdf')
  })

  await runCase('uploadDocument uploads with Cloudinary resource_type=image', async () => {
    let capturedOptions = null
    const cloudinary = {
      uploader: {
        upload_stream: (options, callback) => {
          capturedOptions = options
          return {
            end: () =>
              callback(null, {
                secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/portfolio/documents/certificat.pdf',
                resource_type: 'image',
                format: 'pdf',
              }),
          }
        },
        upload: async () => ({
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/portfolio/documents/certificat.pdf',
          resource_type: 'image',
          format: 'pdf',
        }),
      },
    }

    const service = createUploadService({
      cloudinary,
      logger: { error: () => {} },
    })

    await service.uploadDocument({
      buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
      originalname: 'certificat.pdf',
    })

    assert.equal(capturedOptions.resource_type, 'image')
  })

  if (failures > 0) {
    console.error(`\nDI unit tests failed: ${failures}`)
    process.exit(1)
  }

  console.log('\nDI unit tests passed.')
}

main().catch((err) => {
  console.error(err.stack || err.message || err)
  process.exit(1)
})
