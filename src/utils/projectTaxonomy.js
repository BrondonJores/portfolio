/* Utilitaires frontend pour la taxonomie projet (option A). */

const TAXONOMY_LIMITS = Object.freeze({
  type: 1,
  stack: 5,
  technologies: 18,
  domains: 6,
  labels: 12,
  legacyTags: 40,
})

export const PROJECT_TAXONOMY_OPTIONS = Object.freeze({
  type: [
    'Application web',
    'API backend',
    'Site institutionnel',
    'Publication',
    'Documentation juridique',
    'Plateforme interne',
    'Automatisation',
  ],
  stack: [
    'Microservices',
    'Monolithe',
    'Full-stack',
    'Frontend SPA',
    'Backend API',
    'CMS',
    'Server-side rendering',
  ],
  technologies: [
    'Laravel',
    'Jakarta EE',
    'Jakarta Servlet',
    'JSP',
    'Java',
    'Python',
    'Flask',
    'React',
    'Bootstrap',
    'MySQL',
    'PostgreSQL',
    'Docker',
    'Tomcat',
    'Joomla',
    'XML',
    'JSON',
    'XSLT',
    'bcrypt',
  ],
  domains: [
    'Association',
    'Institutionnel',
    'Juridique',
    'Documentation',
    'Open source',
    'Education',
  ],
})

const TAXONOMY_ALIASES = Object.freeze({
  type: {
    'app-web': 'Application web',
    'web-app': 'Application web',
    'application-web': 'Application web',
    'api': 'API backend',
    'api-backend': 'API backend',
    'site-institutionnel': 'Site institutionnel',
    'publications': 'Publication',
    'documentation-juridique': 'Documentation juridique',
  },
  stack: {
    'microservice': 'Microservices',
    'microservices': 'Microservices',
    'monolith': 'Monolithe',
    'monolithe': 'Monolithe',
    'fullstack': 'Full-stack',
    'full-stack': 'Full-stack',
    'frontend-spa': 'Frontend SPA',
    'backend-api': 'Backend API',
    'api-backend': 'Backend API',
    'cms': 'CMS',
    'ssr': 'Server-side rendering',
  },
  technologies: {
    'jakarta-ee': 'Jakarta EE',
    'jakarta-eee': 'Jakarta EE',
    'jakarta-ee-api': 'Jakarta EE',
    'jakarta-servlet': 'Jakarta Servlet',
    'reactjs': 'React',
    'react-js': 'React',
    'react-jsx': 'React',
    'postgres': 'PostgreSQL',
    'postgresql': 'PostgreSQL',
  },
  domains: {
    'association': 'Association',
    'institutionnel': 'Institutionnel',
    'juridique': 'Juridique',
    'documentation': 'Documentation',
    'open-source': 'Open source',
    'opensource': 'Open source',
    'education': 'Education',
  },
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

  const explicitAlias = TAXONOMY_ALIASES[axis]?.[key]
  if (explicitAlias) return explicitAlias

  const catalogMatch = (PROJECT_TAXONOMY_OPTIONS[axis] || []).find((entry) => normalizeKey(entry) === key)
  if (catalogMatch) return catalogMatch

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
