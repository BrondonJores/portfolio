/* Service metier du visual builder (persistance + normalisation + versionning). */
const crypto = require('node:crypto')
const { VisualBuilderDraft } = require('../models')
const { createHttpError } = require('../utils/httpError')

const ALLOWED_ENTITIES = new Set(['article', 'project', 'newsletter', 'page'])
const ALLOWED_BLOCK_TYPES = new Set(['paragraph', 'heading', 'image', 'code', 'quote', 'list'])
const MAX_BLOCKS = 250

/**
 * Tronque et normalise une chaine.
 * @param {unknown} value Valeur brute.
 * @param {number} maxLength Longueur maximale.
 * @param {string} [fallback=''] Valeur de repli.
 * @returns {string} Texte nettoye.
 */
function sanitizeText(value, maxLength, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, maxLength)
}

/**
 * Nettoie un identifiant technique (id bloc, channel, resource...).
 * @param {unknown} value Valeur brute.
 * @param {number} maxLength Taille max.
 * @returns {string} Valeur normalisee.
 */
function sanitizeIdentifier(value, maxLength) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '')
    .slice(0, maxLength)
}

/**
 * Parse un entier positif.
 * @param {unknown} value Valeur brute.
 * @returns {number|null} Entier strict positif ou `null`.
 */
function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

/**
 * Valide et normalise l'entite du builder.
 * @param {unknown} entity Entite source.
 * @returns {'article'|'project'|'newsletter'|'page'} Entite valide.
 * @throws {Error} Erreur 422 si invalide.
 */
function normalizeEntity(entity) {
  const normalized = sanitizeIdentifier(entity, 30)
  if (!ALLOWED_ENTITIES.has(normalized)) {
    throw createHttpError(422, "L'entite builder doit etre article, project, newsletter ou page.")
  }
  return normalized
}

/**
 * Valide et normalise un channel de brouillon.
 * @param {unknown} channel Channel source.
 * @returns {string} Channel valide.
 * @throws {Error} Erreur 422 si invalide.
 */
function normalizeChannel(channel) {
  const normalized = sanitizeIdentifier(channel, 120)
  if (normalized.length < 3) {
    throw createHttpError(422, 'Le channel builder est invalide.')
  }
  return normalized
}

/**
 * Extrait l'identifiant de ressource depuis `entity:resource`.
 * @param {string} channel Channel normalise.
 * @returns {string|null} Resource id normalise ou `null`.
 */
function extractResourceIdFromChannel(channel) {
  const parts = String(channel).split(':')
  if (parts.length < 2) return null

  const resource = sanitizeIdentifier(parts.slice(1).join(':'), 80)
  if (!resource || resource === 'new') {
    return null
  }
  return resource
}

/**
 * Nettoie recursivement les elements d'une liste.
 * @param {unknown} items Valeur brute.
 * @param {number} [depth=0] Profondeur courante.
 * @returns {Array<string | {content: string, items: Array}>} Liste nettoyee.
 */
function sanitizeListItems(items, depth = 0) {
  if (!Array.isArray(items)) {
    return ['']
  }

  if (depth >= 3) {
    const flatItems = items
      .map((item) => {
        if (typeof item === 'string') return sanitizeText(item, 500)
        return sanitizeText(item?.content, 500)
      })
      .filter(Boolean)

    return flatItems.length > 0 ? flatItems.slice(0, 80) : ['']
  }

  const sanitized = items
    .slice(0, 80)
    .map((item) => {
      if (typeof item === 'string') {
        return sanitizeText(item, 500)
      }

      if (!item || typeof item !== 'object') {
        return ''
      }

      return {
        content: sanitizeText(item.content, 500),
        items: sanitizeListItems(item.items, depth + 1),
      }
    })
    .filter((item) => {
      if (typeof item === 'string') return item.length > 0
      return Boolean(item?.content || (Array.isArray(item?.items) && item.items.length > 0))
    })

  return sanitized.length > 0 ? sanitized : ['']
}

