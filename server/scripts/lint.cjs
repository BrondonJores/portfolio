/* Lint leger sans dependance externe: verification syntaxique Node */
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = process.cwd()
const SCAN_ROOTS = ['src', 'scripts', 'tests']
const EXTENSIONS = new Set(['.js', '.cjs', '.mjs'])

function collectFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
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

function runSyntaxCheck(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  try {
    // Verification syntaxique sans spawn de sous-processus.
    new vm.Script(content, { filename: filePath })
    return null
  } catch (err) {
    return err
  }
}

function main() {
  const targets = SCAN_ROOTS
    .map((relativePath) => path.join(ROOT, relativePath))
    .filter((absolutePath) => fs.existsSync(absolutePath))
    .flatMap((absolutePath) => collectFiles(absolutePath))

  if (targets.length === 0) {
    console.log('Aucun fichier JS trouve pour lint.')
    return
  }

  const failures = []

  for (const file of targets) {
    const error = runSyntaxCheck(file)
    if (error) {
      failures.push({
        file,
        stderr: String(error.stack || error.message || error).trim(),
      })
    }
  }

  if (failures.length > 0) {
    console.error(`Lint echoue: ${failures.length} fichier(s) invalide(s).`)
    for (const failure of failures) {
      console.error(`\n${failure.file}\n${failure.stderr}`)
    }
    process.exit(1)
  }

  console.log(`Lint OK (${targets.length} fichiers verifies).`)
}

main()
