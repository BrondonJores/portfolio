/* Page de detail d'un article de blog */
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, CalendarIcon, LinkIcon, ShareIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import Badge from '../components/ui/Badge.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import BlockRenderer from '../components/ui/BlockRenderer.jsx'
import { getArticleBySlug, getArticles } from '../services/articleService.js'
import { getCommentsByArticle, postComment } from '../services/commentService.js'
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
  const [copied, setCopied] = useState(false)
  const [relatedArticles, setRelatedArticles] = useState([])
  const [comments, setComments] = useState([])
  const [commentForm, setCommentForm] = useState({ author_name: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    getArticleBySlug(slug)
      .then((res) => setArticle(res?.data || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!article) return
    getArticles({ limit: 4 })
      .then((res) => {
        const all = res?.data || []
        setRelatedArticles(all.filter((a) => a.id !== article.id).slice(0, 3))
      })
      .catch(() => {})
    getCommentsByArticle(article.id)
      .then((res) => setComments(res?.data || []))
      .catch(() => {})
  }, [article])

  /* Copie du lien dans le presse-papiers */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

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

  /* Sanitisation du contenu HTML (conservee pour retrocompatibilite dans BlockRenderer) */

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
            {/* Image de couverture */}
            {article.cover_image && (
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full max-w-3xl max-h-72 object-cover rounded-xl mb-6"
              />
            )}
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
            {/* Bouton de partage */}
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 text-sm mt-4 transition-colors focus:outline-none"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              {copied ? 'Lien copié !' : 'Copier le lien'}
            </button>
          </header>

          {/* Contenu de l'article */}
          <BlockRenderer content={article.content} />

          {/* Barre de partage */}
          <div
            className="flex flex-wrap items-center gap-3 mt-10 pt-6 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors focus:outline-none"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-card)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              {copied ? 'Copié !' : 'Copier le lien'}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-card)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <ShareIcon className="h-4 w-4" aria-hidden="true" />
              Twitter/X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-card)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <ShareIcon className="h-4 w-4" aria-hidden="true" />
              LinkedIn
            </a>
          </div>

          {/* Section commentaires */}
          <section className="mt-12">
            <h2
              className="text-xl font-semibold mb-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Commentaires ({comments.length})
            </h2>

            {/* Liste des commentaires */}
            {comments.length > 0 && (
              <div className="space-y-4 mb-8">
                {comments.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {c.author_name}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {c.content}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Formulaire d'ajout de commentaire */}
            <div
              className="p-6 rounded-xl border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              <h3
                className="text-base font-medium mb-4"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Laisser un commentaire
              </h3>
              {submitSuccess ? (
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Commentaire soumis ! Il apparaîtra après modération.
                </p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setSubmitting(true)
                    try {
                      await postComment({
                        article_id: article.id,
                        author_name: commentForm.author_name,
                        content: commentForm.content,
                      })
                      setSubmitSuccess(true)
                      setCommentForm({ author_name: '', content: '' })
                    } catch {
                      /* Echec silencieux */
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                  className="space-y-4"
                >
                  <input
                    type="text"
                    placeholder="Votre nom"
                    value={commentForm.author_name}
                    onChange={(e) => setCommentForm((prev) => ({ ...prev, author_name: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={{
                      backgroundColor: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <textarea
                    placeholder="Votre commentaire..."
                    value={commentForm.content}
                    onChange={(e) => setCommentForm((prev) => ({ ...prev, content: e.target.value }))}
                    required
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: '#fff',
                    }}
                  >
                    {submitting ? 'Envoi...' : 'Publier le commentaire'}
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* Articles similaires */}
          {relatedArticles.length > 0 && (
            <section className="mt-16">
              <h2
                className="text-xl font-semibold mb-6"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Articles similaires
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedArticles.map((a) => (
                  <motion.div
                    key={a.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="min-h-[320px]"
                  >
                    <Link
                      to={`/blog/${a.slug}`}
                      className="block h-full rounded-xl overflow-hidden border"
                      style={{
                        backgroundColor: 'var(--color-bg-card)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      {a.cover_image ? (
                        <img
                          src={a.cover_image}
                          alt={a.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-48 flex items-center justify-center"
                          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          <DocumentTextIcon
                            className="h-12 w-12"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-hidden="true"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <p
                          className="font-semibold text-sm mb-2 line-clamp-2"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {a.title}
                        </p>
                        {a.excerpt && (
                          <p
                            className="text-sm mb-3 line-clamp-2"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {a.excerpt}
                          </p>
                        )}
                        {Array.isArray(a.tags) && a.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {a.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </div>
                        )}
                        {a.published_at && (
                          <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            <time dateTime={a.published_at}>{formatDate(a.published_at)}</time>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
