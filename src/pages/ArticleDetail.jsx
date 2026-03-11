/* Page de detail d'un article de blog */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeftIcon,
  CalendarIcon,
  LinkIcon,
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import Badge from '../components/ui/Badge.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import BlockRenderer from '../components/ui/BlockRenderer.jsx'
import RecaptchaNotice from '../components/ui/RecaptchaNotice.jsx'
import ParticleBurst from '../components/ui/ParticleBurst.jsx'
import {
  getArticleBySlug,
  getArticles,
  likeArticle,
  unlikeArticle,
} from '../services/articleService.js'
import { getCommentsByArticle, postComment } from '../services/commentService.js'
import { executeRecaptcha } from '../services/recaptchaService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'
import { getAnimationConfig } from '../utils/animationSettings.js'
import {
  AuthorCard,
  BackToTopButton,
  NewsletterCTA,
  ReadingProgress,
  ShareSidebar,
  TableOfContents,
} from './articleDetail/ArticleDetailPanels.jsx'
import {
  estimateReadingTime,
  extractTocHeadings,
  formatDate,
  formatRelativeDate,
  getAvatarColor,
  persistLikedArticle,
  readLikedArticlesMap,
} from './articleDetail/articleDetailUtils.js'

/**
 * Normalise une valeur de tag pour la comparaison.
 * @param {unknown} tag Tag source.
 * @returns {string} Tag normalise.
 */
function normalizeTag(tag) {
  return String(tag || '').trim().toLowerCase()
}

/**
 * Classe les articles similaires selon tags partages puis recence.
 * @param {object} currentArticle Article courant.
 * @param {Array<object>} candidates Articles candidats.
 * @param {number} maxItems Nombre max de resultats.
 * @returns {Array<object>} Articles tries.
 */
