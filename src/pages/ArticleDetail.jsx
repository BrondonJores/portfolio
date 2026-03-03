/* Page de detail d'un article de blog */
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftIcon,
  CalendarIcon,
  LinkIcon,
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
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

/* Date relative ("il y a X jours") */
function formatRelativeDate(dateString) {
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
function estimateReadingTime(content) {
  if (!content) return 1
  let text = ''
  try {
    const parsed = JSON.parse(content)
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      text = parsed.blocks.map((b) => b.content || '').join(' ')
    }
  } catch {
    text = content.replace(/<[^>]*>/g, ' ')
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

/* Extraction des titres h2/h3 pour la table des matières */
function extractTocHeadings(content) {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      return parsed.blocks
        .filter((b) => b.type === 'heading' && (b.level === 2 || b.level === 3))
        .map((b) => ({
          id: b.content
            ? b.content.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
            : '',
          text: b.content || '',
          level: b.level,
        }))
        .filter((h) => h.id)
    }
  } catch { /* HTML legacy, pas de TOC */ }
  return []
}

/* Couleur d'avatar basée sur un hash du nom */
const AVATAR_PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#00d4a8']
function getAvatarColor(name) {
  if (!name) return 'var(--color-accent)'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
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

/* Bouton retour en haut (fixe, apparaît après 400px de scroll) */
function BackToTopButton() {
  const scrollY = useScrollPosition()
  return (
    <AnimatePresence>
      {scrollY > 400 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-6 p-3 rounded-full shadow-lg z-40 focus:outline-none"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          aria-label="Retour en haut"
        >
          <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/* Table des matières avec suivi de section active via IntersectionObserver */
function TableOfContents({ headings }) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    if (headings.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav aria-label="Table des matières">
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Table des matières
      </p>
      <ul className="space-y-1.5">
        {headings.map(({ id, text, level }) => (
          <li key={id} style={{ paddingLeft: level === 3 ? '0.75rem' : '0' }}>
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-sm block transition-colors leading-snug"
              style={{
                color: activeId === id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: activeId === id ? '600' : '400',
              }}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* Sidebar de partage (desktop) */
function ShareSidebar({ article, liked, likesCount, onLike, onCopyLink, copied, likeAnimKey }) {
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`

  const btnStyle = {
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-card)',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onCopyLink}
        title={copied ? 'Lien copié !' : 'Copier le lien'}
        className="p-2.5 rounded-full border transition-colors focus:outline-none"
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        aria-label="Copier le lien"
      >
        <LinkIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Partager sur X"
        className="p-2.5 rounded-full border transition-colors"
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        aria-label="Partager sur X (Twitter)"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.264 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      </a>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Partager sur LinkedIn"
        className="p-2.5 rounded-full border transition-colors"
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        aria-label="Partager sur LinkedIn"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      <div className="w-full border-t my-1" style={{ borderColor: 'var(--color-border)' }} />
      <motion.button
        key={likeAnimKey}
        onClick={onLike}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.3, 1] }}
        whileTap={{ scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-0.5 focus:outline-none"
        aria-label={liked ? 'Retirer le like' : "J'aime cet article"}
      >
        <HeartIcon
          className="h-5 w-5 transition-colors"
          style={{ color: liked ? '#ef4444' : 'var(--color-text-secondary)', fill: liked ? '#ef4444' : 'none' }}
          aria-hidden="true"
        />
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {likesCount}
        </span>
      </motion.button>
    </div>
  )
}

/* Carte auteur */
function AuthorCard({ article }) {
  const name = article.author_name || 'BrondonJores'
  const bio = article.author_bio || 'Développeur Full Stack passionné.'
  const initials = name.split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="flex items-start gap-4 p-6 rounded-xl border mt-10"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex-shrink-0 w-[60px] h-[60px] rounded-full flex items-center justify-center text-white font-bold text-lg"
        style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))' }}
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {name}
        </p>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {bio}
        </p>
        <div className="flex gap-3 mt-2">
          {(article.author_github || article.author_name) && (
            <a
              href={article.author_github || `https://github.com/${article.author_name || 'BrondonJores'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors"
              style={{ color: 'var(--color-accent)' }}
            >
              GitHub
            </a>
          )}
          {article.author_linkedin && (
            <a
              href={article.author_linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors"
              style={{ color: 'var(--color-accent)' }}
            >
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* Newsletter CTA inline */
function NewsletterCTA() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-6 rounded-xl border mt-10"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-accent-light)',
      }}
    >
      {subscribed ? (
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
          Merci ! 🎉 Vous êtes abonné(e).
        </p>
      ) : (
        <>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
            📬 Vous aimez ce contenu ? Abonnez-vous pour ne rien manquer.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); setSubscribed(true) }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              className="flex-1 px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              S&apos;abonner
            </button>
          </form>
        </>
      )}
    </motion.div>
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
  const [commentForm, setCommentForm] = useState({ author_name: '', author_email: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [likeAnimKey, setLikeAnimKey] = useState(0)

  useEffect(() => {
    getArticleBySlug(slug)
      .then((res) => setArticle(res?.data || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!article) return
    setLikesCount(article.likes || 0)
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

  /* Toggle like */
  const handleLike = () => {
    const newLiked = !liked
    setLiked(newLiked)
    setLikesCount((c) => newLiked ? c + 1 : c - 1)
    setLikeAnimKey((k) => k + 1)
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

  const readingTime = estimateReadingTime(article.content)
  const tocHeadings = extractTocHeadings(article.content)

  return (
    <>
      <Helmet>
        <title>{article.title} - BrondonJores</title>
        <meta name="description" content={article.excerpt || ''} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt || ''} />
        <meta property="og:image" content={article.cover_image || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.excerpt || ''} />
        <meta name="twitter:image" content={article.cover_image || ''} />
      </Helmet>
      <ReadingProgress />
      <Navbar />
      <BackToTopButton />

      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Cover image hero pleine largeur */}
        {article.cover_image && (
          <div className="relative w-full h-56 sm:h-72 md:h-96 overflow-hidden -mt-24 mb-0">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-primary)]" />
          </div>
        )}

        <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 ${article.cover_image ? 'mt-4' : ''}`}>
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

          {/* Layout principal : sidebar gauche + contenu + TOC droite */}
          <div className="lg:flex lg:gap-8 lg:items-start">

            {/* Sidebar de partage — desktop uniquement */}
            <aside className="hidden lg:flex flex-col items-center gap-3 sticky top-28 h-fit flex-shrink-0 w-12 pt-16">
              <ShareSidebar
                article={article}
                liked={liked}
                likesCount={likesCount}
                onLike={handleLike}
                onCopyLink={handleCopyLink}
                copied={copied}
                likeAnimKey={likeAnimKey}
              />
            </aside>

            {/* Contenu principal */}
            <div className="flex-1 min-w-0">

              {/* En-tête */}
              <header className="mb-10">
                <h1
                  className="text-4xl font-bold mb-4 leading-tight"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {article.title}
                </h1>

                {/* Métadonnées : date, temps de lecture, vues */}
                <div
                  className="flex flex-wrap items-center gap-4 text-sm mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {article.published_at && (
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                      <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="h-4 w-4" aria-hidden="true" />
                    {readingTime} min de lecture
                  </span>
                  {article.views != null && (
                    <span className="flex items-center gap-1.5">
                      <EyeIcon className="h-4 w-4" aria-hidden="true" />
                      {article.views} vues
                    </span>
                  )}
                </div>

                {Array.isArray(article.tags) && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Boutons de partage mobiles (lg: masqués) */}
                <div className="flex flex-wrap items-center gap-2 mt-4 lg:hidden">
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors focus:outline-none"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'var(--color-bg-card)',
                    }}
                  >
                    <LinkIcon className="h-4 w-4" aria-hidden="true" />
                    {copied ? 'Copié !' : 'Copier'}
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
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.264 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                    </svg>
                    X
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
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </a>
                </div>
              </header>

              {/* Contenu de l'article */}
              <BlockRenderer content={article.content} />

              {/* Bouton Like (fin d'article) */}
              <div
                className="flex items-center gap-3 mt-10 pt-6 border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <motion.button
                  key={likeAnimKey}
                  onClick={handleLike}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.4, 1] }}
                  whileTap={{ scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border transition-colors focus:outline-none"
                  style={{
                    borderColor: liked ? '#ef4444' : 'var(--color-border)',
                    color: liked ? '#ef4444' : 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-bg-card)',
                  }}
                  aria-label={liked ? 'Retirer le like' : "J'aime cet article"}
                >
                  <HeartIcon
                    className="h-5 w-5"
                    style={{ fill: liked ? '#ef4444' : 'none' }}
                    aria-hidden="true"
                  />
                  {liked ? 'Aimé' : "J'aime"} · {likesCount}
                </motion.button>
              </div>

              {/* Carte auteur */}
              <AuthorCard article={article} />

              {/* Newsletter CTA */}
              <NewsletterCTA />

              {/* Section commentaires */}
              <section className="mt-12">
                <h2
                  className="text-xl font-semibold mb-6"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {comments.length === 0
                    ? 'Commentaires'
                    : `${comments.length} commentaire${comments.length > 1 ? 's' : ''}`}
                </h2>

                {/* Liste des commentaires */}
                {comments.length > 0 && (
                  <div className="space-y-4 mb-8">
                    {comments.map((c, idx) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 rounded-xl border"
                        style={{
                          backgroundColor: 'var(--color-bg-card)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {/* Avatar avec initiale */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: getAvatarColor(c.author_name) }}
                            aria-hidden="true"
                          >
                            {c.author_name ? c.author_name[0].toUpperCase() : '?'}
                          </div>
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
                            {c.created_at ? formatRelativeDate(c.created_at) : ''}
                          </span>
                        </div>
                        <p
                          className="text-sm leading-relaxed pl-11"
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
                    <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
                      Commentaire soumis, en attente de modération.
                    </p>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        setSubmitting(true)
                        setSubmitError('')
                        try {
                          await postComment({
                            article_id: article.id,
                            author_name: commentForm.author_name,
                            author_email: commentForm.author_email || undefined,
                            content: commentForm.content,
                          })
                          setSubmitSuccess(true)
                          setCommentForm({ author_name: '', author_email: '', content: '' })
                        } catch {
                          setSubmitError('Une erreur est survenue. Veuillez réessayer.')
                        } finally {
                          setSubmitting(false)
                        }
                      }}
                      className="space-y-4"
                    >
                      <input
                        type="text"
                        placeholder="Votre nom *"
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
                      <input
                        type="email"
                        placeholder="Votre email (optionnel)"
                        value={commentForm.author_email}
                        onChange={(e) => setCommentForm((prev) => ({ ...prev, author_email: e.target.value }))}
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
                      {submitError && (
                        <p className="text-sm" style={{ color: '#ef4444' }}>
                          {submitError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                      >
                        {submitting ? 'Envoi...' : 'Publier'}
                      </button>
                    </form>
                  )}
                </div>
              </section>
            </div>

            {/* Table des matières — xl+ uniquement */}
            {tocHeadings.length > 0 && (
              <aside className="hidden xl:block flex-shrink-0 w-52 sticky top-28 h-fit pt-16">
                <TableOfContents headings={tocHeadings} />
              </aside>
            )}
          </div>

          {/* Articles similaires */}
          {relatedArticles.length > 0 && (
            <section className="mt-16">
              <h2
                className="text-xl font-semibold mb-6"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Articles similaires
              </h2>
              {/* Mobile: scroll horizontal — Desktop: grille 3 colonnes */}
              <div className="flex gap-4 overflow-x-auto snap-x pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
                {relatedArticles.map((a, idx) => (
                  <motion.div
                    key={a.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex-shrink-0 w-72 snap-start md:w-auto"
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
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-32 flex items-center justify-center"
                          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          <DocumentTextIcon
                            className="h-10 w-10"
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
                        {Array.isArray(a.tags) && a.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
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
