/* Runner de tests backend robuste et cross-shell. */
const { spawn } = require('node:child_process')
const path = require('node:path')

const TEST_FILES = [
  'mailerService.test.cjs',
  'authService.di.test.cjs',
  'authController.test.cjs',
  'authMiddleware.test.cjs',
  'rateLimitSecurityMiddleware.test.cjs',
  'totpService.di.test.cjs',
  'twoFactorService.di.test.cjs',
  'recaptchaService.di.test.cjs',
  'uploadValidationMiddleware.test.cjs',
  'uploadService.di.test.cjs',
  'settingService.di.test.cjs',
  'animationSettingKeys.di.test.cjs',
  'subscriberService.di.test.cjs',
  'transaction.util.test.cjs',
  'projectService.di.test.cjs',
  'articleService.di.test.cjs',
  'certificationService.di.test.cjs',
  'blockTemplateService.di.test.cjs',
  'themePresetService.di.test.cjs',
  'themeMarketplaceService.di.test.cjs',
  'statsService.di.test.cjs',
  'securityEventService.di.test.cjs',
  'solid.architecture.test.cjs',
  'visualBuilderDraftService.di.test.cjs',
  'cmsPageService.di.test.cjs',
  'sitemapService.di.test.cjs',
]

/**
 * Execute un fichier de test Node et propage son stdout/stderr.
 * @param {string} fileName Fichier test dans /tests.
 * @returns {Promise<number>} Code de sortie.
 */
function runTest(fileName) {
  return new Promise((resolve) => {
    const fullPath = path.join(__dirname, fileName)
    const child = spawn(process.execPath, [fullPath], {
      stdio: 'inherit',
      env: process.env,
    })

    child.on('close', (code) => {
      resolve(Number.isInteger(code) ? code : 1)
    })
  })
}

async function main() {
  for (const fileName of TEST_FILES) {
    const exitCode = await runTest(fileName)
    if (exitCode !== 0) {
      console.error(`\nTest failed: ${fileName}`)
      process.exit(exitCode)
    }
  }

  console.log(`\nAll backend tests passed (${TEST_FILES.length} files).`)
}

main().catch((error) => {
  console.error(error.stack || error.message || error)
  process.exit(1)
})
