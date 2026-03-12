/* Tests d'architecture SOLID (SRP/DIP) pour la couche backend. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const SRC_ROOT = path.join(__dirname, '..', 'src')
const SERVICES_DIR = path.join(SRC_ROOT, 'services')
const CONTROLLERS_DIR = path.join(SRC_ROOT, 'controllers')
const ROUTES_DIR = path.join(SRC_ROOT, 'routes')

let failures = 0

/**
 * Execute un scenario de test asynchrone et journalise PASS/FAIL.
 * @param {string} name Nom du scenario.
 * @param {Function} callback Scenario.
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
 * Liste les fichiers `.js` d'un dossier.
 * @param {string} dir Dossier cible.
 * @returns {string[]} Liste des chemins absolus.
 */
function listJsFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => path.join(dir, entry.name))
}

/**
 * Echappe une chaine pour construction de RegExp.
 * @param {string} value Chaine brute.
 * @returns {string} Chaine echappee.
 */
function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Transforme un chemin absolu en chemin relatif projet.
 * @param {string} filePath Chemin absolu.
 * @returns {string} Chemin relatif lisible.
 */
function toProjectRelative(filePath) {
  return path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/')
}

/**
 * Lit le contenu UTF-8 d'un fichier.
 * @param {string} filePath Chemin absolu.
 * @returns {string} Contenu texte.
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

/**
 * Point d'entree des tests SOLID.
 * @returns {Promise<void>} Promise resolue si tous les cas passent.
 */
async function main() {
  await runCase('services expose a factory + default instance (DIP/OCP)', async () => {
    const serviceFiles = listJsFiles(SERVICES_DIR)

    for (const filePath of serviceFiles) {
      const content = readFile(filePath)
      const baseName = path.basename(filePath, '.js')
      const factoryName = `create${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`
      const relPath = toProjectRelative(filePath)

      const hasFactoryDeclaration = new RegExp(
        `\\bfunction\\s+${escapeRegExp(factoryName)}\\s*\\(|\\bconst\\s+${escapeRegExp(factoryName)}\\s*=\\s*\\(`
      ).test(content)
      assert.equal(
        hasFactoryDeclaration,
        true,
        `[${relPath}] Factory manquante: ${factoryName}(deps = {}).`
      )

      const hasModuleExportsObject = /module\.exports\s*=\s*\{[\s\S]*\}/m.test(content)
      assert.equal(hasModuleExportsObject, true, `[${relPath}] module.exports doit etre un objet.`)

      const hasFactoryExport = new RegExp(`\\b${escapeRegExp(factoryName)}\\b`).test(
        content.match(/module\.exports\s*=\s*\{[\s\S]*?\}/m)?.[0] || ''
      )
      assert.equal(
        hasFactoryExport,
        true,
        `[${relPath}] Export factory manquant dans module.exports (${factoryName}).`
      )

      const hasDefaultSpread = new RegExp(`\\.\\.\\.${escapeRegExp(factoryName)}\\s*\\(\\s*\\)`).test(content)
      assert.equal(
        hasDefaultSpread,
        true,
        `[${relPath}] Export instance par defaut manquant (...${factoryName}()).`
      )
    }
  })

  await runCase('controllers stay thin: no direct model/sequelize dependency (SRP)', async () => {
    const controllerFiles = listJsFiles(CONTROLLERS_DIR)

    for (const filePath of controllerFiles) {
      const content = readFile(filePath)
      const relPath = toProjectRelative(filePath)

      assert.equal(
        /require\(['"]\.\.\/models['"]\)/.test(content),
        false,
        `[${relPath}] Un controller ne doit pas importer ../models directement.`
      )
      assert.equal(
        /require\(['"]sequelize['"]\)/i.test(content),
        false,
        `[${relPath}] Un controller ne doit pas dependre de sequelize directement.`
      )

      assert.equal(
        /require\(['"]\.\.\/services\/[^'"]+['"]\)/.test(content),
        true,
        `[${relPath}] Un controller doit deleguer vers au moins un service.`
      )
    }
  })

  await runCase('routes depend on controllers/middleware, not models/services (SRP)', async () => {
    const routeFiles = listJsFiles(ROUTES_DIR)

    for (const filePath of routeFiles) {
      const content = readFile(filePath)
      const relPath = toProjectRelative(filePath)
      const fileName = path.basename(filePath)

      assert.equal(
        /require\(['"]\.\.\/models\/?[^'"]*['"]\)/.test(content),
        false,
        `[${relPath}] Une route ne doit pas importer ../models.`
      )

      const serviceImports = Array.from(
        content.matchAll(/require\(['"]\.\.\/services\/([^'"]+)['"]\)/g),
        (match) => match[1]
      )
      assert.equal(
        serviceImports.length,
        0,
        `[${relPath}] Imports service interdits en route: ${serviceImports.join(', ')}`
      )

      if (fileName !== 'index.js') {
        assert.equal(
          /require\(['"]\.\.\/controllers\/[^'"]+['"]\)/.test(content),
          true,
          `[${relPath}] Une route doit importer au moins un controller.`
        )
      }
    }
  })

  await runCase('services do not import routes/controllers (layer inversion guard)', async () => {
    const serviceFiles = listJsFiles(SERVICES_DIR)

    for (const filePath of serviceFiles) {
      const content = readFile(filePath)
      const relPath = toProjectRelative(filePath)

      assert.equal(
        /require\(['"]\.\.\/controllers\/?[^'"]*['"]\)/.test(content),
        false,
        `[${relPath}] Un service ne doit pas importer ../controllers.`
      )
      assert.equal(
        /require\(['"]\.\.\/routes\/?[^'"]*['"]\)/.test(content),
        false,
        `[${relPath}] Un service ne doit pas importer ../routes.`
      )
    }
  })

  if (failures > 0) {
    console.error(`\nSOLID architecture tests failed: ${failures}`)
    process.exit(1)
  }

  console.log('\nSOLID architecture tests passed.')
}

main().catch((err) => {
  console.error(err.stack || err.message || err)
  process.exit(1)
})
