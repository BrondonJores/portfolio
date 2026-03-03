/* Page de detail d'un article de blog */
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeftIcon, CalendarIcon } from '@heroicons/react/24/outline'
import DOMPurify from 'dompurify'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import Badge from '../components/ui/Badge.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { getArticleBySlug } from '../services/articleService.js'
import { useScrollPosition } from '../hooks/useScrollPosition.jsx'

/* Formatage de la date */
function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/* Barre de progression de lecture en haut de page */
function ReadingProgress() {
  const scrollY = useScrollPosition()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = document.documentElement
    const scrollable = el.scrollHeight - el.clientHeight
    setProgress(scrollable > 0 ? Math.min((scrollY / scrollable) * 100, 100) : 0)
  }, [scrollY])

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-50"
      style={{ backgroundColor: 'var(--color-border)' }}
    >
      <div
        className="h-full transition-all duration-150"
        style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent)' }}
      />
    </div>
  )
}

export default function ArticleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getArticleBySlug(slug)
      .then((res) => setArticle(res?.data || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <>
        <Navbar />
        <main className="pt-24 min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Article introuvable.</p>
        </main>
      </>
    )
  }

  /* Sanitisation du contenu HTML */
  const safeContent = DOMPurify.sanitize(article.content || '')

  return (
    <>
      <Helmet>
        <title>{article.title} - BrondonJores</title>
      </Helmet>
      <ReadingProgress />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Bouton retour */}
          <button
            onClick={() => navigate('/blog')}
            className="inline-flex items-center gap-2 text-sm mb-8 transition-colors focus:outline-none"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Retour au blog
          </button>

          {/* En-tete */}
          <header className="mb-10">
            <h1
              className="text-4xl font-bold mb-4 leading-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {article.title}
            </h1>
            {article.published_at && (
              <div
                className="flex items-center gap-1.5 text-sm mb-4"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
              </div>
            )}
            {Array.isArray(article.tags) && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}
          </header>

          {/* Contenu sanitise */}
          <div
            className="prose max-w-none leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
