/* Lint frontend sans dependance ESLint: verification syntaxique via @babel/parser. */
const fs = require('node:fs')
const path = require('node:path')
const parser = require('@babel/parser')

const ROOT = process.cwd()
const SCAN_ROOTS = ['src']
const EXTRA_FILES = ['vite.config.js']
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx'])

const BASE_PLUGINS = ['importMeta', 'topLevelAwait', 'classProperties', 'classPrivateProperties', 'classPrivateMethods']

/**
 * Retourne la liste de plugins parser selon extension.
 * @param {string} extension Extension du fichier.
 * @returns {string[]} Plugins Babel parser.
 */
function getParserPlugins(extension) {
  if (extension === '.ts') return [...BASE_PLUGINS, 'typescript']
  if (extension === '.tsx') return [...BASE_PLUGINS, 'typescript', 'jsx']
  return [...BASE_PLUGINS, 'jsx']
}

/**
 * Collecte recursivement les fichiers frontend a verifier.
 * @param {string} directory Chemin absolu du dossier.
 * @returns {string[]} Liste de fichiers.
 */
function collectFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath))
      continue
    }

    if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Valide la syntaxe d'un fichier via Babel parser.
 * @param {string} filePath Chemin absolu du fichier.
 * @returns {null|Error} Erreur si invalide.
 */
function checkFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  try {
    parser.parse(source, {
      sourceType: 'module',
      sourceFilename: filePath,
      plugins: getParserPlugins(path.extname(filePath)),
      errorRecovery: false,
    })
    return null
  } catch (error) {
    return error
  }
}

function main() {
  const targets = [
    ...SCAN_ROOTS
      .map((entry) => path.join(ROOT, entry))
      .filter((entry) => fs.existsSync(entry))
      .flatMap((entry) => collectFiles(entry)),
    ...EXTRA_FILES
      .map((entry) => path.join(ROOT, entry))
      .filter((entry) => fs.existsSync(entry)),
  ]

  if (targets.length === 0) {
    console.log('Aucun fichier frontend trouve pour lint.')
    return
  }

  const failures = []
  for (const target of targets) {
    const error = checkFile(target)
    if (error) {
      failures.push({ file: target, error })
    }
  }

  if (failures.length > 0) {
    console.error(`Frontend lint echoue: ${failures.length} fichier(s) invalide(s).`)
    for (const failure of failures) {
      console.error(`\n${failure.file}\n${failure.error.message || failure.error}`)
    }
    process.exit(1)
  }

  console.log(`Frontend lint OK (${targets.length} fichiers verifies).`)
}

main()
