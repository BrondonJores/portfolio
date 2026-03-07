/* Service metier des templates de blocs (CRUD + normalisation). */
const { Op } = require('sequelize')
const { BlockTemplate } = require('../models')
const { createHttpError } = require('../utils/httpError')

const TEMPLATE_CONTEXTS = new Set(['article', 'project', 'newsletter', 'all'])
const BLOCK_TYPES = new Set(['paragraph', 'heading', 'image', 'code', 'quote', 'list'])

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
 * Nettoie recursivement les items d'une liste imbriquee.
 * @param {unknown} items Elements bruts de liste.
 * @param {number} [depth=0] Profondeur courante.
 * @returns {Array<string | {content: string, items: Array}>} Liste nettoyee.
 */
function sanitizeListItems(items, depth = 0) {
  if (!Array.isArray(items)) {
    return ['']
  }

  if (depth >= 3) {
    return items
      .map((item) => (typeof item === 'string' ? sanitizeText(item, 500) : sanitizeText(item?.content, 500)))
      .filter((item) => item.length > 0)
  }

  const nextItems = items
    .map((item) => {
      if (typeof item === 'string') {
        return sanitizeText(item, 500)
      }

      if (item && typeof item === 'object') {
        return {
          content: sanitizeText(item.content, 500),
          items: sanitizeListItems(item.items, depth + 1),
        }
      }

      return ''
    })
    .filter((item) => {
      if (typeof item === 'string') return item.length > 0
      return Boolean(item?.content || (Array.isArray(item?.items) && item.items.length > 0))
    })

  return nextItems.length > 0 ? nextItems : ['']
}

/**
 * Normalise un bloc brut en structure autorisee pour le CMS.
 * @param {unknown} block Bloc source.
 * @returns {object | null} Bloc nettoye ou null si invalide.
 */
function sanitizeBlock(block) {
  if (!block || typeof block !== 'object') return null

  const type = sanitizeText(block.type, 20).toLowerCase()
  if (!BLOCK_TYPES.has(type)) return null

  switch (type) {
    case 'heading':
      return {
        type: 'heading',
        level: Number(block.level) === 3 ? 3 : 2,
        content: sanitizeText(block.content, 2000),
      }
    case 'image':
      return {
        type: 'image',
        url: sanitizeText(block.url, 2000),
        caption: sanitizeText(block.caption, 500),
      }
    case 'code':
      return {
        type: 'code',
        language: sanitizeText(block.language, 40, 'js') || 'js',
        content: sanitizeText(block.content, 200000),
      }
    case 'quote':
      return {
        type: 'quote',
        content: sanitizeText(block.content, 4000),
        author: sanitizeText(block.author, 200),
      }
    case 'list':
      return {
        type: 'list',
        items: sanitizeListItems(block.items),
      }
    case 'paragraph':
    default:
      return {
        type: 'paragraph',
        content: sanitizeText(block.content, 8000),
      }
  }
}

/**
 * Nettoie une collection de blocs.
 * @param {unknown} blocks Valeur source.
 * @returns {Array<object>} Tableau de blocs valides.
 */
function sanitizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return []

  return blocks
    .map((block) => sanitizeBlock(block))
    .filter(Boolean)
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
 * @param {symbol|string} [deps.inOperator] Operateur SQL IN.
 * @returns {object} API du service template.
 */
function createBlockTemplateService(deps = {}) {
  const blockTemplateModel = deps.blockTemplateModel || BlockTemplate
  const inOperator = deps.inOperator || Op.in

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

    return blockTemplateModel.create(sanitized)
  }

  /**
   * Met a jour un template existant.
   * @param {number|string} id Identifiant template.
   * @param {object} payload Champs a mettre a jour.
   * @returns {Promise<object>} Template mis a jour.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function updateBlockTemplate(id, payload) {
    const template = await blockTemplateModel.findByPk(id)
    if (!template) {
      throw createHttpError(404, 'Template introuvable.')
    }

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

    await template.update(updates)
    return template
  }

  /**
   * Supprime un template existant.
   * @param {number|string} id Identifiant template.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si introuvable.
   */
  async function deleteBlockTemplate(id) {
    const template = await blockTemplateModel.findByPk(id)
    if (!template) {
      throw createHttpError(404, 'Template introuvable.')
    }

    await template.destroy()
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

        await existing.update({
          description: sanitized.description,
          blocks: sanitized.blocks,
        })
        updated += 1
        items.push(existing)
        continue
      }

      const createdTemplate = await blockTemplateModel.create(sanitized)
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
    importBlockTemplates,
  }
}

module.exports = {
  createBlockTemplateService,
  ...createBlockTemplateService(),
}
