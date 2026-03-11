/* Utilitaires de presentation pour la page ArticleDetail. */

/* Formatage de la date */
export function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/* Date relative ("il y a X jours") */
export function formatRelativeDate(dateString) {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 jour'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  if (months === 1) return 'il y a 1 mois'
  if (months < 12) return `il y a ${months} mois`
  const years = Math.floor(days / 365)
  return years === 1 ? 'il y a 1 an' : `il y a ${years} ans`
}

/* Estimation du temps de lecture (~200 mots/min) */
export function estimateReadingTime(content) {
  if (!content) return 1
  let text = ''
  try {
    const parsed = JSON.parse(content)
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      text = parsed.blocks.map((block) => block.content || '').join(' ')
    }
  } catch {
    text = content.replace(/<[^>]*>/g, ' ')
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

/* Extraction des titres h2/h3 pour la table des matieres. */
export function extractTocHeadings(content) {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      return parsed.blocks
        .filter((block) => block.type === 'heading' && (block.level === 2 || block.level === 3))
        .map((block) => ({
          id: block.content
            ? block.content.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
            : '',
          text: block.content || '',
          level: block.level,
        }))
        .filter((heading) => heading.id)
    }
  } catch {
    /* HTML legacy, pas de TOC */
  }
  return []
}

/* Couleur d'avatar basee sur un hash du nom. */
const AVATAR_PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#00d4a8']

export function getAvatarColor(name) {
  if (!name) return 'var(--color-accent)'
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

const LIKED_ARTICLES_STORAGE_KEY = 'portfolio_liked_articles_v1'

/**
 * Lit les likes persistes en local pour eviter plusieurs likes du meme navigateur.
 * @returns {Record<string, boolean>} Dictionnaire slug => liked.
 */
export function readLikedArticlesMap() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LIKED_ARTICLES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

/**
 * Persiste l'etat liked local d'un article.
 * @param {string} articleSlug Slug article cible.
 * @param {boolean} isLiked Etat liked a sauvegarder.
 * @returns {void}
 */
export function persistLikedArticle(articleSlug, isLiked) {
  if (!articleSlug || typeof window === 'undefined') return
  const currentMap = readLikedArticlesMap()
  currentMap[articleSlug] = isLiked
  try {
    window.localStorage.setItem(LIKED_ARTICLES_STORAGE_KEY, JSON.stringify(currentMap))
  } catch {
    /* Ignore les erreurs quota/localStorage bloque. */
  }
}