/**
 * Nettoie un bloc du builder et force un schema autorise.
 * @param {unknown} block Bloc source.
 * @returns {object|null} Bloc normalise ou `null` si invalide.
 */
function sanitizeBlock(block) {
  if (!block || typeof block !== 'object') return null

  const type = sanitizeIdentifier(block.type, 20)
  if (!ALLOWED_BLOCK_TYPES.has(type)) {
    return null
  }

  const common = {
    id: sanitizeIdentifier(block.id, 64) || null,
    type,
  }

  switch (type) {
    case 'heading':
      return {
        ...common,
        level: Number(block.level) === 3 ? 3 : 2,
        content: sanitizeText(block.content, 2000),
      }
    case 'image':
      return {
        ...common,
        url: sanitizeText(block.url, 2000),
        caption: sanitizeText(block.caption, 500),
      }
    case 'code':
      return {
        ...common,
        language: sanitizeText(block.language, 40, 'js') || 'js',
        content: sanitizeText(block.content, 200000),
      }
    case 'quote':
      return {
        ...common,
        content: sanitizeText(block.content, 4000),
        author: sanitizeText(block.author, 200),
      }
    case 'list':
      return {
        ...common,
        items: sanitizeListItems(block.items),
      }
    case 'paragraph':
    default:
      return {
        ...common,
        content: sanitizeText(block.content, 8000),
      }
  }
}

/**
 * Nettoie la collection complete des blocs du builder.
 * @param {unknown} blocks Collection brute.
 * @returns {Array<object>} Blocs valides.
 */
function sanitizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  return blocks
    .slice(0, MAX_BLOCKS)
    .map((block) => sanitizeBlock(block))
    .filter(Boolean)
}

/**
 * Normalise l'identifiant admin (create/update attribution).
 * @param {unknown} adminId Identifiant brut.
 * @returns {number|null} Identifiant valide ou `null`.
 */
function normalizeAdminId(adminId) {
  return parsePositiveInteger(adminId)
}

/**
 * Construit un hash SHA-256 du contenu, pour detecter les modifications.
 * @param {{title: string, blocks: Array<object>}} payload Donnees normalisees.
 * @param {(value: string) => string} hashFactory Fabrique de hash injectee.
 * @returns {string} Hash hex.
 */
function computeContentHash(payload, hashFactory) {
  return hashFactory(JSON.stringify(payload))
}

/**
 * Convertit un modele Sequelize vers DTO API.
 * @param {object} draft Brouillon Sequelize.
 * @returns {object} DTO serialisable.
 */
function mapDraftModel(draft) {
  return {
    id: draft.id,
    entity: draft.entity_type,
    channel: draft.channel,
    resourceId: draft.resource_id,
    title: draft.title || '',
    blocks: Array.isArray(draft.blocks) ? draft.blocks : [],
    versionNumber: Number.parseInt(String(draft.version_number || 1), 10) || 1,
    createdAt: draft.created_at,
    updatedAt: draft.updated_at,
  }
}

/**
 * Construit le service de persistance du visual builder (DI friendly).
 * @param {object} [deps={}] Dependances injectables.
 * @param {object} [deps.visualBuilderDraftModel] Modele Sequelize.
 * @param {(value: string) => string} [deps.hashFactory] Fabrique de hash.
 * @returns {object} API metier du visual builder.
 */
