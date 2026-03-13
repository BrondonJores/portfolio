import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  CalendarIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import SectionTitle from '../components/ui/SectionTitle.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { usePublicArticles } from '../hooks/usePublicArticles.js'
import { buildPageTitle } from '../utils/seoSettings.js'
import {
  buildArticleReadingProfile,
  formatArticleDate,
  getArticleExcerpt,
} from '../utils/articleReading.js'

function collectTopTags(articles, limit = 8) {
  const counts = new Map()

  articles.forEach((article) => {
    if (!Array.isArray(article?.tags)) {
      return
    }

    article.tags.forEach((tag) => {
      const key = String(tag || '').trim()
      if (!key) return
      counts.set(key, (counts.get(key) || 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag)
}

export default function BlogPage() {
  const [page, setPage] = useState(1)
  const { settings } = useSettings()
  const { articles, pagination, loading } = usePublicArticles({ page, limit: 9 })
  const pageTitle = buildPageTitle(settings, 'Blog')
  const blogPageHeading = settings.ui_blog_page_title || 'Blog'
  const blogPageSubtitle = settings.ui_blog_page_subtitle || 'Articles et reflexions sur le developpement web'
  const blogPageEmpty = settings.ui_blog_page_empty || 'Aucun article disponible pour le moment.'
  const blogReadLabel = settings.ui_section_blog_read || "Lire l'article"
  const spotlightArticle = articles[0] || null
  const secondaryArticles = spotlightArticle ? articles.slice(1) : []
  const articleProfiles = useMemo(
    () => new Map(articles.map((article) => [article.id, buildArticleReadingProfile(article)])),
    [articles]
  )
  const spotlightProfile = spotlightArticle ? articleProfiles.get(spotlightArticle.id) : null
  const topTags = useMemo(() => collectTopTags(articles, 8), [articles])
  const totalReadingMinutes = useMemo(
    () => articles.reduce((sum, article) => sum + (articleProfiles.get(article.id)?.readingTime || 0), 0),
    [articleProfiles, articles]
  )
  const totalReadingCues = useMemo(
    () => articles.reduce((sum, article) => sum + (articleProfiles.get(article.id)?.tocHeadings.length || 0), 0),
    [articleProfiles, articles]
  )
  const pageSummary = [
    {
      key: 'articles',
      label: 'Articles visibles',
      value: String(pagination?.total ?? articles.length ?? 0),
      helper: pagination?.pages > 1 ? `${pagination.pages} pages` : 'lecture continue',
    },
    {
      key: 'tempo',
      label: 'Temps cumule',
      value: `${totalReadingMinutes || 0} min`,
      helper: articles.length > 0 ? `${Math.max(1, Math.round(totalReadingMinutes / articles.length))} min/article` : 'lecture editoriale',
    },
    {
      key: 'reperes',
      label: 'Reperes',
      value: String(totalReadingCues || 0),
      helper: topTags.length > 0 ? `${topTags.length} themes dominants` : 'lecture continue',
    },
  ]

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Navbar />
      <main className="min-h-screen pb-16 pt-24 sm:pt-28" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <section className="mb-8 sm:mb-10">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end xl:gap-8">
              <div>
                <p
                  className="mb-4 text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Journal d execution
                </p>
                <SectionTitle
                  title={blogPageHeading}
                  subtitle={blogPageSubtitle}
                />
              </div>

              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                {pageSummary.map((item) => (
                  <Card key={item.key} className="min-w-[14.5rem] snap-start sm:min-w-0 sm:h-full">
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.helper}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : articles.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {blogPageEmpty}
                </p>
              </div>
            </Card>
          ) : (
            <>
              {spotlightArticle && (
                <section className="mb-10">
                  <Card className="overflow-hidden !p-0">
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
                      <div
                        className="relative min-h-[240px] overflow-hidden sm:min-h-[320px]"
                        style={{
                          background:
                            'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-secondary) 84%, transparent), color-mix(in srgb, var(--color-accent-glow) 28%, transparent))',
                        }}
                      >
                        {spotlightArticle.cover_image ? (
                          <img
                            src={spotlightArticle.cover_image}
                            alt={spotlightArticle.title}
                            className="h-full w-full object-cover"
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                            width="1600"
                            height="900"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <DocumentTextIcon
                              className="h-14 w-14"
                              style={{ color: 'var(--color-accent)', opacity: 0.42 }}
                              aria-hidden="true"
                            />
                          </div>
                        )}
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--color-bg-primary) 22%, transparent) 100%)',
                          }}
                        />
                      </div>

                      <div className="flex flex-col gap-5 p-5 sm:p-6 md:p-8">
                      <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                            style={{
                              borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                              backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                              color: 'var(--color-accent-light)',
                            }}
                          >
                            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                            A la une
                          </span>
                          {spotlightArticle.published_at && (
                            <span
                              className="inline-flex items-center gap-1.5 text-xs"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              <time dateTime={spotlightArticle.published_at}>
                                {formatArticleDate(spotlightArticle.published_at)}
                              </time>
                            </span>
                          )}
                        </div>

                        <div>
                          <h2 className="text-2xl font-semibold md:text-3xl" style={{ color: 'var(--color-text-primary)' }}>
                            {spotlightArticle.title}
                          </h2>
                          <p className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                            {spotlightProfile?.lead || 'Un texte pour documenter les choix, les arbitrages et les apprentissages du terrain.'}
                          </p>
                        </div>

                        {Array.isArray(spotlightArticle.tags) && spotlightArticle.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {spotlightArticle.tags.slice(0, 6).map((tag) => (
                              <Badge key={`${spotlightArticle.id}-${tag}`}>{tag}</Badge>
                            ))}
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            {
                              label: 'Focus',
                              value: spotlightProfile?.focusValue || 'Journal terrain',
                              helper: spotlightProfile?.focusDetail || 'Partage de methode',
                            },
                            {
                              label: 'Rythme',
                              value: spotlightProfile
                                ? `${spotlightProfile.readingTime} min`
                                : 'Lecture',
                              helper: spotlightProfile?.rhythmValue || 'Lecture approfondie',
                            },
                            {
                              label: 'Couverture',
                              value: spotlightProfile?.coverageValue || 'Lecture continue',
                              helper: spotlightProfile?.coverageDetail || 'Parcours de lecture continu',
                            },
                          ].map((item) => (
                            <div
                              key={`${spotlightArticle.id}-${item.label}`}
                              className="rounded-2xl border px-4 py-3"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 78%, transparent)',
                              }}
                            >
                              <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                                {item.label}
                              </p>
                              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                {item.value}
                              </p>
                              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                {item.helper}
                              </p>
                            </div>
                          ))}
                        </div>

                        {spotlightProfile?.chapterLabels?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {spotlightProfile.chapterLabels.map((chapter) => (
                              <span
                                key={`${spotlightArticle.id}-${chapter}`}
                                className="rounded-full border px-3 py-1 text-xs"
                                style={{
                                  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                {chapter}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-auto">
                          <Link
                            to={`/blog/${spotlightArticle.slug}`}
                            className="inline-flex items-center gap-2 text-sm font-medium"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {blogReadLabel}
                            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                </section>
              )}

              {topTags.length > 0 && (
                <section className="mb-10">
                  <Card>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                            Themes dominants
                          </p>
                          <p className="mt-2 text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            Les sujets qui structurent cette page.
                          </p>
                        </div>
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {topTags.length} tags visibles
                        </span>
                      </div>
                      <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                        {topTags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                </section>
              )}

              {secondaryArticles.length > 0 && (
                <section>
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Catalogue
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {secondaryArticles.length} articles sur cette page
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {secondaryArticles.map((article, index) => {
                      const profile = articleProfiles.get(article.id)

                      return (
                        <motion.div
                          key={article.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
                        >
                          <Link
                            to={`/blog/${article.slug}`}
                            className="block h-full group"
                            aria-label={`${blogReadLabel} - ${article.title}`}
                          >
                            <Card className="h-full flex flex-col overflow-hidden !p-0">
                              {article.cover_image ? (
                                <div className="h-48 overflow-hidden">
                                  <img
                                    src={article.cover_image}
                                    alt={article.title}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                    decoding="async"
                                    width="1200"
                                    height="675"
                                  />
                                </div>
                              ) : (
                                <div
                                  className="flex h-44 items-center justify-center"
                                  style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                                >
                                  <DocumentTextIcon
                                    className="h-10 w-10"
                                    style={{ color: 'var(--color-accent)', opacity: 0.4 }}
                                    aria-hidden="true"
                                  />
                                </div>
                              )}

                              <div className="flex flex-1 flex-col p-5">
                                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                  {article.published_at && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                      <time dateTime={article.published_at}>
                                        {formatArticleDate(article.published_at, { month: 'short' })}
                                      </time>
                                    </span>
                                  )}
                                  <span>{profile?.readingTime || 1} min</span>
                                  <span>{profile?.rhythmValue || 'Lecture'}</span>
                                </div>

                                <h2 className="text-lg font-semibold line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                                  {article.title}
                                </h2>

                                <p className="mt-3 text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--color-text-secondary)' }}>
                                  {getArticleExcerpt(
                                    profile?.lead || article.excerpt,
                                    150,
                                    'Un article pour clarifier une methode, un arbitrage ou un retour terrain.'
                                  )}
                                </p>

                                <div
                                  className="mt-4 rounded-2xl border px-3 py-3"
                                  style={{
                                    borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 76%, transparent)',
                                  }}
                                >
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <div>
                                      <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-secondary)' }}>
                                        Focus
                                      </p>
                                      <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                        {profile?.focusValue || 'Lecture editoriale'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-secondary)' }}>
                                        Couverture
                                      </p>
                                      <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                        {profile?.coverageValue || 'Lecture continue'}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                    {profile?.coverageDetail || 'Lecture editoriale continue'}
                                  </p>
                                </div>

                                {Array.isArray(article.tags) && article.tags.length > 0 && (
                                  <div className="mt-4 flex flex-wrap gap-1.5">
                                    {article.tags.slice(0, 4).map((tag) => (
                                      <Badge key={`${article.id}-${tag}`}>{tag}</Badge>
                                    ))}
                                  </div>
                                )}

                                <span
                                  className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium"
                                  style={{ color: 'var(--color-accent)' }}
                                >
                                  {blogReadLabel}
                                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                                </span>
                              </div>
                            </Card>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </section>
              )}

              {pagination && pagination.pages > 1 && (
                <div className="mt-10 overflow-x-auto pb-1">
                  <div className="flex min-w-max justify-center gap-2">
                    {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((nextPage) => (
                      <button
                        key={nextPage}
                        type="button"
                        onClick={() => setPage(nextPage)}
                        className="h-10 min-w-10 rounded-full px-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={{
                          backgroundColor: nextPage === page ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-bg-card) 88%, transparent)',
                          color: nextPage === page ? '#ffffff' : 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border)',
                        }}
                        aria-current={nextPage === page ? 'page' : undefined}
                      >
                        {nextPage}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