function rankRelatedArticles(currentArticle, candidates, maxItems = 3) {
  const sourceTags = new Set((currentArticle?.tags || []).map(normalizeTag).filter(Boolean))

  return (candidates || [])
    .filter((candidate) => candidate && candidate.id !== currentArticle?.id)
    .map((candidate) => {
      const candidateTags = new Set((candidate.tags || []).map(normalizeTag).filter(Boolean))
      let overlap = 0
      sourceTags.forEach((tag) => {
        if (candidateTags.has(tag)) {
          overlap += 1
        }
      })
      const recencyScore = Number.isFinite(Date.parse(candidate.published_at))
        ? Date.parse(candidate.published_at) / 1_000_000_000_000
        : 0
      const visualBonus = candidate.cover_image ? 0.25 : 0

      return {
        candidate,
        score: overlap * 100 + recencyScore + visualBonus,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, maxItems))
    .map((entry) => entry.candidate)
}

export default function ArticleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )
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
  const [likeBurstKey, setLikeBurstKey] = useState(0)
  const [commentBurstKey, setCommentBurstKey] = useState(0)
  const [likePending, setLikePending] = useState(false)
  const [likeError, setLikeError] = useState('')
  const articleNotFoundLabel = settings.ui_article_not_found || 'Article introuvable.'
  const articleBackToTopLabel = settings.ui_article_back_to_top || 'Retour en haut'
  const articleBackToBlogLabel = settings.ui_article_back_to_blog || 'Retour au blog'
  const articleCopyLinkLabel = settings.ui_article_copy_link || 'Copier le lien'
  const articleLinkCopiedLabel = settings.ui_article_link_copied || 'Lien copie !'
  const articleCopyShortLabel = settings.ui_article_copy_short || 'Copier'
  const articleCopyShortCopiedLabel = settings.ui_article_copy_short_copied || 'Copie !'
  const articleLikeAddLabel = settings.ui_article_like_add || "J'aime cet article"
  const articleLikeRemoveLabel = settings.ui_article_like_remove || 'Retirer le like'
  const articleLikeOnLabel = settings.ui_article_like_label_on || 'Aime'
  const articleLikeOffLabel = settings.ui_article_like_label_off || "J'aime"
  const likeAddLabel = articleLikeAddLabel
  const likeRemoveLabel = articleLikeRemoveLabel
  const articleReadingSuffix = settings.ui_article_reading_time_suffix || 'min de lecture'
  const articleViewsSuffix = settings.ui_article_views_suffix || 'vues'
  const articleTocTitle = settings.ui_article_toc_title || 'Table des matieres'
  const articleGenericErrorLabel = settings.ui_article_generic_error || 'Une erreur est survenue. Veuillez reessayer.'
  const articleLikeErrorLabel = settings.ui_article_like_error || 'Impossible de mettre a jour le like pour le moment.'
  const articleCommentsTitle = settings.ui_article_comments_title || 'Commentaires'
  const articleCommentWord = settings.ui_article_comment_word || 'commentaire'
  const articleLeaveCommentLabel = settings.ui_article_leave_comment || 'Laisser un commentaire'
  const articleCommentPendingLabel =
    settings.ui_article_comment_pending || 'Commentaire soumis, en attente de moderation.'
  const articleCommentNamePlaceholder = settings.ui_article_comment_name_placeholder || 'Votre nom *'
  const articleCommentEmailPlaceholder = settings.ui_article_comment_email_placeholder || 'Votre email (optionnel)'
  const articleCommentContentPlaceholder = settings.ui_article_comment_content_placeholder || 'Votre commentaire...'
  const articleCommentSubmitLabel = settings.ui_article_comment_submit || 'Publier'
  const articleCommentSubmittingLabel = settings.ui_article_comment_submitting || 'Envoi...'
  const articleRelatedTitle = settings.ui_article_related_title || 'Articles similaires'
  const articleNewsletterSuccess = settings.ui_article_newsletter_success || 'Merci ! Vous etes desormais abonne(e).'
  const articleNewsletterTitle =
    settings.ui_article_newsletter_title || 'Vous aimez ce contenu ? Abonnez-vous pour ne rien manquer.'
  const articleNewsletterEmailPlaceholder =
    settings.ui_article_newsletter_email_placeholder || 'votre@email.com'
  const articleNewsletterSubmit = settings.ui_article_newsletter_submit || "S'abonner"
  const articleNewsletterSubmitting = settings.ui_article_newsletter_submitting || 'Envoi...'

  useEffect(() => {
    getArticleBySlug(slug)
      .then((res) => setArticle(res?.data || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!article) return
    setLikesCount(Math.max(0, Number.parseInt(String(article.likes ?? 0), 10) || 0))
    setLiked(Boolean(readLikedArticlesMap()[article.slug]))
    setLikePending(false)
    setLikeError('')
    getArticles({ limit: 12 })
      .then((res) => {
        const all = res?.data || []
        setRelatedArticles(rankRelatedArticles(article, all, 3))
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

  /* Toggle like persiste cote API + navigateur */
  const handleLike = async () => {
    if (!article?.slug || likePending) return

    const previousLiked = liked
    const previousCount = likesCount
    const nextLiked = !previousLiked
    const optimisticCount = nextLiked
      ? previousCount + 1
      : Math.max(0, previousCount - 1)

    setLikePending(true)
    setLikeError('')
    setLiked(nextLiked)
    setLikesCount(optimisticCount)
    setLikeAnimKey((k) => k + 1)
    if (nextLiked) {
      setLikeBurstKey((key) => key + 1)
    }

    try {
      const response = nextLiked
        ? await likeArticle(article.slug)
        : await unlikeArticle(article.slug)
      const apiLikes = Number.parseInt(String(response?.data?.likes ?? optimisticCount), 10)
      const safeLikes = Number.isFinite(apiLikes) ? Math.max(0, apiLikes) : optimisticCount

      setLikesCount(safeLikes)
      persistLikedArticle(article.slug, nextLiked)
    } catch (err) {
      setLiked(previousLiked)
      setLikesCount(previousCount)
      setLikeError(err?.message || articleLikeErrorLabel)
    } finally {
      setLikePending(false)
    }
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
          <p style={{ color: 'var(--color-text-secondary)' }}>{articleNotFoundLabel}</p>
        </main>
      </>
    )
  }

  const readingTime = estimateReadingTime(article.content)
  const tocHeadings = extractTocHeadings(article.content)
  const canonicalUrl = typeof window !== 'undefined' ? window.location.href : ''
  const articleStructuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || '',
    ...(article.cover_image ? { image: [article.cover_image] } : {}),
    datePublished: article.published_at || undefined,
    dateModified: article.updated_at || article.published_at || undefined,
    mainEntityOfPage: canonicalUrl || undefined,
    author: article.author_name
      ? { '@type': 'Person', name: article.author_name }
      : { '@type': 'Organization', name: settings.site_name || 'Portfolio' },
    publisher: {
      '@type': 'Organization',
      name: settings.site_name || 'Portfolio',
    },
    keywords: Array.isArray(article.tags) && article.tags.length > 0
      ? article.tags.join(', ')
      : undefined,
  })

  return (
    <>
      <Helmet>
        <title>{buildPageTitle(settings, article.title)}</title>
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
        <script type="application/ld+json">{articleStructuredData}</script>
      </Helmet>
      <ReadingProgress />
      <Navbar />
      <BackToTopButton label={articleBackToTopLabel} />

      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Cover image hero pleine largeur */}
        {article.cover_image && (
          <div className="relative w-full h-56 sm:h-72 md:h-96 overflow-hidden -mt-24 mb-0">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-full object-cover"
              decoding="async"
              fetchPriority="high"
              width="1600"
              height="900"
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
            {articleBackToBlogLabel}
          </button>

          {/* Layout principal : sidebar gauche + contenu + TOC droite */}
          <div className="lg:flex lg:gap-8 lg:items-start">

            {/* Sidebar de partage â€” desktop uniquement */}
            <aside className="hidden lg:flex flex-col items-center gap-3 sticky top-28 h-fit flex-shrink-0 w-12 pt-16">
              <ShareSidebar
                article={article}
                liked={liked}
                likesCount={likesCount}
                onLike={handleLike}
                onCopyLink={handleCopyLink}
                copied={copied}
                likeAnimKey={likeAnimKey}
                likePending={likePending}
                particleTriggerKey={likeBurstKey}
                particlesEnabled={animationConfig.feedbackParticlesEnabled}
                particlesCount={animationConfig.feedbackParticlesCount}
                particlesSpreadPx={animationConfig.feedbackParticlesSpreadPx}
                particlesDurationMs={animationConfig.feedbackParticlesDurationMs}
                copyLabel={articleCopyLinkLabel}
                copiedLabel={articleLinkCopiedLabel}
                likeAddLabel={articleLikeAddLabel}
                likeRemoveLabel={articleLikeRemoveLabel}
              />
            </aside>

            {/* Contenu principal */}
            <div className="flex-1 min-w-0">

              {/* En-tÃªte */}
              <header className="mb-10">
                <h1
                  className="text-4xl font-bold mb-4 leading-tight"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {article.title}
                </h1>

                {/* MÃ©tadonnÃ©es : date, temps de lecture, vues */}
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
                    {readingTime} {articleReadingSuffix}
                  </span>
                  {article.views != null && (
                    <span className="flex items-center gap-1.5">
                      <EyeIcon className="h-4 w-4" aria-hidden="true" />
                      {article.views} {articleViewsSuffix}
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

                {/* Boutons de partage mobiles (lg: masquÃ©s) */}
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
                    {copied ? articleCopyShortCopiedLabel : articleCopyShortLabel}
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
                <div className="relative inline-flex">
                  <motion.button
                    key={likeAnimKey}
                    onClick={handleLike}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.4, 1] }}
                    whileTap={{ scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    disabled={likePending}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border transition-colors focus:outline-none disabled:opacity-60"
                    style={{
                      borderColor: liked ? '#ef4444' : 'var(--color-border)',
                      color: liked ? '#ef4444' : 'var(--color-text-secondary)',
                      backgroundColor: 'var(--color-bg-card)',
                    }}
                    aria-label={liked ? likeRemoveLabel : likeAddLabel}
                  >
                    <HeartIcon
                      className="h-5 w-5"
                      style={{ fill: liked ? '#ef4444' : 'none' }}
                      aria-hidden="true"
                    />
                    {liked ? articleLikeOnLabel : articleLikeOffLabel} - {likesCount}
                  </motion.button>
                  <ParticleBurst
                    triggerKey={likeBurstKey}
                    active={animationConfig.feedbackParticlesEnabled}
                    count={animationConfig.feedbackParticlesCount}
                    spreadPx={animationConfig.feedbackParticlesSpreadPx}
                    durationMs={animationConfig.feedbackParticlesDurationMs}
                  />
                </div>
                {likeError && (
                  <p className="text-sm" style={{ color: '#ef4444' }}>
                    {likeError}
                  </p>
                )}
              </div>

              {/* Carte auteur */}
              <AuthorCard article={article} />

              {/* Newsletter CTA */}
              <NewsletterCTA
                successLabel={articleNewsletterSuccess}
                titleLabel={articleNewsletterTitle}
                emailPlaceholder={articleNewsletterEmailPlaceholder}
                submitLabel={articleNewsletterSubmit}
                submittingLabel={articleNewsletterSubmitting}
                genericErrorLabel={articleGenericErrorLabel}
              />

              {/* Section commentaires */}
              <section className="mt-12">
                <h2
                  className="text-xl font-semibold mb-6"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {comments.length === 0
                    ? articleCommentsTitle
                    : `${comments.length} ${articleCommentWord}${comments.length > 1 ? 's' : ''}`}
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
                  className="relative p-6 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <h3
                    className="text-base font-medium mb-4"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {articleLeaveCommentLabel}
                  </h3>
                  {submitSuccess ? (
                    <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
                      {articleCommentPendingLabel}
                    </p>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        setSubmitting(true)
                        setSubmitError('')
                        try {
                          const captchaToken = await executeRecaptcha('comment_create')
                          await postComment({
                            article_id: article.id,
                            author_name: commentForm.author_name,
                            author_email: commentForm.author_email || undefined,
                            content: commentForm.content,
                            captcha_token: captchaToken,
                          })
                          setSubmitSuccess(true)
                          setCommentBurstKey((key) => key + 1)
                          setCommentForm({ author_name: '', author_email: '', content: '' })
                        } catch (err) {
                          setSubmitError(err?.message || articleGenericErrorLabel)
                        } finally {
                          setSubmitting(false)
                        }
                      }}
                      className="space-y-4"
                    >
                      <input
                        type="text"
                        placeholder={articleCommentNamePlaceholder}
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
                        placeholder={articleCommentEmailPlaceholder}
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
                        placeholder={articleCommentContentPlaceholder}
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
                      <RecaptchaNotice />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                      >
                        {submitting ? articleCommentSubmittingLabel : articleCommentSubmitLabel}
                      </button>
                    </form>
                  )}
                  <ParticleBurst
                    triggerKey={commentBurstKey}
                    active={animationConfig.feedbackParticlesEnabled}
                    count={animationConfig.feedbackParticlesCount}
                    spreadPx={animationConfig.feedbackParticlesSpreadPx}
                    durationMs={animationConfig.feedbackParticlesDurationMs}
                  />
                </div>
              </section>
            </div>

            {/* Table des matiÃ¨res â€” xl+ uniquement */}
            {tocHeadings.length > 0 && (
              <aside className="hidden xl:block flex-shrink-0 w-52 sticky top-28 h-fit pt-16">
                <TableOfContents headings={tocHeadings} title={articleTocTitle} />
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
                {articleRelatedTitle}
              </h2>
              {/* Mobile: scroll horizontal â€” Desktop: grille 3 colonnes */}
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
                          loading="lazy"
                          decoding="async"
                          width="1200"
                          height="675"
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





