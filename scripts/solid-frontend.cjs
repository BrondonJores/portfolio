/* Tests d'architecture SOLID (SRP/DIP) pour la couche frontend. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = process.cwd()
const SRC_ROOT = path.join(ROOT, 'src')
const SECTIONS_DIR = path.join(SRC_ROOT, 'components', 'sections')
const HOOKS_DIR = path.join(SRC_ROOT, 'hooks')
const SERVICES_DIR = path.join(SRC_ROOT, 'services')
const CONTEXT_DIR = path.join(SRC_ROOT, 'context')

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
 * Liste les fichiers `.js`/`.jsx` d'un dossier.
 * @param {string} dir Dossier cible.
 * @returns {string[]} Liste des chemins absolus.
 */
function listSourceFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(js|jsx)$/.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
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
 * Transforme un chemin absolu en chemin relatif projet.
 * @param {string} filePath Chemin absolu.
 * @returns {string} Chemin relatif lisible.
 */
function toProjectRelative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

async function main() {
  await runCase('section components do not import services directly (SRP)', async () => {
    for (const filePath of listSourceFiles(SECTIONS_DIR)) {
      const content = readFile(filePath)
      const relPath = toProjectRelative(filePath)

      assert.equal(
        /from\s+['"]\.\.\/\.\.\/services\/[^'"]+['"]/.test(content),
        false,
        `[${relPath}] Une section ne doit pas importer directement un service.`
      )
    }
  })

  await runCase('frontend hooks stay UI-agnostic: no component imports (SRP)', async () => {
    for (const filePath of listSourceFiles(HOOKS_DIR)) {
      const content = readFile(filePath)
      const relPath = toProjectRelative(filePath)

      assert.equal(
        /from\s+['"]\.\.\/components\/[^'"]+['"]/.test(content),
        false,
        `[${relPath}] Un hook ne doit pas importer un composant UI.`
      )
    }
  })

  await runCase('services stay React-free and UI-free (DIP)', async () => {
    for (const filePath of listSourceFiles(SERVICES_DIR)) {
      const content = readFile(filePath)
      const relPath = toProjectRelative(filePath)

      assert.equal(
        /from\s+['"]react['"]/.test(content),
        false,
        `[${relPath}] Un service frontend ne doit pas dependre de React.`
      )
      assert.equal(
        /from\s+['"]\.\.\/components\/[^'"]+['"]/.test(content),
        false,
        `[${relPath}] Un service frontend ne doit pas importer un composant.`
      )
      assert.equal(
        /from\s+['"]\.\.\/pages\/[^'"]+['"]/.test(content),
        false,
        `[${relPath}] Un service frontend ne doit pas importer une page.`
      )
    }
  })

  await runCase('contexts avoid raw fetch and delegate transport to services (SRP)', async () => {
    for (const filePath of listSourceFiles(CONTEXT_DIR)) {
      const content = readFile(filePath)
      const relPath = toProjectRelative(filePath)

      assert.equal(
        /\bfetch\s*\(/.test(content),
        false,
        `[${relPath}] Un contexte ne doit pas appeler fetch directement.`
      )
    }
  })

  if (failures > 0) {
    console.error(`\nFrontend SOLID architecture tests failed: ${failures}`)
    process.exit(1)
  }

  console.log('\nFrontend SOLID architecture tests passed.')
}

main().catch((err) => {
  console.error(err.stack || err.message || err)
  process.exit(1)
})
