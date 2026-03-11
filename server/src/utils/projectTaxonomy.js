/* Outils de normalisation et de filtrage de la taxonomie projet (option A). */

const taxonomyCatalog = require('../../../shared/projectTaxonomyCatalog.json')

const TAXONOMY_LIMITS = Object.freeze({
  type: Number(taxonomyCatalog?.limits?.type) || 1,
  stack: Number(taxonomyCatalog?.limits?.stack) || 5,
  technologies: Number(taxonomyCatalog?.limits?.technologies) || 18,
  domains: Number(taxonomyCatalog?.limits?.domains) || 6,
  labels: Number(taxonomyCatalog?.limits?.labels) || 12,
  legacyTags: Number(taxonomyCatalog?.limits?.legacyTags) || 40,
})

const TAXONOMY_CATALOG = Object.freeze({
  type: Array.isArray(taxonomyCatalog?.axes?.type) ? taxonomyCatalog.axes.type : [],
  stack: Array.isArray(taxonomyCatalog?.axes?.stack) ? taxonomyCatalog.axes.stack : [],
  technologies: Array.isArray(taxonomyCatalog?.axes?.technologies) ? taxonomyCatalog.axes.technologies : [],
  domains: Array.isArray(taxonomyCatalog?.axes?.domains) ? taxonomyCatalog.axes.domains : [],
})

/**
 * Tronque et nettoie une chaine.
 * @param {unknown} value Valeur source.
 * @param {number} maxLength Limite max.
 * @returns {string} Chaine nettoyee.
 */
function sanitizeText(value, maxLength) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value).trim().slice(0, maxLength)
}

/**
 * Normalise une cle pour dedup/index (insensible casse/accents).
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
 * Convertit une valeur (array/string) en liste plate de tokens.
 * @param {unknown} value Valeur source.
 * @returns {Array<string>} Liste de candidats.
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
 * Indexe les aliases -> valeur canonique pour un axe.
 * @param {Array<{value:string,aliases?:Array<string>}>} options Options d'axe.
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
  type: buildAliasMap(TAXONOMY_CATALOG.type),
  stack: buildAliasMap(TAXONOMY_CATALOG.stack),
  technologies: buildAliasMap(TAXONOMY_CATALOG.technologies),
  domains: buildAliasMap(TAXONOMY_CATALOG.domains),
})

/**
 * Dedup simple de valeurs en conservant l'ordre.
 * @param {Array<string>} values Valeurs source.
 * @param {number} limit Limite max.
 * @returns {Array<string>} Valeurs uniques.
 */
