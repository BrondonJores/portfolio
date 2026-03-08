/* Service metier des templates de blocs (CRUD + normalisation + releases + package). */
const { Op } = require('sequelize')
const { BlockTemplate, MarketplaceItem, BlockTemplateRelease } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { createBlockContentSanitizer } = require('../utils/blockContentSanitizer')
const { withOptionalTransaction } = require('../utils/transaction')

const TEMPLATE_CONTEXTS = new Set(['article', 'project', 'newsletter', 'all'])
const BLOCK_TYPES = new Set(['paragraph', 'heading', 'image', 'code', 'quote', 'list', 'section'])
const SECTION_LAYOUT_COLUMNS = {
  '1-col': 1,
  '2-col': 2,
  '3-col': 3,
}
const SECTION_VARIANTS = new Set(['default', 'soft', 'accent'])
const SECTION_SPACINGS = new Set(['sm', 'md', 'lg'])
const MAX_BLOCKS = 250

/**
 * Verifie que le repository marketplace expose les methodes minimales.
 * @param {unknown} repository Repository potentiel.
 * @returns {boolean} True si le repository est exploitable.
 */
function canUseMarketplaceRepository(repository) {
  return Boolean(
    repository &&
      typeof repository.upsert === 'function' &&
      typeof repository.update === 'function'
  )
}

/**
 * Verifie que le repository de releases expose les methodes minimales.
 * @param {unknown} repository Repository potentiel.
 * @returns {boolean} True si le repository est exploitable.
 */
function canUseBlockTemplateReleaseRepository(repository) {
  return Boolean(
    repository &&
      typeof repository.create === 'function' &&
      typeof repository.findAll === 'function' &&
      typeof repository.findOne === 'function'
  )
}

/**
 * Convertit une valeur vers booleen permissif.
 * @param {unknown} value Valeur brute.
 * @param {boolean} [fallback=false] Valeur de repli.
 * @returns {boolean} Booleen normalise.
 */
function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

/**
 * Tronque et normalise une valeur texte.
 * @param {unknown} value Valeur source.
 * @param {number} maxLength Taille maximale autorisee.
 * @param {string} [fallback=''] Valeur de repli.
 * @returns {string} Texte nettoye.
 */
function sanitizeText(value, maxLength, fallback = '') {
  if (typeof value !== 'string') {
    return fallback
  }
  return value.trim().slice(0, maxLength)
}

/**
 * Nettoie un identifiant technique (id bloc, anchor...).
 * @param {unknown} value Valeur brute.
 * @param {number} maxLength Taille max.
 * @returns {string} Identifiant nettoye.
 */
function sanitizeIdentifier(value, maxLength) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}

/* Mutualise la sanitization blocs/sections/lists pour les templates. */
const templateBlockSanitizer = createBlockContentSanitizer({
  allowedBlockTypes: BLOCK_TYPES,
  sectionLayoutColumns: SECTION_LAYOUT_COLUMNS,
  sectionVariants: SECTION_VARIANTS,
  sectionSpacings: SECTION_SPACINGS,
  maxBlocks: MAX_BLOCKS,
  truncateDepthLimitItems: false,
  sanitizeText,
  sanitizeIdentifier,
})

/**
 * Nettoie une collection de blocs.
 * @param {unknown} blocks Valeur source.
 * @param {object} [options={}] Options de nettoyage.
 * @returns {Array<object>} Tableau de blocs valides.
 */
function sanitizeBlocks(blocks, options = {}) {
  return templateBlockSanitizer.sanitizeBlocks(blocks, options)
}

/**
 * Normalise un contexte template.
 * @param {unknown} context Contexte brut.
 * @param {string} [fallback='all'] Contexte de repli.
 * @returns {string} Contexte valide.
 */
function sanitizeContext(context, fallback = 'all') {
  const normalized = sanitizeText(context, 30).toLowerCase()
  return TEMPLATE_CONTEXTS.has(normalized) ? normalized : fallback
}

/**
 * Construit le slug stable d'un template dans marketplace_items.
 * @param {number|string} templateId Identifiant template.
 * @returns {string} Slug stable.
 */
