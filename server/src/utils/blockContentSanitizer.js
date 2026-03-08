/* Factory de sanitization des contenus blocs (paragraph/heading/section...) partagee entre services CMS. */

const DEFAULT_ALLOWED_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'image',
  'code',
  'quote',
  'list',
  'section',
])

const DEFAULT_SECTION_LAYOUT_COLUMNS = {
  '1-col': 1,
  '2-col': 2,
  '3-col': 3,
}

const DEFAULT_SECTION_VARIANTS = new Set(['default', 'soft', 'accent'])
const DEFAULT_SECTION_SPACINGS = new Set(['sm', 'md', 'lg'])

/**
 * Construit un sanitiseur de contenus bloc configurable.
 * @param {object} [options={}] Options de construction.
 * @param {Set<string>} [options.allowedBlockTypes] Types blocs autorises.
 * @param {object} [options.sectionLayoutColumns] Mapping layout => nb colonnes.
 * @param {Set<string>} [options.sectionVariants] Variants section autorises.
 * @param {Set<string>} [options.sectionSpacings] Espacements section autorises.
 * @param {number} [options.maxBlocks=250] Limite globale de blocs.
 * @param {number} [options.maxListItems=80] Limite items liste.
 * @param {number} [options.listDepthLimit=3] Profondeur max liste imbriquee.
 * @param {boolean} [options.truncateDepthLimitItems=true] Tronque les items au depth limit.
 * @param {(value: unknown, maxLength: number, fallback?: string) => string} options.sanitizeText Sanitiseur texte.
 * @param {(value: unknown, maxLength: number) => string} options.sanitizeIdentifier Sanitiseur identifiants.
 * @returns {{sanitizeBlocks: Function}} API sanitization.
 */