function uniqueList(values, limit) {
  const seen = new Set()
  const output = []

  for (const raw of values) {
    const label = sanitizeText(raw, 80)
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
 * Resolve une valeur sur un axe.
 * Si `allowCustom=true`, les inconnues restent en texte nettoye.
 * @param {'type'|'stack'|'technologies'|'domains'|'labels'} axis Axe cible.
 * @param {unknown} raw Valeur source.
 * @param {boolean} allowCustom Autorise les valeurs libres.
 * @returns {string} Valeur canonique ou libre, sinon chaine vide.
 */
function resolveAxisValue(axis, raw, allowCustom) {
  const cleaned = sanitizeText(raw, 80)
  if (!cleaned) return ''
  const key = normalizeKey(cleaned)
  if (!key) return ''

  const mapped = AXIS_ALIAS_MAP[axis]?.get(key)
  if (mapped) return mapped

  if (allowCustom) {
    return cleaned
  }

  return ''
}

/**
 * Ajoute des valeurs dedupees dans une liste.
 * @param {Array<string>} target Cible.
 * @param {Array<string>} values Valeurs a injecter.
 * @param {number} limit Limite max.
 * @returns {void}
 */
function appendUnique(target, values, limit) {
  const existing = new Set(target.map((entry) => normalizeKey(entry)).filter(Boolean))
  for (const value of values) {
    const label = sanitizeText(value, 80)
    if (!label) continue
    const key = normalizeKey(label)
    if (!key || existing.has(key)) continue
    existing.add(key)
    target.push(label)
    if (target.length >= limit) break
  }
}

/**
 * Cree une taxonomie projet vide.
 * @returns {{type:string,stack:Array<string>,technologies:Array<string>,domains:Array<string>,labels:Array<string>}} Taxonomie vide.
 */
function createEmptyProjectTaxonomy() {
  return {
    type: '',
    stack: [],
    technologies: [],
    domains: [],
    labels: [],
  }
}

/**
 * Classe un legacy tag vers un axe connu si possible.
 * @param {string} rawTag Tag legacy.
 * @returns {{axis:'type'|'stack'|'technologies'|'domains'|'labels',value:string}|null} Classification.
 */
function classifyLegacyTag(rawTag) {
  const cleaned = sanitizeText(rawTag, 80)
  if (!cleaned) return null

  for (const axis of ['type', 'stack', 'technologies', 'domains']) {
    const mapped = resolveAxisValue(axis, cleaned, false)
    if (mapped) {
      return { axis, value: mapped }
    }
  }

  return { axis: 'labels', value: cleaned }
}

/**
 * Normalise une taxonomie projet avec fallback legacy tags.
 * @param {unknown} taxonomyInput Objet taxonomy brut.
 * @param {unknown} legacyTags Liste tags legacy.
 * @returns {{type:string,stack:Array<string>,technologies:Array<string>,domains:Array<string>,labels:Array<string>}} Taxonomie normalisee.
 */
function normalizeProjectTaxonomy(taxonomyInput, legacyTags) {
  const taxonomy = createEmptyProjectTaxonomy()
  const rawTaxonomy = taxonomyInput && typeof taxonomyInput === 'object' ? taxonomyInput : {}
  const pendingLabels = []

  const rawTypeCandidates = [
    rawTaxonomy.type,
    rawTaxonomy.category,
  ]
    .flatMap((entry) => toInputList(entry))

  for (const candidate of rawTypeCandidates) {
    const resolved = resolveAxisValue('type', candidate, false)
    if (resolved) {
      taxonomy.type = resolved
      break
    }
    if (candidate) {
      pendingLabels.push(candidate)
    }
  }

  const stackValues = toInputList(rawTaxonomy.stack)
    .map((value) => resolveAxisValue('stack', value, false) || '')
    .filter(Boolean)
  appendUnique(taxonomy.stack, stackValues, TAXONOMY_LIMITS.stack)

  const technologyValues = [
    ...toInputList(rawTaxonomy.technologies),
    ...toInputList(rawTaxonomy.tech),
    ...toInputList(rawTaxonomy.technos),
    ...toInputList(rawTaxonomy.techno),
  ]
    .map((value) => resolveAxisValue('technologies', value, true) || '')
    .filter(Boolean)
  appendUnique(taxonomy.technologies, technologyValues, TAXONOMY_LIMITS.technologies)

  const domainValues = [
    ...toInputList(rawTaxonomy.domains),
    ...toInputList(rawTaxonomy.domain),
  ]
    .map((value) => resolveAxisValue('domains', value, false) || '')
    .filter(Boolean)
  appendUnique(taxonomy.domains, domainValues, TAXONOMY_LIMITS.domains)

  const labelValues = [
    ...toInputList(rawTaxonomy.labels),
    ...toInputList(rawTaxonomy.tags),
  ]
    .map((value) => resolveAxisValue('labels', value, true) || '')
    .filter(Boolean)
  appendUnique(taxonomy.labels, labelValues, TAXONOMY_LIMITS.labels)

  const legacyCandidates = Array.isArray(legacyTags) ? legacyTags : []
  for (const rawTag of legacyCandidates) {
    const classified = classifyLegacyTag(sanitizeText(rawTag, 80))
    if (!classified) continue
    if (classified.axis === 'type') {
      if (!taxonomy.type) {
        taxonomy.type = classified.value
      }
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
    uniqueList(pendingLabels.map((value) => resolveAxisValue('labels', value, true)), TAXONOMY_LIMITS.labels),
    TAXONOMY_LIMITS.labels
  )

  taxonomy.stack = uniqueList(taxonomy.stack, TAXONOMY_LIMITS.stack)
  taxonomy.technologies = uniqueList(taxonomy.technologies, TAXONOMY_LIMITS.technologies)
  taxonomy.domains = uniqueList(taxonomy.domains, TAXONOMY_LIMITS.domains)
  taxonomy.labels = uniqueList(taxonomy.labels, TAXONOMY_LIMITS.labels)

  return taxonomy
}

/**
 * Construit la liste legacy `tags` depuis une taxonomie.
 * @param {unknown} taxonomyInput Taxonomie source.
 * @param {unknown} legacyTags Liste legacy additionnelle.
 * @returns {Array<string>} Tags dedupes.
 */
function buildProjectTagsFromTaxonomy(taxonomyInput, legacyTags) {
  const taxonomy = normalizeProjectTaxonomy(taxonomyInput, legacyTags)
  const merged = [
    taxonomy.type,
    ...taxonomy.stack,
    ...taxonomy.technologies,
    ...taxonomy.domains,
    ...taxonomy.labels,
    ...(Array.isArray(legacyTags) ? legacyTags : []),
  ].filter(Boolean)

  return uniqueList(merged, TAXONOMY_LIMITS.legacyTags)
}

/**
 * Compare un projet a un ensemble de filtres taxonomie.
 * @param {unknown} project Projet brut (modele ou plain object).
 * @param {object} filters Filtres query.
 * @param {unknown} [filters.tag] Tag global legacy.
 * @param {unknown} [filters.type] Filtre type.
 * @param {unknown} [filters.stack] Filtre stack.
 * @param {unknown} [filters.technology] Filtre techno.
 * @param {unknown} [filters.domain] Filtre domaine.
 * @param {unknown} [filters.label] Filtre label.
 * @returns {boolean} True si le projet satisfait les filtres.
 */
function matchesProjectFilters(project, filters) {
  const source = project && typeof project.toJSON === 'function' ? project.toJSON() : project || {}
  const taxonomy = normalizeProjectTaxonomy(source.taxonomy, source.tags)
  const tags = buildProjectTagsFromTaxonomy(taxonomy, source.tags)

  const normalizedTagFilter = uniqueList(toInputList(filters?.tag), 8).map((entry) => normalizeKey(entry))
  const normalizedTypeFilter = uniqueList(toInputList(filters?.type), 4).map((entry) => normalizeKey(entry))
  const normalizedStackFilter = uniqueList(toInputList(filters?.stack), 8).map((entry) => normalizeKey(entry))
  const normalizedTechFilter = uniqueList(toInputList(filters?.technology), 12).map((entry) => normalizeKey(entry))
  const normalizedDomainFilter = uniqueList(toInputList(filters?.domain), 8).map((entry) => normalizeKey(entry))
  const normalizedLabelFilter = uniqueList(toInputList(filters?.label), 8).map((entry) => normalizeKey(entry))

  const tagSet = new Set(tags.map((entry) => normalizeKey(entry)).filter(Boolean))
  const stackSet = new Set(taxonomy.stack.map((entry) => normalizeKey(entry)).filter(Boolean))
  const techSet = new Set(taxonomy.technologies.map((entry) => normalizeKey(entry)).filter(Boolean))
  const domainSet = new Set(taxonomy.domains.map((entry) => normalizeKey(entry)).filter(Boolean))
  const labelSet = new Set(taxonomy.labels.map((entry) => normalizeKey(entry)).filter(Boolean))
  const typeKey = normalizeKey(taxonomy.type)

  if (normalizedTagFilter.length > 0 && !normalizedTagFilter.some((entry) => tagSet.has(entry))) {
    return false
  }

  if (normalizedTypeFilter.length > 0 && !normalizedTypeFilter.includes(typeKey)) {
    return false
  }

  if (normalizedStackFilter.length > 0 && !normalizedStackFilter.some((entry) => stackSet.has(entry))) {
    return false
  }

  if (normalizedTechFilter.length > 0 && !normalizedTechFilter.some((entry) => techSet.has(entry))) {
    return false
  }

  if (normalizedDomainFilter.length > 0 && !normalizedDomainFilter.some((entry) => domainSet.has(entry))) {
    return false
  }

  if (normalizedLabelFilter.length > 0 && !normalizedLabelFilter.some((entry) => labelSet.has(entry))) {
    return false
  }

  return true
}

/**
 * Construit des facettes publiques (valeur + count) depuis une collection de projets.
 * @param {Array<unknown>} projects Liste projets.
 * @returns {{type:Array<{value:string,count:number}>,stack:Array<{value:string,count:number}>,technologies:Array<{value:string,count:number}>,domains:Array<{value:string,count:number}>,labels:Array<{value:string,count:number}>}} Facettes.
 */
function buildProjectFacets(projects) {
  const counters = {
    type: new Map(),
    stack: new Map(),
    technologies: new Map(),
    domains: new Map(),
    labels: new Map(),
  }

  for (const item of Array.isArray(projects) ? projects : []) {
    const source = item && typeof item.toJSON === 'function' ? item.toJSON() : item || {}
    const taxonomy = normalizeProjectTaxonomy(source.taxonomy, source.tags)

    if (taxonomy.type) {
      counters.type.set(taxonomy.type, (counters.type.get(taxonomy.type) || 0) + 1)
    }
    for (const stack of taxonomy.stack) {
      counters.stack.set(stack, (counters.stack.get(stack) || 0) + 1)
    }
    for (const technology of taxonomy.technologies) {
      counters.technologies.set(technology, (counters.technologies.get(technology) || 0) + 1)
    }
    for (const domain of taxonomy.domains) {
      counters.domains.set(domain, (counters.domains.get(domain) || 0) + 1)
    }
    for (const label of taxonomy.labels) {
      counters.labels.set(label, (counters.labels.get(label) || 0) + 1)
    }
  }

  /**
   * Convertit une map de compte vers tableau trie.
   * @param {Map<string,number>} map Map source.
   * @returns {Array<{value:string,count:number}>} Tableau trie.
   */
  function toSortedEntries(map) {
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count
        }
        return a.value.localeCompare(b.value, 'fr', { sensitivity: 'base' })
      })
      .slice(0, 40)
  }

  return {
    type: toSortedEntries(counters.type),
    stack: toSortedEntries(counters.stack),
    technologies: toSortedEntries(counters.technologies),
    domains: toSortedEntries(counters.domains),
    labels: toSortedEntries(counters.labels),
  }
}

module.exports = {
  TAXONOMY_LIMITS,
  TAXONOMY_CATALOG,
  createEmptyProjectTaxonomy,
  normalizeProjectTaxonomy,
  buildProjectTagsFromTaxonomy,
  matchesProjectFilters,
  buildProjectFacets,
}
