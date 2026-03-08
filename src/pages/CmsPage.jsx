/* Page publique dynamique rendue depuis le module pages CMS. */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import BlockRenderer from '../components/ui/BlockRenderer.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { getPublicCmsPageBySlug } from '../services/cmsPageService.js'
import { useSettings } from '../context/SettingsContext.jsx'

/**
 * Retourne `value` si c'est une chaine, sinon fallback.
 * @param {unknown} value Valeur brute.
 * @param {string} [fallback=''] Valeur de repli.
 * @returns {string} Texte normalise.
 */
function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export default function CmsPage() {
  const { slug } = useParams()
  const { settings } = useSettings()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    getPublicCmsPageBySlug(slug)
      .then((response) => {
        setPage(response?.data || null)
      })
      .catch((err) => {
        setPage(null)
        setError(err.message || asText(settings?.ui_cms_not_found_title, 'Page introuvable'))
      })
      .finally(() => setLoading(false))
  }, [slug])

  const cmsDefaultTitle = asText(settings?.ui_cms_default_title, 'Page')
  const cmsNotFoundTitle = asText(settings?.ui_cms_not_found_title, 'Page introuvable')
  const cmsNotFoundMessage = asText(
    settings?.ui_cms_not_found_message,
    "La page que vous recherchez n'est pas disponible."
  )
  const pageTitle = asText(page?.seo?.title) || asText(page?.title) || cmsDefaultTitle
  const pageDescription = asText(page?.seo?.description)
  const pageCanonical = asText(page?.seo?.canonicalUrl)
  const pageNoIndex = Boolean(page?.seo?.noindex)
  const pageNoFollow = Boolean(page?.seo?.nofollow)
  const pageContent = useMemo(
    () => JSON.stringify({ blocks: Array.isArray(page?.layout) ? page.layout : [] }),
    [page?.layout]
  )

  if (loading) {
    return (
      <div className="min-h-[45vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <>
        <Helmet>
          <title>{cmsNotFoundTitle}</title>
        </Helmet>
        <section className="max-w-3xl mx-auto px-4 py-16">
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            {cmsNotFoundTitle}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {error || cmsNotFoundMessage}
          </p>
        </section>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        {pageDescription && <meta name="description" content={pageDescription} />}
        {pageCanonical && <link rel="canonical" href={pageCanonical} />}
        {pageNoIndex && <meta name="robots" content={pageNoFollow ? 'noindex,nofollow' : 'noindex,follow'} />}
        {!pageNoIndex && pageNoFollow && <meta name="robots" content="index,nofollow" />}
      </Helmet>

      <article className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {page.title}
          </h1>
        </header>
        <BlockRenderer content={pageContent} />
      </article>
    </>
  )
}
