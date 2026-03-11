/* Utilitaires frontend pour la taxonomie projet (option A). */
import taxonomyCatalog from '../../shared/projectTaxonomyCatalog.json'

const TAXONOMY_LIMITS = Object.freeze({
  type: Number(taxonomyCatalog?.limits?.type) || 1,
  stack: Number(taxonomyCatalog?.limits?.stack) || 5,
  technologies: Number(taxonomyCatalog?.limits?.technologies) || 18,
  domains: Number(taxonomyCatalog?.limits?.domains) || 6,
  labels: Number(taxonomyCatalog?.limits?.labels) || 12,
  legacyTags: Number(taxonomyCatalog?.limits?.legacyTags) || 40,
})

const TAXONOMY_AXES = Object.freeze({
  type: Array.isArray(taxonomyCatalog?.axes?.type) ? taxonomyCatalog.axes.type : [],
  stack: Array.isArray(taxonomyCatalog?.axes?.stack) ? taxonomyCatalog.axes.stack : [],
  technologies: Array.isArray(taxonomyCatalog?.axes?.technologies) ? taxonomyCatalog.axes.technologies : [],
  domains: Array.isArray(taxonomyCatalog?.axes?.domains) ? taxonomyCatalog.axes.domains : [],
})

export const PROJECT_TAXONOMY_OPTIONS = Object.freeze({
  type: TAXONOMY_AXES.type.map((entry) => String(entry?.value || '').trim()).filter(Boolean),
  stack: TAXONOMY_AXES.stack.map((entry) => String(entry?.value || '').trim()).filter(Boolean),
  technologies: TAXONOMY_AXES.technologies.map((entry) => String(entry?.value || '').trim()).filter(Boolean),
  domains: TAXONOMY_AXES.domains.map((entry) => String(entry?.value || '').trim()).filter(Boolean),
})

/**
 * Nettoie une valeur textuelle.
 * @param {unknown} value Valeur source.
 * @param {number} maxLength Limite max.
 * @returns {string} Texte nettoye.
 */
function sanitizeText(value, maxLength) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value).trim().slice(0, maxLength)
}

/**
 * Cree une cle de dedup insensible a la casse/accents.
 * @param {unknown} value Valeur source.
 * @returns {string} Cle normalisee.
 */
function normalizeKey(value) {
  return sanitizeText(value, 120)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Construit un index alias -> valeur canonique pour un axe.
 * @param {Array<{value?:string,aliases?:Array<string>}>} options Options d'axe.
 * @returns {Map<string,string>} Index alias.
 */
function buildAliasMap(options) {
  const map = new Map()
  for (const option of options) {
    const canonical = sanitizeText(option?.value, 80)
    if (!canonical) continue
    const aliases = [canonical, ...(Array.isArray(option?.aliases) ? option.aliases : [])]
    for (const alias of aliases) {
      const key = normalizeKey(alias)
      if (!key) continue
      map.set(key, canonical)
    }
  }
  return map
}

const AXIS_ALIAS_MAP = Object.freeze({
  type: buildAliasMap(TAXONOMY_AXES.type),
  stack: buildAliasMap(TAXONOMY_AXES.stack),
  technologies: buildAliasMap(TAXONOMY_AXES.technologies),
  domains: buildAliasMap(TAXONOMY_AXES.domains),
})

/**
 * Transforme string/array en liste de valeurs.
 * @param {unknown} value Valeur source.
 * @returns {Array<string>} Liste plate.
 */
function toInputList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeText(entry, 80)).filter(Boolean)
  }
  const text = sanitizeText(value, 400)
  if (!text) return []
  return text
    .split(/[,;|]/g)
    .map((entry) => sanitizeText(entry, 80))
    .filter(Boolean)
}

/**
 * Dedup de liste en conservant l'ordre.
 * @param {Array<string>} values Valeurs.
 * @param {number} limit Limite max.
 * @returns {Array<string>} Liste unique.
 */
