/**
 * Nettoie un texte libre.
 * @param {unknown} value Valeur brute.
 * @returns {string} Texte normalise.
 */
function normalizeText(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Deserialise le contenu JSON d'un article.
 * @param {unknown} content Contenu brut.
 * @returns {Array<object>} Blocs detectes.
 */
export function parseArticleBlocks(content) {
  if (typeof content !== 'string' || !content.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed?.blocks)) {
      return parsed.blocks
    }
  } catch {
    /* contenu legacy */
  }

  return []
}

/**
 * Formate une date d'article.
 * @param {string|undefined|null} value Date source.
 * @param {Intl.DateTimeFormatOptions} [options] Options Intl.
 * @returns {string} Date formattee.
 */
export function formatArticleDate(value, options) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(options || {}),
  })
}

/**
 * Coupe un texte d'article pour un affichage editorial.
 * @param {unknown} value Texte source.
 * @param {number} maxLength Longueur max.
 * @param {string} fallback Valeur de repli.
 * @returns {string} Extrait court.
 */
export function getArticleExcerpt(value, maxLength, fallback) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return fallback
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trim()}...`
}

/**
 * Estime le temps de lecture d'un article.
 * @param {unknown} content Contenu source.
 * @returns {number} Minutes estimees.
 */
export function estimateArticleReadingTime(content) {
  if (!content) {
    return 1
  }

  const blocks = parseArticleBlocks(content)
  const text = blocks.length > 0
    ? blocks.map((block) => normalizeText(block?.content)).join(' ')
    : String(content).replace(/<[^>]*>/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length

  return Math.max(1, Math.ceil(words / 200))
}

function slugifyHeading(text) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Extrait les reperes de lecture d'un article.
 * @param {unknown} content Contenu source.
 * @returns {Array<{id:string,text:string,level:number}>} Sommaire.
 */
export function extractArticleTocHeadings(content) {
  return parseArticleBlocks(content)
    .filter((block) => block?.type === 'heading' && (block?.level === 2 || block?.level === 3))
    .map((block) => ({
      id: slugifyHeading(block?.content),
      text: normalizeText(block?.content),
      level: Number(block?.level) || 2,
    }))
    .filter((heading) => heading.id && heading.text)
}

/**
 * Construit un profil editorial partage pour le listing et le detail.
 * @param {object} article Article source.
 * @returns {{
 *   lead: string,
 *   readingTime: number,
 *   tocHeadings: Array<{id:string,text:string,level:number}>,
 *   chapterLabels: Array<string>,
 *   focusValue: string,
 *   focusDetail: string,
 *   rhythmValue: string,
 *   rhythmDetail: string,
 *   formatValue: string,
 *   formatDetail: string,
 *   coverageValue: string,
 *   coverageDetail: string,
 *   tags: Array<string>,
 *   codeBlocks: number,
 *   imageBlocks: number,
 *   quoteBlocks: number,
 *   blockCount: number,
 * }}
 */
export function buildArticleReadingProfile(article) {
  const blocks = parseArticleBlocks(article?.content)
  const tocHeadings = extractArticleTocHeadings(article?.content)
  const tags = Array.isArray(article?.tags)
    ? article.tags.map((tag) => normalizeText(tag)).filter(Boolean)
    : []
  const chapterLabels = tocHeadings.map((heading) => heading.text).slice(0, 4)
  const readingTime = estimateArticleReadingTime(article?.content)
  const codeBlocks = blocks.filter((block) => block?.type === 'code').length
  const imageBlocks = blocks.filter((block) => block?.type === 'image').length
  const quoteBlocks = blocks.filter((block) => block?.type === 'quote').length
  const blockCount = blocks.length

  let rhythmValue = 'Lecture rapide'
  if (readingTime > 4 && readingTime <= 8) {
    rhythmValue = 'Lecture approfondie'
  } else if (readingTime > 8) {
    rhythmValue = 'Dossier complet'
  }

  const formatTokens = []
  if (codeBlocks > 0) {
    formatTokens.push(`${codeBlocks} bloc${codeBlocks > 1 ? 's' : ''} code`)
  }
  if (imageBlocks > 0) {
    formatTokens.push(`${imageBlocks} visuel${imageBlocks > 1 ? 's' : ''}`)
  }
  if (quoteBlocks > 0) {
    formatTokens.push(`${quoteBlocks} citation${quoteBlocks > 1 ? 's' : ''}`)
  }

  return {
    lead: getArticleExcerpt(
      article?.excerpt,
      240,
      'Une lecture approfondie pour partager le contexte, les decisions et les enseignements utiles de ce sujet.'
    ),
    readingTime,
    tocHeadings,
    chapterLabels,
    focusValue: tags.slice(0, 2).join(' | ') || chapterLabels[0] || 'Journal terrain',
    focusDetail: tags.length > 2 ? `${tags.length} themes abordes` : (article?.author_name || 'Lecture signee'),
    rhythmValue,
    rhythmDetail: tocHeadings.length > 0 ? `${tocHeadings.length} reperes de lecture` : 'Lecture continue',
    formatValue: formatTokens.length > 0 ? 'Lecture multi-format' : 'Texte editorial',
    formatDetail: formatTokens.join(' | ') || (article?.cover_image ? 'cover + texte' : 'texte continu'),
    coverageValue: tocHeadings.length > 0
      ? `${tocHeadings.length} reperes`
      : blockCount > 0
        ? `${blockCount} blocs`
        : 'Lecture libre',
    coverageDetail: chapterLabels.length > 0 ? chapterLabels.join(' | ') : 'Parcours de lecture continu',
    tags,
    codeBlocks,
    imageBlocks,
    quoteBlocks,
    blockCount,
  }
}

/**
 * Explique pourquoi un article relie est pertinent.
 * @param {object} currentArticle Article source.
 * @param {object} candidate Article relie.
 * @returns {string} Raison visible.
 */
export function getRelatedArticleReason(currentArticle, candidate) {
  const currentTags = new Set(
    (Array.isArray(currentArticle?.tags) ? currentArticle.tags : [])
      .map((tag) => normalizeText(tag))
      .filter(Boolean)
  )
  const shared = (Array.isArray(candidate?.tags) ? candidate.tags : [])
    .map((tag) => normalizeText(tag))
    .filter((tag) => tag && currentTags.has(tag))

  if (shared.length > 0) {
    return `Theme partage: ${shared.slice(0, 2).join(' | ')}`
  }

  if (candidate?.published_at) {
    return `Publie ${formatArticleDate(candidate.published_at, { month: 'short' })}`
  }

  return 'Lecture complementaire'
}
