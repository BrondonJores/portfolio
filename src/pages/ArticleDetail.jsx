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
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import BlockRenderer from '../components/ui/BlockRenderer.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
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
  formatRelativeDate,
  getAvatarColor,
  persistLikedArticle,
  readLikedArticlesMap,
} from './articleDetail/articleDetailUtils.js'
import {
  buildArticleReadingProfile,
  formatArticleDate,
  getRelatedArticleReason,
} from '../utils/articleReading.js'

function rankRelatedArticles(currentArticle, candidates, maxItems = 3) {
  const sourceTags = new Set((currentArticle?.tags || []).map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean))

  return (candidates || [])
    .filter((candidate) => candidate && candidate.id !== currentArticle?.id)
    .map((candidate) => {
      const candidateTags = new Set((candidate.tags || []).map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean))
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
  const articleLinkCopiedLabel = settings.ui_article_link_copied || 'Lien copié !'
  const articleCopyShortLabel = settings.ui_article_copy_short || 'Copier'
  const articleCopyShortCopiedLabel = settings.ui_article_copy_short_copied || 'Copié !'
  const articleLikeAddLabel = settings.ui_article_like_add || "J'aime cet article"
  const articleLikeRemoveLabel = settings.ui_article_like_remove || 'Retirer le like'
  const articleLikeOnLabel = settings.ui_article_like_label_on || 'Aimé'
  const articleLikeOffLabel = settings.ui_article_like_label_off || "J'aime"
  const likeAddLabel = articleLikeAddLabel
  const likeRemoveLabel = articleLikeRemoveLabel
  const articleReadingSuffix = settings.ui_article_reading_time_suffix || 'min de lecture'
  const articleViewsSuffix = settings.ui_article_views_suffix || 'vues'
  const articleTocTitle = settings.ui_article_toc_title || 'Table des matières'
  const articleGenericErrorLabel = settings.ui_article_generic_error || 'Une erreur est survenue. Veuillez réessayer.'
  const articleLikeErrorLabel = settings.ui_article_like_error || 'Impossible de mettre à jour le like pour le moment.'
  const articleCommentsTitle = settings.ui_article_comments_title || 'Commentaires'
  const articleCommentWord = settings.ui_article_comment_word || 'commentaire'
  const articleLeaveCommentLabel = settings.ui_article_leave_comment || 'Laisser un commentaire'
  const articleCommentPendingLabel =
    settings.ui_article_comment_pending || 'Commentaire soumis, en attente de modération.'
  const articleCommentNamePlaceholder = settings.ui_article_comment_name_placeholder || 'Votre nom *'
  const articleCommentEmailPlaceholder = settings.ui_article_comment_email_placeholder || 'Votre email (optionnel)'
  const articleCommentContentPlaceholder = settings.ui_article_comment_content_placeholder || 'Votre commentaire...'
  const articleCommentSubmitLabel = settings.ui_article_comment_submit || 'Publier'
  const articleCommentSubmittingLabel = settings.ui_article_comment_submitting || 'Envoi...'
  const articleRelatedTitle = settings.ui_article_related_title || 'Articles similaires'
  const articleNewsletterSuccess = settings.ui_article_newsletter_success || 'Merci ! Vous êtes désormais abonné(e).'
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

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

  const readingProfile = buildArticleReadingProfile(article)
  const readingTime = readingProfile.readingTime
  const tocHeadings = readingProfile.tocHeadings
  const canonicalUrl = typeof window !== 'undefined' ? window.location.href : ''
  const articleLead = readingProfile.lead
  const articleTags = Array.isArray(article.tags) ? article.tags.filter(Boolean).slice(0, 8) : []
  const readingGuideCards = [
    {
      key: 'focus',
      label: 'Focus',
      value: readingProfile.focusValue,
      helper: readingProfile.focusDetail,
    },
    {
      key: 'rythme',
      label: 'Rythme',
      value: `${readingTime} min`,
      helper: readingProfile.rhythmValue,
    },
    {
      key: 'format',
      label: 'Format',
      value: readingProfile.formatValue,
      helper: readingProfile.formatDetail,
    },
  ]
  const articleMetaCards = [
    {
      key: 'publication',
      label: 'Publication',
      value: article.published_at ? formatArticleDate(article.published_at) : 'Bientôt',
      helper: article.author_name || settings.site_name || 'Portfolio',
    },
    {
      key: 'lecture',
      label: 'Lecture',
      value: `${readingTime} ${articleReadingSuffix}`,
      helper: readingProfile.coverageDetail,
    },
    {
      key: 'impact',
      label: 'Impact',
      value: article.views != null ? `${article.views} ${articleViewsSuffix}` : `${likesCount} appréciations`,
      helper: `${likesCount} signal${likesCount > 1 ? 's' : ''} de lecture`,
    },
    {
      key: 'couverture',
      label: 'Couverture',
      value: readingProfile.coverageValue,
      helper: readingProfile.chapterLabels.length > 0 ? readingProfile.chapterLabels.join(' | ') : 'Parcours de lecture continu',
    },
  ]

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
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.excerpt || ''} />
        <meta name="twitter:image" content={article.cover_image || ''} />
        <script type="application/ld+json">{articleStructuredData}</script>
      </Helmet>
      <ReadingProgress />
      <Navbar />
      <BackToTopButton label={articleBackToTopLabel} />

      <main className="min-h-screen pb-16 pt-28" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/blog')}
            className="mb-8 inline-flex items-center gap-2 text-sm transition-colors focus:outline-none"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(event) => { event.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            {articleBackToBlogLabel}
          </button>

          <section className="mb-10 grid gap-8 xl:grid-cols-[minmax(0,1.04fr)_320px] xl:items-end">
            <div>
              <p
                className="mb-4 text-[11px] uppercase tracking-[0.22em]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Journal de fond
              </p>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                    color: 'var(--color-accent-light)',
                  }}
                >
                  Lecture approfondie
                </span>
                {article.published_at && <Badge>{formatArticleDate(article.published_at)}</Badge>}
              </div>

              <h1
                className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {article.title}
              </h1>

              <p
                className="mt-6 max-w-3xl text-base leading-relaxed md:text-lg"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {articleLead}
              </p>

              <div
                className="mt-6 flex flex-wrap items-center gap-4 text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {article.published_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                    <time dateTime={article.published_at}>{formatArticleDate(article.published_at)}</time>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4" aria-hidden="true" />
                  {readingTime} {articleReadingSuffix}
                </span>
                {article.views != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <EyeIcon className="h-4 w-4" aria-hidden="true" />
                    {article.views} {articleViewsSuffix}
                  </span>
                )}
              </div>

              {articleTags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {articleTags.map((tag) => (
                    <Badge key={`${article.id}-${tag}`}>{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3 lg:hidden">
                <Button variant="ghost" onClick={handleCopyLink}>
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  {copied ? articleCopyShortCopiedLabel : articleCopyShortLabel}
                </Button>
                <Button
                  variant="secondary"
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(article.title)}`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.264 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                  </svg>
                  X
                </Button>
                <Button
                  variant="secondary"
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </Button>
                <button
                  onClick={handleLike}
                  disabled={likePending}
                  className="inline-flex min-h-[var(--ui-control-height)] items-center gap-2 rounded-[var(--ui-radius-xl)] border px-[var(--ui-button-px)] py-[var(--ui-button-py)] text-[length:var(--ui-button-font-size)] font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    borderColor: liked ? '#ef4444' : 'color-mix(in srgb, var(--color-border) 70%, transparent)',
                    color: liked ? '#ef4444' : 'var(--color-text-secondary)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
                  }}
                >
                  <HeartIcon className="h-4 w-4" style={{ fill: liked ? '#ef4444' : 'none' }} aria-hidden="true" />
                  {liked ? articleLikeOnLabel : articleLikeOffLabel} - {likesCount}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {articleMetaCards.map((card) => (
                <Card key={card.key} className="h-full">
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    {card.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {card.helper}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {article.cover_image && (
            <section className="mb-12">
              <div
                className="overflow-hidden rounded-[2rem] border p-2"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 78%, var(--color-accent))',
                  background:
                    'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-secondary) 86%, transparent), color-mix(in srgb, var(--color-accent-glow) 24%, transparent))',
                  boxShadow: '0 32px 72px -42px color-mix(in srgb, var(--color-accent-glow) 42%, transparent)',
                }}
                >
                  <div
                    className="overflow-hidden rounded-[1.5rem]"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 84%, transparent)' }}
                  >
                    <SmartImage
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full"
                      imgClassName="max-h-[42rem] w-full object-cover object-center"
                      loading="eager"
                      fetchPriority="high"
                      width="1800"
                      height="1012"
                      sizes="(min-width: 1280px) 1200px, 100vw"
                      widths={[768, 1024, 1440, 1800, 2200]}
                      maxWidth={2200}
                      quality="auto:best"
                      fallback={(
                        <DocumentTextIcon
                          className="h-14 w-14"
                          style={{ color: 'var(--color-accent)', opacity: 0.42 }}
                          aria-hidden="true"
                        />
                      )}
                      style={{ minHeight: '18rem' }}
                    />
                  </div>
                </div>
              </section>
            )}

          <section className="mb-10">
            <Card>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Guide de lecture
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                    Un repere rapide pour savoir ce que couvre l&apos;article avant d&apos;entrer dans le fond.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    Cette lecture pose son angle, son rythme et son format pour que tu puisses choisir entre lecture rapide, approfondie ou consultation ciblée.
                  </p>

                  {readingProfile.chapterLabels.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {readingProfile.chapterLabels.map((chapter) => (
                        <span
                          key={`${article.id}-${chapter}`}
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
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
                  {readingGuideCards.map((item) => (
                    <div
                      key={`${article.id}-${item.key}`}
                      className="rounded-2xl border px-4 py-4"
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
              </div>

              {tocHeadings.length > 0 && (
                <TableOfContents
                  headings={tocHeadings}
                  title={articleTocTitle}
                  helper={`${tocHeadings.length} repères pour naviguer sans casser le rythme.`}
                  className="mt-6 xl:hidden"
                  collapsible
                  defaultOpen={false}
                  listId="article-toc-mobile"
                />
              )}
            </Card>
          </section>

          <section className="grid gap-8 lg:grid-cols-[88px_minmax(0,1fr)] xl:grid-cols-[88px_minmax(0,1fr)_240px] xl:items-start">
            <aside className="hidden lg:block lg:sticky lg:top-28 lg:h-fit">
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

            <div className="min-w-0">
              <div
                className="rounded-[var(--ui-radius-2xl)] border p-6 md:p-8"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 78%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 88%, transparent)',
                }}
              >
                <BlockRenderer content={article.content} />
              </div>

              <section
                className="mt-8 rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
                }}
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-xl">
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Ressenti de lecture
                    </p>
                    <p className="mt-3 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Ce contenu t&apos;a aidé ? Tu peux le signaler en un clic.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      Les retours rapides me permettent d&apos;identifier les sujets qui méritent d&apos;être poussés plus loin.
                    </p>
                  </div>
                  <div className="relative inline-flex">
                    <motion.button
                      key={likeAnimKey}
                      onClick={handleLike}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.4, 1] }}
                      whileTap={{ scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      disabled={likePending}
                      className="flex items-center gap-2 rounded-full border px-5 py-3 transition-colors focus:outline-none disabled:opacity-60"
                      style={{
                        borderColor: liked ? '#ef4444' : 'var(--color-border)',
                        color: liked ? '#ef4444' : 'var(--color-text-secondary)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 86%, transparent)',
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
                </div>
                {likeError && (
                  <p className="mt-4 text-sm" style={{ color: '#ef4444' }}>
                    {likeError}
                  </p>
                )}
              </section>

              <AuthorCard article={article} />

              <NewsletterCTA
                successLabel={articleNewsletterSuccess}
                titleLabel={articleNewsletterTitle}
                emailPlaceholder={articleNewsletterEmailPlaceholder}
                submitLabel={articleNewsletterSubmit}
                submittingLabel={articleNewsletterSubmitting}
                genericErrorLabel={articleGenericErrorLabel}
              />

              <section
                className="mt-12 rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 86%, transparent)',
                }}
              >
                <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Discussion
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {comments.length === 0
                        ? articleCommentsTitle
                        : `${comments.length} ${articleCommentWord}${comments.length > 1 ? 's' : ''}`}
                    </h2>
                  </div>
                  <p className="max-w-md text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    Partage ton retour, une question ou un angle complémentaire. Les commentaires passent en modération avant publication.
                  </p>
                </div>

                {comments.length > 0 && (
                  <div className="mb-8 space-y-4">
                    {comments.map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-[var(--ui-radius-xl)] border p-5"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 62%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                        }}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white"
                            style={{ backgroundColor: getAvatarColor(comment.author_name) }}
                            aria-hidden="true"
                          >
                            {comment.author_name ? comment.author_name[0].toUpperCase() : '?'}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {comment.author_name}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {comment.created_at ? formatRelativeDate(comment.created_at) : ''}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                          {comment.content}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div
                  className="relative rounded-[var(--ui-radius-xl)] border p-5 md:p-6"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 66%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  }}
                >
                  <h3 className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {articleLeaveCommentLabel}
                  </h3>
                  {submitSuccess ? (
                    <p className="mt-3 text-sm" style={{ color: 'var(--color-accent)' }}>
                      {articleCommentPendingLabel}
                    </p>
                  ) : (
                    <form
                      onSubmit={async (event) => {
                        event.preventDefault()
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
                      className="mt-5 space-y-4"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          type="text"
                          placeholder={articleCommentNamePlaceholder}
                          value={commentForm.author_name}
                          onChange={(event) => setCommentForm((prev) => ({ ...prev, author_name: event.target.value }))}
                          required
                          className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
                          onChange={(event) => setCommentForm((prev) => ({ ...prev, author_email: event.target.value }))}
                          className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </div>
                      <textarea
                        placeholder={articleCommentContentPlaceholder}
                        value={commentForm.content}
                        onChange={(event) => setCommentForm((prev) => ({ ...prev, content: event.target.value }))}
                        required
                        rows={5}
                        className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
                        className="rounded-xl px-5 py-3 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
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

            {tocHeadings.length > 0 && (
              <aside className="hidden xl:block xl:sticky xl:top-28 xl:h-fit">
                <TableOfContents
                  headings={tocHeadings}
                  title={articleTocTitle}
                  helper={`${tocHeadings.length} repères pour suivre la lecture.`}
                  listId="article-toc-desktop"
                />
              </aside>
            )}
          </section>

          {relatedArticles.length > 0 && (
            <section className="mt-16">
              <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    À poursuivre
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {articleRelatedTitle}
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  Une sélection d&apos;articles proches pour prolonger la lecture sans casser le rythme.
                </p>
              </div>

              <div className="flex gap-4 overflow-x-auto snap-x pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
                {relatedArticles.map((relatedArticle, index) => (
                  <motion.div
                    key={relatedArticle.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="w-72 flex-shrink-0 snap-start md:w-auto"
                  >
                      <Link to={`/blog/${relatedArticle.slug}`} className="block h-full">
                      <Card className="h-full overflow-hidden p-0">
                        {relatedArticle.cover_image ? (
                          <SmartImage
                            src={relatedArticle.cover_image}
                            alt={relatedArticle.title}
                            className="h-44"
                            imgClassName="h-44 w-full object-cover"
                            loading="lazy"
                            width="1200"
                            height="675"
                            sizes="(min-width: 768px) 33vw, 18rem"
                            widths={[480, 720, 960, 1200]}
                            maxWidth={1200}
                            quality="auto:good"
                            fallback={(
                              <DocumentTextIcon
                                className="h-10 w-10"
                                style={{ color: 'var(--color-text-secondary)' }}
                                aria-hidden="true"
                              />
                            )}
                          />
                        ) : (
                          <div
                            className="flex h-44 w-full items-center justify-center"
                            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                          >
                            <DocumentTextIcon
                              className="h-10 w-10"
                              style={{ color: 'var(--color-text-secondary)' }}
                              aria-hidden="true"
                            />
                          </div>
                        )}
                        <div className="p-5">
                          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                            Article lié
                          </p>
                          <p className="mt-3 line-clamp-2 text-lg font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                            {relatedArticle.title}
                          </p>
                          {relatedArticle.excerpt && (
                            <p className="mt-3 line-clamp-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                              {relatedArticle.excerpt}
                            </p>
                          )}
                          {Array.isArray(relatedArticle.tags) && relatedArticle.tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {relatedArticle.tags.slice(0, 3).map((tag) => (
                                <Badge key={`${relatedArticle.id}-${tag}`}>{tag}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {relatedArticle.published_at && (
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                <time dateTime={relatedArticle.published_at}>{formatArticleDate(relatedArticle.published_at, { month: 'short' })}</time>
                              </span>
                            )}
                            <span>{buildArticleReadingProfile(relatedArticle).readingTime} min</span>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            {getRelatedArticleReason(article, relatedArticle)}
                          </p>
                        </div>
                      </Card>
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
