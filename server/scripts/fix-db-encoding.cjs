/* Correction defensive des textes mojibake en base, sans toucher aux slugs. */
const { isDeepStrictEqual } = require('node:util')
const { sequelize, ...models } = require('../src/models')

const DEFAULT_BATCH_SIZE = 100
const DEFAULT_MAX_CHANGES_LOG = 30

function parseArgs(argv) {
  const args = {
    apply: false,
    batch: DEFAULT_BATCH_SIZE,
    models: null,
    maxLog: DEFAULT_MAX_CHANGES_LOG,
  }

  for (const token of argv) {
    if (token === '--apply') {
      args.apply = true
      continue
    }

    if (token.startsWith('--batch=')) {
      const parsed = Number.parseInt(token.slice('--batch='.length), 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        args.batch = parsed
      }
      continue
    }

    if (token.startsWith('--models=')) {
      const raw = token.slice('--models='.length)
      const parsed = raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
      if (parsed.length > 0) {
        args.models = new Set(parsed)
      }
      continue
    }

    if (token.startsWith('--max-log=')) {
      const parsed = Number.parseInt(token.slice('--max-log='.length), 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        args.maxLog = parsed
      }
    }
  }

  return args
}

function countOccurrences(value, token) {
  if (!value || !token) return 0
  return value.split(token).length - 1
}

function mojibakeScore(value) {
  if (typeof value !== 'string' || value.length === 0) return 0

  const suspiciousTokens = [
    'Ã',
    'Â',
    'â€™',
    'â€œ',
    'â€\u009d',
    'â€“',
    'â€”',
    'â€¢',
    'â€¦',
    'ï¿½',
    '�',
  ]

  return suspiciousTokens.reduce((score, token) => score + countOccurrences(value, token), 0)
}

function maybeFixString(value) {
  if (typeof value !== 'string' || value.length === 0) return value

  const currentScore = mojibakeScore(value)
  if (currentScore === 0) return value

  const decoded = Buffer.from(value, 'latin1').toString('utf8')
  if (!decoded || decoded === value) return value

  const decodedScore = mojibakeScore(decoded)
  if (decodedScore < currentScore) return decoded
  return value
}

function shouldSkipPath(pathParts) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return false
  const last = String(pathParts[pathParts.length - 1] || '').toLowerCase()
  return last === 'slug'
}

function fixValue(value, pathParts = []) {
  if (shouldSkipPath(pathParts)) return value

  if (typeof value === 'string') {
    return maybeFixString(value)
  }

  if (Array.isArray(value)) {
    let changed = false
    const fixedArray = value.map((entry, index) => {
      const fixed = fixValue(entry, [...pathParts, String(index)])
      if (!isDeepStrictEqual(fixed, entry)) changed = true
      return fixed
    })
    return changed ? fixedArray : value
  }

  if (value && typeof value === 'object') {
    let changed = false
    const fixedObject = {}

    for (const [key, nestedValue] of Object.entries(value)) {
      const fixed = fixValue(nestedValue, [...pathParts, key])
      fixedObject[key] = fixed
      if (!isDeepStrictEqual(fixed, nestedValue)) changed = true
    }

    return changed ? fixedObject : value
  }

  return value
}

function resolvePrimaryKey(model) {
  const primaryKeys = Array.isArray(model.primaryKeyAttributes)
    ? model.primaryKeyAttributes.filter(Boolean)
    : []
  if (primaryKeys.length > 0) return primaryKeys[0]
  return 'id'
}

function resolveFixableAttributes(model) {
  const entries = Object.entries(model.rawAttributes || {})
  const attributes = []

  for (const [attrName, attrDef] of entries) {
    if (String(attrName).toLowerCase() === 'slug') continue

    const typeKey = String(attrDef?.type?.key || '').toUpperCase()
    if (typeKey === 'STRING' || typeKey === 'TEXT' || typeKey === 'JSON' || typeKey === 'JSONB') {
      attributes.push(attrName)
    }
  }

  return attributes
}

function formatPk(row, pkField) {
  const value = row.get(pkField)
  return value === undefined || value === null ? '<unknown>' : String(value)
}

async function processModel(modelName, model, options) {
  const primaryKey = resolvePrimaryKey(model)
  const fixableAttributes = resolveFixableAttributes(model)
  const attributes = Array.from(new Set([primaryKey, ...fixableAttributes]))

  const summary = {
    modelName,
    scannedRows: 0,
    changedRows: 0,
    changedFields: 0,
  }

  if (fixableAttributes.length === 0) {
    console.log(`[${modelName}] skip: aucune colonne texte/json eligible.`)
    return summary
  }

  let offset = 0
  let printedChanges = 0

  while (true) {
    const rows = await model.findAll({
      attributes,
      order: [[primaryKey, 'ASC']],
      limit: options.batch,
      offset,
    })

    if (rows.length === 0) break

    for (const row of rows) {
      summary.scannedRows += 1

      const updates = {}
      for (const attrName of fixableAttributes) {
        const originalValue = row.get(attrName)
        const fixedValue = fixValue(originalValue, [attrName])
        if (!isDeepStrictEqual(fixedValue, originalValue)) {
          updates[attrName] = fixedValue
          summary.changedFields += 1
        }
      }

      const updateKeys = Object.keys(updates)
      if (updateKeys.length === 0) continue

      summary.changedRows += 1

      if (printedChanges < options.maxLog) {
        console.log(
          `[${modelName}] row ${formatPk(row, primaryKey)}: ${updateKeys.join(', ')}${
            options.apply ? ' (apply)' : ' (dry-run)'
          }`
        )
        printedChanges += 1
      }

      if (options.apply) {
        await row.update(updates, {
          fields: updateKeys,
          validate: false,
          hooks: false,
        })
      }
    }

    offset += rows.length
    if (rows.length < options.batch) break
  }

  console.log(
    `[${modelName}] scanned=${summary.scannedRows} changedRows=${summary.changedRows} changedFields=${summary.changedFields}`
  )
  return summary
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const targetModels = Object.entries(models).filter(([, model]) => model && model.rawAttributes)
  const selectedModels = options.models
    ? targetModels.filter(([name]) => options.models.has(name))
    : targetModels

  if (selectedModels.length === 0) {
    console.log('Aucun modele cible. Verifie --models=ModelA,ModelB')
    process.exit(1)
  }

  console.log(
    `Fix DB encoding mode=${options.apply ? 'apply' : 'dry-run'} batch=${options.batch} models=${selectedModels
      .map(([name]) => name)
      .join(',')}`
  )

  try {
    await sequelize.authenticate()
    console.log('Connexion DB: OK')

    let totalRows = 0
    let totalChangedRows = 0
    let totalChangedFields = 0

    for (const [modelName, model] of selectedModels) {
      const summary = await processModel(modelName, model, options)
      totalRows += summary.scannedRows
      totalChangedRows += summary.changedRows
      totalChangedFields += summary.changedFields
    }

    console.log(
      `Resume final: scannedRows=${totalRows} changedRows=${totalChangedRows} changedFields=${totalChangedFields} mode=${
        options.apply ? 'apply' : 'dry-run'
      }`
    )
  } catch (err) {
    console.error('Echec fix-db-encoding:', err?.stack || err?.message || err)
    process.exitCode = 1
  } finally {
    await sequelize.close().catch(() => {})
  }
}

main()
