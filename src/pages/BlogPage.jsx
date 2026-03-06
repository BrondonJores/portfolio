/* Page liste de tous les articles de blog */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DocumentTextIcon, CalendarIcon } from '@heroicons/react/24/outline'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import SectionTitle from '../components/ui/SectionTitle.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { getArticles } from '../services/articleService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'

/* Formatage de la date de publication */
function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const { settings } = useSettings()
  const pageTitle = buildPageTitle(settings, 'Blog')

  useEffect(() => {
    setLoading(true)
    getArticles({ page, limit: 9 })
      .then((res) => {
        setArticles(res?.data || [])
        setPagination(res?.pagination || null)
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [page])

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="Blog"
            subtitle="Articles et reflexions sur le developpement web"
          />

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : articles.length === 0 ? (
            <p
              className="text-center py-20"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Aucun article disponible pour le moment.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, i) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
                  >
                    <Link to={`/blog/${article.slug}`} className="block h-full">
                      <Card className="h-full flex flex-col overflow-hidden !p-0">
                        {/* Image de couverture */}
                        {article.cover_image ? (
                          <div className="w-full h-44 overflow-hidden flex-shrink-0">
                            <img
                              src={article.cover_image}
                              alt={article.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-full h-44 flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                          >
                            <DocumentTextIcon
                              className="h-10 w-10"
                              style={{ color: 'var(--color-accent)', opacity: 0.4 }}
                              aria-hidden="true"
                            />
                          </div>
                        )}

                        {/* Contenu de la carte */}
                        <div className="flex flex-col flex-grow p-5">
                          {!article.cover_image && (
                            <DocumentTextIcon
                              className="h-6 w-6 mb-3"
                              style={{ color: 'var(--color-accent)' }}
                              aria-hidden="true"
                            />
                          )}
                          <h2
                            className="text-base font-bold mb-2 line-clamp-2"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {article.title}
                          </h2>
                          {article.excerpt && (
                            <p
                              className="text-sm leading-relaxed mb-3 line-clamp-3 flex-grow"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {article.excerpt}
                            </p>
                          )}
                          {article.published_at && (
                            <div
                              className="flex items-center gap-1.5 text-xs mb-3"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              <time dateTime={article.published_at}>
                                {formatDate(article.published_at)}
                              </time>
                            </div>
                          )}
                          {Array.isArray(article.tags) && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-auto">
                              {article.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag}>{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-9 h-9 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      style={{
                        backgroundColor: p === page ? 'var(--color-accent)' : 'var(--color-bg-card)',
                        color: p === page ? '#fff' : 'var(--color-text-secondary)',
                        border: `1px solid var(--color-border)`,
                      }}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  ))}
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