function createBlockContentSanitizer(options = {}) {
  const allowedBlockTypes = options.allowedBlockTypes || DEFAULT_ALLOWED_BLOCK_TYPES
  const sectionLayoutColumns = options.sectionLayoutColumns || DEFAULT_SECTION_LAYOUT_COLUMNS
  const sectionVariants = options.sectionVariants || DEFAULT_SECTION_VARIANTS
  const sectionSpacings = options.sectionSpacings || DEFAULT_SECTION_SPACINGS
  const maxBlocks = Number.isInteger(options.maxBlocks) && options.maxBlocks > 0 ? options.maxBlocks : 250
  const maxListItems = Number.isInteger(options.maxListItems) && options.maxListItems > 0 ? options.maxListItems : 80
  const listDepthLimit = Number.isInteger(options.listDepthLimit) && options.listDepthLimit > 0
    ? options.listDepthLimit
    : 3
  const truncateDepthLimitItems = options.truncateDepthLimitItems !== false
  const sanitizeText = options.sanitizeText
  const sanitizeIdentifier = options.sanitizeIdentifier

  if (typeof sanitizeText !== 'function' || typeof sanitizeIdentifier !== 'function') {
    throw new Error('createBlockContentSanitizer requires sanitizeText and sanitizeIdentifier functions.')
  }

  /**
   * Nettoie recursivement les items d'une liste.
   * @param {unknown} items Items bruts.
   * @param {number} [depth=0] Profondeur courante.
   * @returns {Array<string|{content:string,items:Array}>} Liste nettoyee.
   */
  function sanitizeListItems(items, depth = 0) {
    if (!Array.isArray(items)) {
      return ['']
    }

    if (depth >= listDepthLimit) {
      const flattened = items
        .map((item) => {
          if (typeof item === 'string') return sanitizeText(item, 500)
          return sanitizeText(item?.content, 500)
        })
        .filter(Boolean)

      if (flattened.length === 0) {
        return ['']
      }

      return truncateDepthLimitItems ? flattened.slice(0, maxListItems) : flattened
    }

    const sanitized = items
      .slice(0, maxListItems)
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
   * Nettoie le layout d'une section.
   * @param {unknown} value Valeur brute.
   * @returns {string} Layout normalise.
   */
  function sanitizeSectionLayout(value) {
    const normalized = sanitizeIdentifier(value, 12)
    if (Object.prototype.hasOwnProperty.call(sectionLayoutColumns, normalized)) {
      return normalized
    }
    return '2-col'
  }

  /**
   * Retourne le nombre de colonnes attendu pour un layout.
   * @param {string} layout Layout normalise.
   * @returns {number} Nombre de colonnes.
   */
  function getSectionColumnCount(layout) {
    return sectionLayoutColumns[layout] || 2
  }

  /**
   * Nettoie le variant visuel de section.
   * @param {unknown} value Valeur brute.
   * @returns {string} Variant section.
   */
  function sanitizeSectionVariant(value) {
    const normalized = sanitizeIdentifier(value, 20)
    if (sectionVariants.has(normalized)) {
      return normalized
    }
    return 'default'
  }

  /**
   * Nettoie l'espacement section.
   * @param {unknown} value Valeur brute.
   * @returns {string} Spacing section.
   */
  function sanitizeSectionSpacing(value) {
    const normalized = sanitizeIdentifier(value, 20)
    if (sectionSpacings.has(normalized)) {
      return normalized
    }
    return 'md'
  }

  /**
   * Nettoie les colonnes de section.
   * @param {unknown} columns Colonnes brutes.
   * @param {string} layout Layout section normalise.
   * @param {number} depth Profondeur courante.
   * @returns {Array<Array<object>>} Colonnes normalisees.
   */
  function sanitizeSectionColumns(columns, layout, depth) {
    const columnCount = getSectionColumnCount(layout)
    const sourceColumns = Array.isArray(columns) ? columns : []

    return Array.from({ length: columnCount }, (_, index) => {
      const rawColumn = Array.isArray(sourceColumns[index]) ? sourceColumns[index] : []
      return sanitizeBlocks(rawColumn, {
        allowSection: false,
        depth,
        limit: maxListItems,
      })
    })
  }

  /**
   * Nettoie un bloc individuel.
   * @param {unknown} block Bloc brut.
   * @param {number} [depth=0] Profondeur de nettoyage.
   * @param {boolean} [allowSection=true] Autorise les sections.
   * @returns {object|null} Bloc normalise ou null.
   */
  function sanitizeBlock(block, depth = 0, allowSection = true) {
    if (!block || typeof block !== 'object') return null

    const type = sanitizeIdentifier(block.type, 20)
    if (!allowedBlockTypes.has(type)) return null
    if (type === 'section' && !allowSection) return null

    const common = {
      id: sanitizeIdentifier(block.id, 64) || null,
      type,
    }

    switch (type) {
      case 'section': {
        if (depth >= 2) return null
        const layout = sanitizeSectionLayout(block.layout)
        return {
          ...common,
          layout,
          variant: sanitizeSectionVariant(block.variant),
          spacing: sanitizeSectionSpacing(block.spacing),
          anchor: sanitizeIdentifier(block.anchor, 80) || '',
          columns: sanitizeSectionColumns(block.columns, layout, depth + 1),
        }
      }
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
   * Nettoie une collection complete de blocs.
   * @param {unknown} blocks Collection brute.
   * @param {object} [options={}] Options de nettoyage.
   * @param {boolean} [options.allowSection=true] Autorise les sections.
   * @param {number} [options.depth=0] Profondeur de nettoyage.
   * @param {number} [options.limit=maxBlocks] Limite de blocs.
   * @returns {Array<object>} Blocs normalises.
   */
  function sanitizeBlocks(blocks, options = {}) {
    if (!Array.isArray(blocks)) return []
    const allowSection = options.allowSection !== false
    const depth = Number.isInteger(options.depth) ? options.depth : 0
    const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : maxBlocks

    return blocks
      .slice(0, limit)
      .map((block) => sanitizeBlock(block, depth, allowSection))
      .filter(Boolean)
  }

  return {
    sanitizeBlocks,
  }
}

module.exports = {
  createBlockContentSanitizer,
}

