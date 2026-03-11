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
    <nav aria-label={title}>
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {title}
      </p>
      <ul className="space-y-1.5">
        {headings.map(({ id, text, level }) => (
          <li key={id} style={{ paddingLeft: level === 3 ? '0.75rem' : '0' }}>
            <a
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault()
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
    <div className="flex flex-col items-center gap-3">
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
      <div className="w-full border-t my-1" style={{ borderColor: 'var(--color-border)' }} />
      <div className="relative">
        <motion.button
          key={likeAnimKey}
          onClick={onLike}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.3, 1] }}
          whileTap={{ scale: 0.8 }}
          transition={{ duration: 0.3 }}
          disabled={likePending}
          className="flex flex-col items-center gap-0.5 focus:outline-none disabled:opacity-60"
          aria-label={liked ? likeRemoveLabel : likeAddLabel}
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
      className="p-6 rounded-xl border mt-10"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-accent)',
      }}
    >
      {status === 'success' ? (
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
            {successLabel}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <EnvelopeIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {titleLabel}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder={emailPlaceholder}
              disabled={status === 'loading'}
              className="flex-1 px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {status === 'loading' ? submittingLabel : submitLabel}
            </button>
          </form>
          <div className="mt-3">
            <RecaptchaNotice />
          </div>
          {status === 'error' && (
            <p className="text-xs mt-2" style={{ color: '#f87171' }}>{errorMsg}</p>
          )}
        </>
      )}
    </motion.div>
  )
}