function uniqueList(values, limit) {
  const seen = new Set()
  const output = []
  for (const value of values) {
    const label = sanitizeText(value, 80)
    if (!label) continue
    const key = normalizeKey(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(label)
    if (output.length >= limit) break
  }
  return output
}

/**
 * Retourne une taxonomie vide.
 * @returns {{type:string,stack:Array<string>,technologies:Array<string>,domains:Array<string>,labels:Array<string>}} Taxonomie vide.
 */
export function createEmptyProjectTaxonomy() {
  return {
    type: '',
    stack: [],
    technologies: [],
    domains: [],
    labels: [],
  }
}

/**
 * Resolve une valeur vers une valeur canonique.
 * @param {'type'|'stack'|'technologies'|'domains'|'labels'} axis Axe cible.
 * @param {unknown} raw Valeur source.
 * @param {boolean} allowCustom Autorise les valeurs libres.
 * @returns {string} Valeur resolue.
 */
function resolveAxisValue(axis, raw, allowCustom) {
  const cleaned = sanitizeText(raw, 80)
  if (!cleaned) return ''

  const key = normalizeKey(cleaned)
  if (!key) return ''

  const mapped = AXIS_ALIAS_MAP[axis]?.get(key)
  if (mapped) return mapped

  if (allowCustom) return cleaned
  return ''
}

/**
 * Ajoute des valeurs uniques sur un axe.
 * @param {Array<string>} target Liste cible.
 * @param {Array<string>} values Valeurs candidates.
 * @param {number} limit Limite max.
 * @returns {void}
 */
function appendUnique(target, values, limit) {
  const seen = new Set(target.map((entry) => normalizeKey(entry)).filter(Boolean))
  for (const value of values) {
    const label = sanitizeText(value, 80)
    if (!label) continue
    const key = normalizeKey(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    target.push(label)
    if (target.length >= limit) break
  }
}

/**
 * Classe un legacy tag vers un axe connu.
 * @param {string} rawTag Tag source.
 * @returns {{axis:'type'|'stack'|'technologies'|'domains'|'labels',value:string}|null} Classification.
 */
function classifyLegacyTag(rawTag) {
  const cleaned = sanitizeText(rawTag, 80)
  if (!cleaned) return null

  for (const axis of ['type', 'stack', 'technologies', 'domains']) {
    const known = resolveAxisValue(axis, cleaned, false)
    if (known) {
      return { axis, value: known }
    }
  }

  return { axis: 'labels', value: cleaned }
}

/**
 * Normalise une taxonomie + fallback tags legacy.
 * @param {unknown} taxonomyInput Taxonomie brute.
 * @param {unknown} fallbackTags Tags legacy.
 * @returns {{type:string,stack:Array<string>,technologies:Array<string>,domains:Array<string>,labels:Array<string>}} Taxonomie normalisee.
 */
export function normalizeProjectTaxonomy(taxonomyInput, fallbackTags) {
  const taxonomy = createEmptyProjectTaxonomy()
  const raw = taxonomyInput && typeof taxonomyInput === 'object' ? taxonomyInput : {}
  const pendingLabels = []

  const typeCandidates = [raw.type, raw.category].flatMap((entry) => toInputList(entry))
  for (const candidate of typeCandidates) {
    const resolved = resolveAxisValue('type', candidate, false)
    if (resolved) {
      taxonomy.type = resolved
      break
    }
    pendingLabels.push(candidate)
  }

  appendUnique(
    taxonomy.stack,
    toInputList(raw.stack)
      .map((entry) => resolveAxisValue('stack', entry, false))
      .filter(Boolean),
    TAXONOMY_LIMITS.stack
  )

  appendUnique(
    taxonomy.technologies,
    [
      ...toInputList(raw.technologies),
      ...toInputList(raw.tech),
      ...toInputList(raw.technos),
      ...toInputList(raw.techno),
    ]
      .map((entry) => resolveAxisValue('technologies', entry, true))
      .filter(Boolean),
    TAXONOMY_LIMITS.technologies
  )

  appendUnique(
    taxonomy.domains,
    [...toInputList(raw.domains), ...toInputList(raw.domain)]
      .map((entry) => resolveAxisValue('domains', entry, false))
      .filter(Boolean),
    TAXONOMY_LIMITS.domains
  )

  appendUnique(
    taxonomy.labels,
    [...toInputList(raw.labels), ...toInputList(raw.tags)]
      .map((entry) => resolveAxisValue('labels', entry, true))
      .filter(Boolean),
    TAXONOMY_LIMITS.labels
  )

  for (const tag of Array.isArray(fallbackTags) ? fallbackTags : []) {
    const classified = classifyLegacyTag(tag)
    if (!classified) continue

    if (classified.axis === 'type') {
      if (!taxonomy.type) taxonomy.type = classified.value
      continue
    }
    if (classified.axis === 'stack') {
      appendUnique(taxonomy.stack, [classified.value], TAXONOMY_LIMITS.stack)
      continue
    }
    if (classified.axis === 'technologies') {
      appendUnique(taxonomy.technologies, [classified.value], TAXONOMY_LIMITS.technologies)
      continue
    }
    if (classified.axis === 'domains') {
      appendUnique(taxonomy.domains, [classified.value], TAXONOMY_LIMITS.domains)
      continue
    }

    pendingLabels.push(classified.value)
  }

  appendUnique(
    taxonomy.labels,
    uniqueList(
      pendingLabels
        .map((entry) => resolveAxisValue('labels', entry, true))
        .filter(Boolean),
      TAXONOMY_LIMITS.labels
    ),
    TAXONOMY_LIMITS.labels
  )

  taxonomy.stack = uniqueList(taxonomy.stack, TAXONOMY_LIMITS.stack)
  taxonomy.technologies = uniqueList(taxonomy.technologies, TAXONOMY_LIMITS.technologies)
  taxonomy.domains = uniqueList(taxonomy.domains, TAXONOMY_LIMITS.domains)
  taxonomy.labels = uniqueList(taxonomy.labels, TAXONOMY_LIMITS.labels)

  return taxonomy
}

/**
 * Construit des tags legacy a partir d'une taxonomie.
 * @param {unknown} taxonomyInput Taxonomie source.
 * @param {unknown} fallbackTags Tags fallback.
 * @returns {Array<string>} Tags dedupes.
 */
export function taxonomyToLegacyTags(taxonomyInput, fallbackTags) {
  const taxonomy = normalizeProjectTaxonomy(taxonomyInput, fallbackTags)
  const merged = [
    taxonomy.type,
    ...taxonomy.stack,
    ...taxonomy.technologies,
    ...taxonomy.domains,
    ...taxonomy.labels,
    ...(Array.isArray(fallbackTags) ? fallbackTags : []),
  ].filter(Boolean)

  return uniqueList(merged, TAXONOMY_LIMITS.legacyTags)
}

/**
 * Retourne la taxonomie normalisee depuis un projet.
 * @param {object} project Projet.
 * @returns {{type:string,stack:Array<string>,technologies:Array<string>,domains:Array<string>,labels:Array<string>}} Taxonomie.
 */
export function getProjectTaxonomy(project) {
  return normalizeProjectTaxonomy(project?.taxonomy, project?.tags)
}

/**
 * Retourne une liste de chips a afficher.
 * @param {object} project Projet.
 * @param {number} [limit=8] Nombre max.
 * @returns {Array<string>} Chips.
 */
export function getProjectDisplayTags(project, limit = 8) {
  const taxonomy = getProjectTaxonomy(project)
  return uniqueList(
    [
      ...taxonomy.technologies,
      ...taxonomy.stack,
      ...taxonomy.domains,
      ...taxonomy.labels,
      taxonomy.type,
    ].filter(Boolean),
    limit
  )
}

/**
 * Convertit des facettes API vers une liste simple.
 * @param {unknown} facets Facettes API.
 * @param {'type'|'stack'|'technologies'|'domains'|'labels'} axis Axe.
 * @returns {Array<{value:string,count:number}>} Liste axe.
 */
export function getFacetAxis(facets, axis) {
  if (!facets || typeof facets !== 'object') return []
  const axisValues = Array.isArray(facets[axis]) ? facets[axis] : []
  return axisValues
    .map((entry) => {
      if (typeof entry === 'string') {
        return { value: entry, count: 0 }
      }
      return {
        value: sanitizeText(entry?.value, 80),
        count: Number.isFinite(Number(entry?.count)) ? Number(entry.count) : 0,
      }
    })
    .filter((entry) => entry.value)
}