function createVisualBuilderDraftService(deps = {}) {
  const visualBuilderDraftModel = deps.visualBuilderDraftModel || VisualBuilderDraft
  const hashFactory =
    deps.hashFactory ||
    ((value) => crypto.createHash('sha256').update(value).digest('hex'))

  /**
   * Charge un brouillon unique par `(entity, channel)`.
   * @param {string} entity Entity normalisee.
   * @param {string} channel Channel normalise.
   * @returns {Promise<object|null>} Brouillon Sequelize ou `null`.
   */
  async function findDraft(entity, channel) {
    return visualBuilderDraftModel.findOne({
      where: {
        entity_type: entity,
        channel,
      },
    })
  }

  /**
   * Retourne le brouillon courant pour une entite + channel.
   * @param {object} params Parametres d'acces.
   * @param {string} params.entity Entite cible.
   * @param {string} params.channel Channel de brouillon.
   * @returns {Promise<object|null>} Brouillon DTO ou `null`.
   */
  async function getCurrentVisualBuilderDraft(params) {
    const entity = normalizeEntity(params?.entity)
    const channel = normalizeChannel(params?.channel)
    const draft = await findDraft(entity, channel)
    if (!draft) return null
    return mapDraftModel(draft)
  }

  /**
   * Cree ou met a jour le brouillon courant.
   * Si le hash de contenu n'a pas change, aucune ecriture n'est faite.
   * @param {object} payload Donnees brutes.
   * @param {string} payload.entity Entite builder.
   * @param {string} payload.channel Channel de brouillon.
   * @param {string} [payload.title] Titre de travail.
   * @param {Array<object>} [payload.blocks] Liste des blocs.
   * @param {number|string} [payload.adminId] Admin auteur.
   * @returns {Promise<{draft: object, changed: boolean, created: boolean}>} Resultat d'upsert.
   */
  async function saveCurrentVisualBuilderDraft(payload) {
    const entity = normalizeEntity(payload?.entity)
    const channel = normalizeChannel(payload?.channel)
    const title = sanitizeText(payload?.title, 160, '')
    const blocks = sanitizeBlocks(payload?.blocks)
    const adminId = normalizeAdminId(payload?.adminId)
    const contentHash = computeContentHash({ title, blocks }, hashFactory)
    const resourceId = extractResourceIdFromChannel(channel)

    const existing = await findDraft(entity, channel)

    if (!existing) {
      const created = await visualBuilderDraftModel.create({
        entity_type: entity,
        channel,
        resource_id: resourceId,
        title,
        blocks,
        content_hash: contentHash,
        version_number: 1,
        created_by_admin_id: adminId,
        updated_by_admin_id: adminId,
      })

      return {
        draft: mapDraftModel(created),
        changed: true,
        created: true,
      }
    }

    if (existing.content_hash === contentHash) {
      return {
        draft: mapDraftModel(existing),
        changed: false,
        created: false,
      }
    }

    const currentVersion = Number.parseInt(String(existing.version_number || 0), 10)
    const nextVersion = Number.isFinite(currentVersion) && currentVersion > 0
      ? currentVersion + 1
      : 1

    await existing.update({
      title,
      blocks,
      content_hash: contentHash,
      resource_id: resourceId,
      version_number: nextVersion,
      updated_by_admin_id: adminId,
    })

    return {
      draft: mapDraftModel(existing),
      changed: true,
      created: false,
    }
  }

  /**
   * Supprime le brouillon courant pour une entite + channel.
   * @param {object} params Parametres d'acces.
   * @param {string} params.entity Entite cible.
   * @param {string} params.channel Channel de brouillon.
   * @returns {Promise<{deleted: boolean}>} Indique si un brouillon existait.
   */
  async function deleteCurrentVisualBuilderDraft(params) {
    const entity = normalizeEntity(params?.entity)
    const channel = normalizeChannel(params?.channel)
    const draft = await findDraft(entity, channel)

    if (!draft) {
      return { deleted: false }
    }

    await draft.destroy()
    return { deleted: true }
  }

  return {
    getCurrentVisualBuilderDraft,
    saveCurrentVisualBuilderDraft,
    deleteCurrentVisualBuilderDraft,
  }
}

module.exports = {
  createVisualBuilderDraftService,
  ...createVisualBuilderDraftService(),
}
