/* Service metier sitemap : construit un XML SEO depuis le contenu publie. */
const { Setting, Project, Article } = require('../models')

const SITEMAP_STATIC_ENTRIES = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/projets', changefreq: 'weekly', priority: 0.9 },
  { path: '/competences', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog', changefreq: 'weekly', priority: 0.8 },
  { path: '/contact', changefreq: 'monthly', priority: 0.7 },
]

/**
 * Nettoie une chaine en conservant une version non vide.
 * @param {unknown} value Valeur brute.
 * @param {number} [maxLength=300] Longueur maximale.
 * @returns {string} Texte normalise.
 */
function toTrimmedString(value, maxLength = 300) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim().slice(0, maxLength)
}

/**
 * Echappe les caracteres XML sensibles.
 * @param {string} value Texte brut.
 * @returns {string} Texte XML-safe.
 */
function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Normalise une URL de base.
 * @param {unknown} rawValue URL brute.
 * @returns {string} URL de base valide, sinon chaine vide.
 */
function normalizeBaseUrl(rawValue) {
  const raw = toTrimmedString(rawValue, 500)
  if (!raw) {
    return ''
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    const parsed = new URL(withProtocol)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return ''
  }
}

/**
 * Construit une URL absolue en preservant le domaine canonique.
 * @param {string} baseUrl Domaine de base.
 * @param {string} path Chemin relatif.
 * @returns {string} URL absolue.
 */
function toAbsoluteUrl(baseUrl, path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return new URL(normalizedPath, baseUrl).toString()
}

/**
 * Formate une date en ISO (UTC) pour balise lastmod.
 * @param {unknown} value Valeur date brute.
 * @returns {string} Date ISO ou chaine vide.
 */
function toIsoDate(value) {
  if (!value) {
    return ''
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toISOString()
}

/**
 * Construit le XML sitemap final.
 * @param {Array<{loc:string,lastmod?:string,changefreq?:string,priority?:number}>} entries Liste des URLs.
 * @returns {string} XML sitemap complet.
 */
function buildSitemapXml(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const entry of entries) {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`)

    if (entry.lastmod) {
      lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`)
    }

    if (entry.changefreq) {
      lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`)
    }

    if (typeof entry.priority === 'number' && Number.isFinite(entry.priority)) {
      lines.push(`    <priority>${Math.min(1, Math.max(0, entry.priority)).toFixed(1)}</priority>`)
    }

    lines.push('  </url>')
  }

  lines.push('</urlset>')
  return lines.join('\n')
}

/**
 * Extrait la premiere valeur d'une liste CSV d'origines.
 * @param {unknown} rawValue Valeur brute env.
 * @returns {string} Premiere origine candidate.
 */
function firstOriginFromCsv(rawValue) {
  const first = String(rawValue || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0]
  return normalizeBaseUrl(first)
}

/**
 * Cree le service sitemap avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.settingModel] Modele settings.
 * @param {object} [deps.projectModel] Modele projects.
 * @param {object} [deps.articleModel] Modele articles.
 * @param {Function} [deps.now] Horloge injectee.
 * @returns {{getSitemapPayload: Function}} API sitemap.
 */
function createSitemapService(deps = {}) {
  const settingModel = deps.settingModel || Setting
  const projectModel = deps.projectModel || Project
  const articleModel = deps.articleModel || Article
  const now = deps.now || (() => new Date())

  /**
   * Determine l'URL canonique du site.
   * Priorite: setting site_url > FRONTEND_URL > origine requete.
   * @param {object} [options={}] Options de resolution.
   * @param {string} [options.requestOrigin] Origine deduite de la requete HTTP.
   * @returns {Promise<string>} URL de base exploitable.
   */
  async function resolveSiteUrl(options = {}) {
    const requestOrigin = normalizeBaseUrl(options.requestOrigin || '')

    const siteUrlSetting = await settingModel.findOne({
      attributes: ['value'],
      where: { key: 'site_url' },
      raw: true,
    })

    const fromSettings = normalizeBaseUrl(siteUrlSetting?.value)
    if (fromSettings) {
      return fromSettings
    }

    const fromFrontendEnv = firstOriginFromCsv(process.env.FRONTEND_URL)
    if (fromFrontendEnv) {
      return fromFrontendEnv
    }

    if (requestOrigin) {
      return requestOrigin
    }

    return 'https://example.com'
  }

  /**
   * Retourne le payload sitemap pret a envoyer.
   * @param {object} [options={}] Options de generation.
   * @param {string} [options.requestOrigin] Origine deduite de la requete.
   * @returns {Promise<{xml:string,urlCount:number,siteUrl:string}>} XML + metadonnees.
   */
  async function getSitemapPayload(options = {}) {
    const siteUrl = await resolveSiteUrl(options)

    const [projects, articles] = await Promise.all([
      projectModel.findAll({
        attributes: ['slug', 'updated_at', 'created_at'],
        where: { published: true },
        order: [['updated_at', 'DESC']],
        raw: true,
      }),
      articleModel.findAll({
        attributes: ['slug', 'updated_at', 'created_at', 'published_at'],
        where: { published: true },
        order: [['published_at', 'DESC'], ['updated_at', 'DESC']],
        raw: true,
      }),
    ])

    const staticEntries = SITEMAP_STATIC_ENTRIES.map((entry) => ({
      loc: toAbsoluteUrl(siteUrl, entry.path),
      lastmod: toIsoDate(now()),
      changefreq: entry.changefreq,
      priority: entry.priority,
    }))

    const projectEntries = projects.reduce((acc, project) => {
      const slug = toTrimmedString(project?.slug, 240)
      if (!slug) {
        return acc
      }

      acc.push({
        loc: toAbsoluteUrl(siteUrl, `/projets/${encodeURIComponent(slug)}`),
        lastmod: toIsoDate(project?.updated_at || project?.created_at),
        changefreq: 'monthly',
        priority: 0.8,
      })
      return acc
    }, [])

    const articleEntries = articles.reduce((acc, article) => {
      const slug = toTrimmedString(article?.slug, 240)
      if (!slug) {
        return acc
      }

      acc.push({
        loc: toAbsoluteUrl(siteUrl, `/blog/${encodeURIComponent(slug)}`),
        lastmod: toIsoDate(article?.published_at || article?.updated_at || article?.created_at),
        changefreq: 'weekly',
        priority: 0.7,
      })
      return acc
    }, [])

    const entries = [...staticEntries, ...projectEntries, ...articleEntries]
    return {
      siteUrl,
      urlCount: entries.length,
      xml: buildSitemapXml(entries),
    }
  }

  return {
    getSitemapPayload,
  }
}

module.exports = {
  createSitemapService,
  ...createSitemapService(),
}