function buildTemplateMarketplaceSlug(templateId) {
  const safeId = Number.parseInt(templateId, 10)
  if (!Number.isFinite(safeId) || safeId <= 0) {
    return ''
  }
  return `template-${safeId}`
}

/**
 * Construit le payload marketplace associe a un template.
 * @param {object} template Template source.
 * @returns {object|null} Payload marketplace normalise.
 */
function buildTemplateMarketplacePayload(template) {
  const slug = buildTemplateMarketplaceSlug(template?.id)
  const name = sanitizeText(template?.name, 160)
  const context = sanitizeContext(template?.context, 'all')
  const description = sanitizeText(template?.description, 10000, '')
  const blocks = sanitizeBlocks(template?.blocks)

  if (!slug || !name || blocks.length === 0) {
    return null
  }

  return {
    type: 'template',
    slug,
    name,
    short_description: description ? description.slice(0, 255) : `${name} (${context})`,
    description: description || null,
    category: context,
    style: 'custom',
    author: 'Admin',
    featured: false,
    version: 1,
    tags: [context],
    payload: {
      block_template_id: Number.parseInt(String(template.id), 10),
      context,
      blocks,
    },
    source: 'admin',
    is_active: true,
  }
}

/**
 * Normalise un payload template complet (hors controles metier).
 * @param {unknown} payload Donnees brutes.
 * @returns {{name:string,context:string,description:string,blocks:Array<object>}} Template nettoye.
 */
function sanitizeTemplatePayload(payload) {
  return {
    name: sanitizeText(payload?.name, 120),
    context: sanitizeContext(payload?.context, 'all'),
    description: sanitizeText(payload?.description, 2000, ''),
    blocks: sanitizeBlocks(payload?.blocks),
  }
}

/**
 * Construit un snapshot serialisable de template.
 * @param {object} template Template source.
 * @returns {{name:string,context:string,description:string,blocks:Array<object>}} Snapshot normalise.
 */
function buildTemplateSnapshot(template) {
  return sanitizeTemplatePayload(template)
}

/**
 * Extrait les donnees d'un package template importable.
 * @param {unknown} payload Package brut.
 * @returns {{snapshot: object, changeNote: string}|null} Payload package normalise ou null.
 */
function extractTemplatePackagePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const packageTemplate =
    payload.template && typeof payload.template === 'object'
      ? payload.template
      : payload

  const snapshot = sanitizeTemplatePayload(packageTemplate)
  if (!snapshot.name || snapshot.blocks.length === 0) {
    return null
  }

  const changeNote = sanitizeText(
    payload?.manifest?.changeNote || payload?.change_note,
    255,
    'Import package'
  )

  return {
    snapshot,
    changeNote,
  }
}

/**
 * Extrait la collection de templates a importer.
 * Accepte:
 * - `{ templates: [...] }`
 * - `[...]`
 * - `{ name, context, blocks, ... }`
 * @param {unknown} payload Requete brute.
 * @returns {Array<object>} Templates candidats.
 */
function resolveTemplatesToImport(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!payload || typeof payload !== 'object') {
    return []
  }

  if (Array.isArray(payload.templates)) {
    return payload.templates
  }

  if (payload.name !== undefined || payload.blocks !== undefined) {
    return [payload]
  }

  return []
}

/**
 * Construit le service template avec dependances injectables.
 * @param {object} [deps={}] Dependances optionnelles (tests/DI).
 * @param {object} [deps.blockTemplateModel] Modele Sequelize.
 * @param {object} [deps.marketplaceItemModel] Modele marketplace.
 * @param {object} [deps.blockTemplateReleaseModel] Modele releases templates.
 * @param {symbol|string} [deps.inOperator] Operateur SQL IN.
 * @param {Function} [deps.now] Horloge injectee.
 * @returns {object} API du service template.
 */
