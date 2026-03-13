/* Sous-composants d'interface extraits de la page ArticleDetail. */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircleIcon,
  ChevronUpIcon,
  EnvelopeIcon,
  HeartIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import RecaptchaNotice from '../../components/ui/RecaptchaNotice.jsx'
import ParticleBurst from '../../components/ui/ParticleBurst.jsx'
import { useScrollPosition } from '../../hooks/useScrollPosition.jsx'
import { subscribe } from '../../services/subscriberService.js'
import { executeRecaptcha } from '../../services/recaptchaService.js'

/* Barre de progression de lecture en haut de page. */
export function ReadingProgress() {
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

/* Bouton retour en haut (fixe, apparait apres 400px de scroll). */
export function BackToTopButton({ label = 'Retour en haut' }) {
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
          aria-label={label}
        >
          <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/* Table des matieres avec suivi de section active via IntersectionObserver. */
export function TableOfContents({ headings, title = 'Table des matieres' }) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    if (headings.length === 0) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -60% 0px' }
    )

    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav
      aria-label={title}
      className="rounded-[var(--ui-radius-xl)] border p-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
        boxShadow: '0 26px 54px -40px color-mix(in srgb, var(--color-accent-glow) 24%, transparent)',
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {title}
      </p>
      <ul className="space-y-2">
        {headings.map(({ id, text, level }) => (
          <li key={id} style={{ paddingLeft: level === 3 ? '0.9rem' : '0' }}>
            <a
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault()
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="group flex items-start gap-2 rounded-xl px-3 py-2 text-sm leading-snug transition-colors"
              style={{
                color: activeId === id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                backgroundColor: activeId === id
                  ? 'color-mix(in srgb, var(--color-accent-glow) 18%, transparent)'
                  : 'transparent',
              }}
            >
              <span
                className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors"
                style={{
                  backgroundColor: activeId === id
                    ? 'var(--color-accent)'
                    : 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                }}
                aria-hidden="true"
              />
              <span style={{ fontWeight: activeId === id ? '600' : '500' }}>{text}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* Sidebar de partage (desktop). */
export function ShareSidebar({
  article,
  liked,
  likesCount,
  onLike,
  onCopyLink,
  copied,
  likeAnimKey,
  likePending,
  particleTriggerKey = 0,
  particlesEnabled = true,
  particlesCount = 16,
  particlesSpreadPx = 88,
  particlesDurationMs = 700,
  copyLabel = 'Copier le lien',
  copiedLabel = 'Lien copie !',
  likeAddLabel = "J'aime cet article",
  likeRemoveLabel = 'Retirer le like',
}) {
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`

  const btnStyle = {
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-card)',
  }

  return (
    <div
      className="flex w-full flex-col items-center gap-3 rounded-[var(--ui-radius-xl)] border px-3 py-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
        boxShadow: '0 24px 56px -42px color-mix(in srgb, var(--color-accent-glow) 28%, transparent)',
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Partager
      </p>
      <button
        onClick={onCopyLink}
        title={copied ? copiedLabel : copyLabel}
        className="p-2.5 rounded-full border transition-colors focus:outline-none"
        style={btnStyle}
        onMouseEnter={(event) => {
          event.currentTarget.style.color = 'var(--color-accent)'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.color = 'var(--color-text-secondary)'
        }}
        aria-label={copyLabel}
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
        onMouseEnter={(event) => {
          event.currentTarget.style.color = 'var(--color-accent)'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.color = 'var(--color-text-secondary)'
        }}
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
        onMouseEnter={(event) => {
          event.currentTarget.style.color = 'var(--color-accent)'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.color = 'var(--color-text-secondary)'
        }}
        aria-label="Partager sur LinkedIn"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      <div className="my-1 h-px w-full" style={{ backgroundColor: 'var(--color-border)' }} />
      <div className="relative flex flex-col items-center gap-1">
        <motion.button
          key={likeAnimKey}
          onClick={onLike}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.3, 1] }}
          whileTap={{ scale: 0.8 }}
          transition={{ duration: 0.3 }}
          disabled={likePending}
          className="flex flex-col items-center gap-1 focus:outline-none disabled:opacity-60"
          aria-label={liked ? likeRemoveLabel : likeAddLabel}
        >
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
            style={{
              borderColor: liked ? '#ef4444' : 'var(--color-border)',
              color: liked ? '#ef4444' : 'var(--color-text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 84%, transparent)',
            }}
          >
            <HeartIcon
              className="h-5 w-5 transition-colors"
              style={{ fill: liked ? '#ef4444' : 'none' }}
              aria-hidden="true"
            />
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {likesCount}
          </span>
        </motion.button>
        <ParticleBurst
          triggerKey={particleTriggerKey}
          active={particlesEnabled}
          count={particlesCount}
          spreadPx={particlesSpreadPx}
          durationMs={particlesDurationMs}
        />
      </div>
    </div>
  )
}

/* Carte auteur. */
export function AuthorCard({ article }) {
  const name = article.author_name || 'BrondonJores'
  const bio = article.author_bio || 'Developpeur Full Stack passionne.'
  const initials = name.split(' ').map((word) => word[0] || '').join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="mt-10 overflow-hidden rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
      style={{
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-card) 90%, transparent), color-mix(in srgb, var(--color-accent-glow) 16%, transparent))',
        borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
        boxShadow: '0 28px 60px -44px color-mix(in srgb, var(--color-accent-glow) 24%, transparent)',
      }}
    >
      <div className="grid gap-5 md:grid-cols-[84px_minmax(0,1fr)] md:items-center">
        <div
          className="flex h-[84px] w-[84px] items-center justify-center rounded-[1.7rem] text-xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))' }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Auteur
          </p>
          <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {name}
          </p>
          <p className="mt-3 text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
            {bio}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {(article.author_github || article.author_name) && (
              <a
                href={article.author_github || `https://github.com/${article.author_name || 'BrondonJores'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  color: 'var(--color-accent)',
                  borderColor: 'color-mix(in srgb, var(--color-accent) 30%, var(--color-border))',
                  backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 12%, transparent)',
                }}
              >
                GitHub
              </a>
            )}
            {article.author_linkedin && (
              <a
                href={article.author_linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  color: 'var(--color-accent)',
                  borderColor: 'color-mix(in srgb, var(--color-accent) 30%, var(--color-border))',
                  backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 12%, transparent)',
                }}
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* Newsletter CTA inline. */
export function NewsletterCTA({
  successLabel = 'Merci ! Vous etes desormais abonne(e).',
  titleLabel = 'Vous aimez ce contenu ? Abonnez-vous pour ne rien manquer.',
  emailPlaceholder = 'votre@email.com',
  submitLabel = "S'abonner",
  submittingLabel = 'Envoi...',
  genericErrorLabel = 'Une erreur est survenue. Veuillez reessayer.',
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const captchaToken = await executeRecaptcha('newsletter_subscribe')
      await subscribe({ email, captchaToken })
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err?.message || genericErrorLabel)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-10 overflow-hidden rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
      style={{
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-secondary) 92%, transparent), color-mix(in srgb, var(--color-accent-glow) 20%, transparent))',
        borderColor: 'color-mix(in srgb, var(--color-accent) 34%, var(--color-border))',
        boxShadow: '0 28px 64px -44px color-mix(in srgb, var(--color-accent-glow) 30%, transparent)',
      }}
    >
      {status === 'success' ? (
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 20%, transparent)' }}
          >
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
          </span>
          <p className="text-sm font-medium md:text-base" style={{ color: 'var(--color-accent)' }}>
            {successLabel}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 20%, transparent)' }}
              >
                <EnvelopeIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                Newsletter
              </p>
            </div>
            <p className="max-w-lg text-base font-medium leading-relaxed md:text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {titleLabel}
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder={emailPlaceholder}
                disabled={status === 'loading'}
                className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-xl px-5 py-3 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                {status === 'loading' ? submittingLabel : submitLabel}
              </button>
            </form>
            <div className="mt-3">
              <RecaptchaNotice />
            </div>
            {status === 'error' && (
              <p className="mt-2 text-xs" style={{ color: '#f87171' }}>{errorMsg}</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
