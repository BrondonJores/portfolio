import { getProjectTaxonomy } from './projectTaxonomy.js'

/**
 * Nettoie un texte libre.
 * @param {unknown} value Valeur brute.
 * @returns {string} Texte normalise.
 */
function normalizePlainText(value) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Retourne une phrase courte lisible.
 * @param {unknown} value Texte source.
 * @param {number} maxLength Limite max.
 * @param {string} fallback Valeur de repli.
 * @returns {string} Phrase compacte.
 */
export function getProjectShortSentence(value, maxLength, fallback) {
  const normalized = normalizePlainText(value)
  if (!normalized) {
    return fallback
  }

  const sentenceMatch = normalized.match(/^.*?[.!?](?:\s+|$)/)
  const sentence = (sentenceMatch?.[0] || normalized).trim()
  if (sentence.length <= maxLength) {
    return sentence
  }

  return `${sentence.slice(0, Math.max(1, maxLength - 3)).trim()}...`
}

/**
 * Parse le contenu JSON d'un case study.
 * @param {unknown} content Contenu source.
 * @returns {Array<object>} Blocs detectes.
 */
export function parseProjectContentBlocks(content) {
  if (typeof content !== 'string' || !content.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed?.blocks)) {
      return parsed.blocks
    }
  } catch {
    /* contenu legacy ou texte brut */
  }

  return []
}

/**
 * Dedup une liste de chaines en gardant l'ordre.
 * @param {Array<string>} values Valeurs.
 * @param {number} limit Limite max.
 * @returns {Array<string>} Liste unique.
 */
function uniqueTextList(values, limit) {
  const seen = new Set()
  const output = []

  for (const entry of values) {
    const value = normalizePlainText(entry)
    if (!value) continue

    const key = value.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    output.push(value)
    if (output.length >= limit) break
  }

  return output
}

/**
 * Construit un profil de showcase partage pour les pages projet.
 * @param {object} project Projet source.
 * @returns {{
 *   taxonomy: {type:string,stack:Array<string>,technologies:Array<string>,domains:Array<string>,labels:Array<string>},
 *   mission: string,
 *   scope: string,
 *   stack: string,
 *   delivery: string,
 *   proofHeadline: string,
 *   proofDetail: string,
 *   coverageValue: string,
 *   coverageDetail: string,
 *   technologyCount: number,
 *   contentBlockCount: number,
 *   headingCount: number,
 *   chapterLabels: Array<string>,
 *   hasDemo: boolean,
 *   hasSource: boolean,
 * }}
 */
export function getProjectShowcaseProfile(project) {
  const taxonomy = getProjectTaxonomy(project)
  const contentBlocks = parseProjectContentBlocks(project?.content)
  const headingLabels = contentBlocks
    .filter((block) => block?.type === 'heading')
    .map((block) => normalizePlainText(block?.content))
    .filter(Boolean)
  const sectionLabels = contentBlocks
    .filter((block) => block?.type === 'section')
    .map((block) => normalizePlainText(block?.title || block?.heading || block?.label))
    .filter(Boolean)

  const hasDemo = Boolean(normalizePlainText(project?.demo_url))
  const hasSource = Boolean(normalizePlainText(project?.github_url))
  const chapterLabels = uniqueTextList(
    [
      ...headingLabels,
      ...sectionLabels,
      ...taxonomy.domains,
      ...taxonomy.labels,
      taxonomy.type,
    ].filter(Boolean),
    4
  )
  const technologyCount = taxonomy.technologies.length
  const contentBlockCount = contentBlocks.length
  const headingCount = headingLabels.length

  let delivery = 'Case study'
  if (hasDemo && hasSource) {
    delivery = 'Live + source'
  } else if (hasDemo) {
    delivery = 'Live demo'
  } else if (hasSource) {
    delivery = 'Source public'
  }

  let proofHeadline = 'Narration produit'
  if (hasDemo && hasSource) {
    proofHeadline = 'Demo + repo'
  } else if (hasDemo) {
    proofHeadline = 'Demo live'
  } else if (hasSource) {
    proofHeadline = 'Code source'
  }

  const proofDetailParts = []
  if (technologyCount > 0) {
    proofDetailParts.push(`${technologyCount} technos`)
  }
  if (taxonomy.domains.length > 0) {
    proofDetailParts.push(taxonomy.domains.slice(0, 2).join(' | '))
  }
  if (contentBlockCount > 0) {
    proofDetailParts.push(`${contentBlockCount} blocs`)
  }

  const coverageValue = headingCount > 0
    ? `${headingCount} chapitres`
    : contentBlockCount > 0
      ? `${contentBlockCount} blocs`
      : chapterLabels.length > 0
        ? `${chapterLabels.length} axes`
        : 'Brief'

  const coverageDetail = chapterLabels.length > 0
    ? chapterLabels.join(' | ')
    : contentBlockCount > 0
      ? 'Lecture structuree du projet'
      : 'Recit editorial du projet'

  return {
    taxonomy,
    mission: getProjectShortSentence(
      project?.description,
      160,
      'Projet concu pour transformer une intention produit en experience claire et robuste.'
    ),
    scope: taxonomy.domains.length > 0
      ? taxonomy.domains.slice(0, 2).join(' | ')
      : taxonomy.labels.length > 0
        ? taxonomy.labels.slice(0, 2).join(' | ')
        : taxonomy.type || 'Produit web',
    stack: taxonomy.stack.length > 0
      ? taxonomy.stack.slice(0, 3).join(' | ')
      : taxonomy.technologies.length > 0
        ? taxonomy.technologies.slice(0, 3).join(' | ')
        : 'Stack non renseignee',
    delivery,
    proofHeadline,
    proofDetail: proofDetailParts.join(' | ') || 'Execution, produit et lisibilite',
    coverageValue,
    coverageDetail,
    technologyCount,
    contentBlockCount,
    headingCount,
    chapterLabels,
    hasDemo,
    hasSource,
  }
}