function createBlockTemplateService(deps = {}) {
  const blockTemplateModel = deps.blockTemplateModel || BlockTemplate
  const inOperator = deps.inOperator || Op.in
  const now = deps.now || (() => new Date())
  const marketplaceItemModel =
    deps.marketplaceItemModel !== undefined
      ? deps.marketplaceItemModel
      : deps.blockTemplateModel
        ? null
        : MarketplaceItem
  const marketplaceRepositoryEnabled = canUseMarketplaceRepository(marketplaceItemModel)

  const blockTemplateReleaseModel =
    deps.blockTemplateReleaseModel !== undefined
      ? deps.blockTemplateReleaseModel
      : deps.blockTemplateModel
        ? null
        : BlockTemplateRelease
  const releaseRepositoryEnabled = canUseBlockTemplateReleaseRepository(blockTemplateReleaseModel)
  const transactionProvider = deps.transactionProvider

  /**
   * Charge un template par id ou leve 404.
   * @param {number|string} id Identifiant template.
   * @returns {Promise<object>} Template charge.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function ensureBlockTemplateById(id, transaction = null) {
    const template = await blockTemplateModel.findByPk(
      id,
      transaction ? { transaction } : undefined
    )
    if (!template) {
      throw createHttpError(404, 'Template introuvable.')
    }
    return template
  }

  /**
   * Calcule la prochaine version release pour un template.
   * @param {number|string} templateId Identifiant template.
   * @returns {Promise<number>} Prochaine version.
   */
  async function getNextBlockTemplateReleaseVersion(templateId, transaction = null) {
    if (!releaseRepositoryEnabled) return 1

    const latest = await blockTemplateReleaseModel.findOne(
      transaction
        ? {
            where: { block_template_id: templateId },
            order: [['version_number', 'DESC']],
            transaction,
          }
        : {
            where: { block_template_id: templateId },
            order: [['version_number', 'DESC']],
          }
    )

    const currentVersion = Number.parseInt(String(latest?.version_number ?? 0), 10)
    return (Number.isFinite(currentVersion) ? currentVersion : 0) + 1
  }

  /**
   * Cree une release historisee du template courant.
   * @param {object} template Template source.
   * @param {string} [changeNote=''] Note de release.
   * @returns {Promise<object|null>} Release creee ou null si repository indisponible.
   */
  async function createBlockTemplateReleaseEntry(template, changeNote = '', transaction = null) {
    if (!releaseRepositoryEnabled) return null

    const snapshot = buildTemplateSnapshot(template)
    if (!snapshot.name || snapshot.blocks.length === 0) {
      return null
    }

    const versionNumber = await getNextBlockTemplateReleaseVersion(template.id, transaction)

    return blockTemplateReleaseModel.create(
      {
        block_template_id: template.id,
        version_number: versionNumber,
        change_note: sanitizeText(changeNote, 255, '') || null,
        snapshot,
      },
      transaction ? { transaction } : undefined
    )
  }

  /**
   * Synchronise un template dans marketplace_items sans bloquer le flux principal.
   * @param {object} template Template source.
   * @returns {Promise<void>} Promise resolue meme si la synchro echoue.
   */
  async function syncTemplateToMarketplace(template, options = {}) {
    const transaction = options?.transaction || null
    const suppressErrors = options?.suppressErrors !== false
    if (!marketplaceRepositoryEnabled) return

    const payload = buildTemplateMarketplacePayload(template)
    if (!payload) return

    try {
      await marketplaceItemModel.upsert(
        payload,
        transaction ? { transaction } : undefined
      )
    } catch (err) {
      if (!suppressErrors) {
        throw err
      }
      /* Le CRUD principal reste prioritaire si la synchro marketplace echoue. */
    }
  }

  /**
   * Desactive un item marketplace template apres suppression.
   * @param {number|string} templateId Identifiant template supprime.
   * @returns {Promise<void>} Promise resolue meme si la synchro echoue.
   */
  async function deactivateTemplateInMarketplace(templateId, options = {}) {
    const transaction = options?.transaction || null
    const suppressErrors = options?.suppressErrors !== false
    if (!marketplaceRepositoryEnabled) return

    const slug = buildTemplateMarketplaceSlug(templateId)
    if (!slug) return

    try {
      await marketplaceItemModel.update(
        { is_active: false },
        transaction
          ? { where: { type: 'template', slug }, transaction }
          : { where: { type: 'template', slug } }
      )
    } catch (err) {
      if (!suppressErrors) {
        throw err
      }
      /* Ignore les erreurs de synchro pour ne pas casser la suppression. */
    }
  }

  /**
   * Liste les templates (optionnellement filtres par contexte).
   * Si un contexte est fourni, inclut aussi les templates globaux (`all`).
   * @param {object} params Parametres de filtre.
   * @param {string | undefined} params.context Contexte cible.
   * @returns {Promise<Array<object>>} Liste des templates.
   */
  async function getAllBlockTemplates({ context }) {
    const safeContext = sanitizeContext(context, '')
    const where = {}

    if (safeContext && safeContext !== 'all') {
      where.context = { [inOperator]: [safeContext, 'all'] }
    } else if (safeContext === 'all') {
      where.context = 'all'
    }

    return blockTemplateModel.findAll({
      where,
      order: [
        ['updated_at', 'DESC'],
        ['created_at', 'DESC'],
      ],
    })
  }

  /**
   * Cree un nouveau template de blocs.
   * @param {object} payload Donnees valides du template.
   * @returns {Promise<object>} Template cree.
   * @throws {Error} Erreur 422 si aucun bloc valide.
   */
  async function createBlockTemplate(payload) {
    const sanitized = sanitizeTemplatePayload(payload)
    if (!sanitized.name) {
      throw createHttpError(422, 'Le nom du template est obligatoire.')
    }
    if (sanitized.blocks.length === 0) {
      throw createHttpError(422, 'Le template doit contenir au moins un bloc valide.')
    }

    return withOptionalTransaction(
      { model: blockTemplateModel, transactionProvider },
      async (transaction) => {
        const template = await blockTemplateModel.create(
          sanitized,
          transaction ? { transaction } : undefined
        )
        await syncTemplateToMarketplace(template, {
          transaction,
          suppressErrors: false,
        })
        await createBlockTemplateReleaseEntry(
          template,
          sanitizeText(payload?.change_note, 255, 'Creation du template'),
          transaction
        )
        return template
      }
    )
  }

  /**
   * Met a jour un template existant.
   * @param {number|string} id Identifiant template.
   * @param {object} payload Champs a mettre a jour.
   * @returns {Promise<object>} Template mis a jour.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function updateBlockTemplate(id, payload) {
    return withOptionalTransaction(
      { model: blockTemplateModel, transactionProvider },
      async (transaction) => {
        const template = await ensureBlockTemplateById(id, transaction)

        const updates = {}

        if (payload.name !== undefined) {
          updates.name = sanitizeText(payload.name, 120)
        }

        if (payload.context !== undefined) {
          updates.context = sanitizeContext(payload.context, template.context || 'all')
        }

        if (payload.description !== undefined) {
          updates.description = sanitizeText(payload.description, 2000, '')
        }

        if (payload.blocks !== undefined) {
          const blocks = sanitizeBlocks(payload.blocks)
          if (blocks.length === 0) {
            throw createHttpError(422, 'Le template doit contenir au moins un bloc valide.')
          }
          updates.blocks = blocks
        }

        await template.update(updates, transaction ? { transaction } : undefined)
        await syncTemplateToMarketplace(template, {
          transaction,
          suppressErrors: false,
        })
        await createBlockTemplateReleaseEntry(
          template,
          sanitizeText(payload?.change_note, 255, 'Mise a jour du template'),
          transaction
        )
        return template
      }
    )
  }

  /**
   * Supprime un template existant.
   * @param {number|string} id Identifiant template.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function deleteBlockTemplate(id) {
    return withOptionalTransaction(
      { model: blockTemplateModel, transactionProvider },
      async (transaction) => {
        const template = await ensureBlockTemplateById(id, transaction)
        await template.destroy(transaction ? { transaction } : undefined)
        await deactivateTemplateInMarketplace(template.id, {
          transaction,
          suppressErrors: false,
        })
      }
    )
  }

  /**
   * Liste les releases d'un template.
   * @param {number|string} id Identifiant template.
   * @returns {Promise<Array<object>>} Historique releases (desc).
   */
  async function getBlockTemplateReleases(id) {
    const template = await ensureBlockTemplateById(id)
    if (!releaseRepositoryEnabled) return []

    return blockTemplateReleaseModel.findAll({
      where: { block_template_id: template.id },
      order: [
        ['version_number', 'DESC'],
        ['created_at', 'DESC'],
      ],
    })
  }

  /**
   * Revient a une release precise d'un template.
   * @param {number|string} id Identifiant template.
   * @param {number|string} releaseId Identifiant release cible.
   * @returns {Promise<{template: object, release: object}>} Template restaure + release cible.
   * @throws {Error} Erreur 404/422 selon le cas.
   */
  async function rollbackBlockTemplate(id, releaseId) {
    if (!releaseRepositoryEnabled) {
      throw createHttpError(422, 'Historique des releases indisponible.')
    }

    return withOptionalTransaction(
      { model: blockTemplateModel, transactionProvider },
      async (transaction) => {
        const template = await ensureBlockTemplateById(id, transaction)
        const safeReleaseId = Number.parseInt(String(releaseId), 10)
        if (!Number.isFinite(safeReleaseId) || safeReleaseId <= 0) {
          throw createHttpError(422, 'releaseId invalide.')
        }

        const release = await blockTemplateReleaseModel.findOne(
          transaction
            ? {
                where: {
                  id: safeReleaseId,
                  block_template_id: template.id,
                },
                transaction,
              }
            : {
                where: {
                  id: safeReleaseId,
                  block_template_id: template.id,
                },
              }
        )

        if (!release) {
          throw createHttpError(404, 'Release introuvable.')
        }

        const snapshot = sanitizeTemplatePayload(release.snapshot || {})
        if (!snapshot.name || snapshot.blocks.length === 0) {
          throw createHttpError(422, 'Snapshot release invalide.')
        }

        await template.update(snapshot, transaction ? { transaction } : undefined)
        await syncTemplateToMarketplace(template, {
          transaction,
          suppressErrors: false,
        })
        await createBlockTemplateReleaseEntry(
          template,
          `Rollback vers v${release.version_number}`,
          transaction
        )

        return {
          template,
          release,
        }
      }
    )
  }

  /**
   * Exporte un template au format package versionne.
   * @param {number|string} id Identifiant template.
   * @returns {Promise<object>} Package JSON complet.
   */
  async function exportBlockTemplatePackage(id) {
    const template = await ensureBlockTemplateById(id)
    const releases = releaseRepositoryEnabled
      ? await blockTemplateReleaseModel.findAll({
        where: { block_template_id: template.id },
        order: [['version_number', 'ASC']],
      })
      : []

    const currentVersion = releases.length > 0
      ? Number.parseInt(String(releases[releases.length - 1]?.version_number ?? 1), 10) || 1
      : 1

    return {
      packageType: 'block-template-package',
      packageVersion: 1,
      exportedAt: now().toISOString(),
      manifest: {
        itemType: 'template',
        source: 'admin',
        name: sanitizeText(template.name, 160),
        slug: buildTemplateMarketplaceSlug(template.id),
        context: sanitizeContext(template.context, 'all'),
        currentVersion,
        releaseCount: releases.length,
      },
      template: buildTemplateSnapshot(template),
      releases: releases.map((release) => ({
        id: release.id,
        versionNumber: release.version_number,
        changeNote: release.change_note || '',
        createdAt: release.created_at,
      })),
    }
  }

  /**
   * Importe un package template (create/update).
   * @param {object} payload Package JSON entrant.
   * @returns {Promise<{action:string,template:object|null}>} Resultat d'import.
   * @throws {Error} Erreur 422 si package invalide.
   */
  async function importBlockTemplatePackage(payload) {
    const normalized = extractTemplatePackagePayload(payload)
    if (!normalized) {
      throw createHttpError(422, 'Package template invalide.')
    }

    const replaceExisting = toBoolean(payload?.replaceExisting, true)
    const { snapshot, changeNote } = normalized

    return withOptionalTransaction(
      { model: blockTemplateModel, transactionProvider },
      async (transaction) => {
        const existing = await blockTemplateModel.findOne(
          transaction
            ? {
                where: {
                  name: snapshot.name,
                  context: snapshot.context,
                },
                transaction,
              }
            : {
                where: {
                  name: snapshot.name,
                  context: snapshot.context,
                },
              }
        )

        let template = existing
        let action = 'created'

        if (template) {
          if (!replaceExisting) {
            action = 'skipped'
          } else {
            await template.update(snapshot, transaction ? { transaction } : undefined)
            action = 'updated'
          }
        } else {
          template = await blockTemplateModel.create(
            snapshot,
            transaction ? { transaction } : undefined
          )
          action = 'created'
        }

        if (action !== 'skipped' && template) {
          await syncTemplateToMarketplace(template, {
            transaction,
            suppressErrors: false,
          })
          await createBlockTemplateReleaseEntry(
            template,
            changeNote || 'Import package',
            transaction
          )
        }

        return {
          action,
          template,
        }
      }
    )
  }

  /**
   * Importe un lot de templates JSON dans la base.
   * Si `replaceExisting=true`, met a jour les templates existants (name+context).
   * Sinon, les doublons sont ignores.
   * @param {object|Array<object>} payload Payload d'import.
   * @returns {Promise<object>} Resume import (created/updated/skipped...).
   * @throws {Error} Erreur 422 si aucun template valide importable.
   */
  async function importBlockTemplates(payload) {
    const candidates = resolveTemplatesToImport(payload)
    if (candidates.length === 0) {
      throw createHttpError(422, "Aucun template a importer. Format attendu: { templates: [...] }.")
    }
    if (candidates.length > 100) {
      throw createHttpError(422, "L'import est limite a 100 templates par operation.")
    }

    const replaceExisting = payload?.replaceExisting === true || String(payload?.replaceExisting) === 'true'
    let created = 0
    let updated = 0
    const skipped = []
    const items = []

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index]
      const sanitized = sanitizeTemplatePayload(candidate)

      if (!sanitized.name) {
        skipped.push({ index, reason: 'Nom manquant.' })
        continue
      }

      if (sanitized.blocks.length === 0) {
        skipped.push({ index, name: sanitized.name, reason: 'Aucun bloc valide.' })
        continue
      }

      const existing = await blockTemplateModel.findOne({
        where: {
          name: sanitized.name,
          context: sanitized.context,
        },
      })

      if (existing) {
        if (!replaceExisting) {
          skipped.push({ index, name: sanitized.name, reason: 'Template deja existant.' })
          continue
        }

        const updatedTemplate = await withOptionalTransaction(
          { model: blockTemplateModel, transactionProvider },
          async (transaction) => {
            await existing.update(
              {
                description: sanitized.description,
                blocks: sanitized.blocks,
              },
              transaction ? { transaction } : undefined
            )
            await syncTemplateToMarketplace(existing, {
              transaction,
              suppressErrors: false,
            })
            await createBlockTemplateReleaseEntry(
              existing,
              sanitizeText(payload?.change_note, 255, 'Import templates'),
              transaction
            )
            return existing
          }
        )
        updated += 1
        items.push(updatedTemplate)
        continue
      }

      const createdTemplate = await withOptionalTransaction(
        { model: blockTemplateModel, transactionProvider },
        async (transaction) => {
          const template = await blockTemplateModel.create(
            sanitized,
            transaction ? { transaction } : undefined
          )
          await syncTemplateToMarketplace(template, {
            transaction,
            suppressErrors: false,
          })
          await createBlockTemplateReleaseEntry(
            template,
            sanitizeText(payload?.change_note, 255, 'Import templates'),
            transaction
          )
          return template
        }
      )
      created += 1
      items.push(createdTemplate)
    }

    if (created === 0 && updated === 0) {
      throw createHttpError(422, 'Import termine sans ajout ni mise a jour.')
    }

    return {
      created,
      updated,
      skippedCount: skipped.length,
      skipped: skipped.slice(0, 30),
      items,
    }
  }

  return {
    getAllBlockTemplates,
    createBlockTemplate,
    updateBlockTemplate,
    deleteBlockTemplate,
    getBlockTemplateReleases,
    rollbackBlockTemplate,
    exportBlockTemplatePackage,
    importBlockTemplatePackage,
    importBlockTemplates,
  }
}

module.exports = {
  createBlockTemplateService,
  ...createBlockTemplateService(),
}
