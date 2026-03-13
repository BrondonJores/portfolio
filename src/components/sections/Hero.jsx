import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDownIcon,
  BoltIcon,
  MapPinIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Button from '../ui/Button.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import AnimatedSceneAsset from '../ui/AnimatedSceneAsset.jsx'
import AnimatedCounter from '../ui/AnimatedCounter.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'
import { buildSectionContainerVariants, buildSectionItemVariants } from '../../utils/sectionMotionProfiles.js'

function buildInitials(name) {
  const safeName = typeof name === 'string' ? name.trim() : ''
  if (!safeName) {
    return 'BJ'
  }
  return safeName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function toMetricValue(rawValue, fallback) {
  const value = String(rawValue ?? '').trim()
  return value || fallback
}

export default function Hero({ homeMetrics = [] }) {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'hero'),
    [settings, prefersReducedMotion]
  )

  const heroNameRaw = settings.hero_name || 'Brondon Jores'
  const initials = buildInitials(heroNameRaw)
  const heroTitleRaw = settings.hero_title || 'Développeur\nFull Stack'
  const titleLines = heroTitleRaw.includes('\n')
    ? heroTitleRaw.split('\n').filter((line) => line.trim().length > 0)
    : [heroTitleRaw]
  const bio = settings.hero_bio || 'Je construis des applications web modernes, performantes et sécurisées.'
  const availability = settings.contact_availability || 'Disponible pour des projets'
  const location = settings.contact_location || 'Remote'
  const photoStatus = settings.hero_photo_status || 'Ouvert aux collaborations'
  const photoStack = settings.hero_photo_stack || 'React | Node.js | PostgreSQL'
  const photoAlt = settings.hero_photo_alt || `Portrait de ${heroNameRaw}`
  const photoObjectPosition = settings.hero_photo_object_position || '50% 30%'
  const avatarUrl = settings.avatar_url || ''
  const heroCtaProjects = settings.ui_hero_cta_projects || 'Voir mes projets'
  const heroCtaContact = settings.ui_hero_cta_contact || 'Me contacter'

  const proofMetrics = homeMetrics.length > 0
    ? homeMetrics
    : [
        { value: '12', label: 'Projets', detail: 'showcases visibles' },
        { value: '08', label: 'Articles', detail: 'retours terrain' },
        { value: '06', label: 'Certifications', detail: 'preuves officielles' },
      ]

  const sideStats = [
    {
      value: toMetricValue(settings.stat_1_value, '3+'),
      label: settings.stat_1_label || "ans d’expérience",
    },
    {
      value: toMetricValue(settings.stat_2_value, '20+'),
      label: settings.stat_2_label || 'projets livrés',
    },
    {
      value: toMetricValue(settings.stat_3_value, '10+'),
      label: settings.stat_3_label || 'clients satisfaits',
    },
  ]

  const contextRows = [
    { label: 'Disponibilité', value: availability },
    { label: 'Base', value: location },
    { label: 'Focus', value: photoStack },
  ]

  const canAnimate = animationConfig.canAnimate
  const revealDuration = Math.max(0.22, 0.62 * animationConfig.durationScale)
  const containerVariants = useMemo(
    () => buildSectionContainerVariants('hero', animationConfig),
    [animationConfig]
  )
  const itemVariants = useMemo(
    () => buildSectionItemVariants('hero', animationConfig),
    [animationConfig]
  )
  const loopingFloatTransition = useMemo(
    () => ({
      duration: 8 * animationConfig.durationScale,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatType: 'mirror',
    }),
    [animationConfig.durationScale]
  )

  return (
    <section
      id="hero"
      className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-28 lg:pt-36"
    >
      <AnimatedMascots scope="hero" sceneKey="hero" />
      <AnimatedSceneAsset scope="hero" sceneKey="hero" />

      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          backgroundImage: `
            radial-gradient(circle at 14% 18%, color-mix(in srgb, var(--color-accent-glow) 92%, transparent), transparent 28%),
            radial-gradient(circle at 84% 24%, color-mix(in srgb, var(--color-accent-glow) 70%, transparent), transparent 24%),
            linear-gradient(180deg, color-mix(in srgb, var(--color-bg-secondary) 44%, transparent), transparent 42%)
          `,
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-45"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--color-border) 32%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--color-border) 26%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.62), transparent 92%)',
        }}
      />

      <div className="relative z-20 mx-auto max-w-6xl">
        <motion.div
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          animate={canAnimate ? 'visible' : false}
          className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(330px,0.82fr)] xl:gap-14"
        >
          <div className="order-2 flex flex-col justify-end lg:order-1">
            <motion.div
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="mb-6 flex flex-wrap items-center gap-3"
            >
              <motion.span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
                style={{
                  color: 'var(--color-accent-light)',
                  borderColor: 'color-mix(in srgb, var(--color-accent) 62%, var(--color-border))',
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                }}
                animate={canAnimate ? { y: [0, -2, 0] } : undefined}
                transition={canAnimate ? loopingFloatTransition : undefined}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${canAnimate ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                {availability}
              </motion.span>
              <span
                className="inline-flex items-center gap-2 text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <MapPinIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                {location}
              </span>
            </motion.div>

            <motion.p
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="mb-4 text-[11px] uppercase tracking-[0.28em]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {heroNameRaw}
            </motion.p>

            <motion.h1
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="max-w-4xl text-[clamp(3.6rem,8vw,7rem)] font-semibold leading-[0.92] tracking-[-0.05em]"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {titleLines.map((line, index) => {
                const isLastLine = index === titleLines.length - 1
                return (
                  <motion.span
                    key={`${line}-${index}`}
                    className="block"
                    initial={canAnimate ? { opacity: 0, y: 28, filter: 'blur(10px)' } : false}
                    animate={canAnimate ? { opacity: 1, y: 0, filter: 'blur(0px)' } : false}
                    transition={{
                      duration: revealDuration * 0.92,
                      delay: canAnimate ? 0.12 + index * 0.08 : 0,
                      ease: 'easeOut',
                    }}
                  >
                    {isLastLine ? <span className="gradient-text">{line}</span> : line}
                  </motion.span>
                )
              })}
            </motion.h1>

            <motion.div
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="mt-8 grid gap-6"
            >
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {bio}
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {contextRows.map((row, index) => (
                  <motion.article
                    key={row.label}
                    className="rounded-[var(--ui-radius-xl)] border px-4 py-3"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-border) 78%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 72%, transparent)',
                    }}
                    whileHover={canAnimate ? { y: -4, scale: 1.01 } : undefined}
                    transition={{
                      duration: 0.22 * animationConfig.durationScale,
                      delay: canAnimate ? index * 0.02 : 0,
                      ease: 'easeOut',
                    }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      {row.label}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                      {row.value}
                    </p>
                  </motion.article>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <Button variant="primary" href="#projects">
                {heroCtaProjects}
              </Button>
              <Button variant="secondary" href="#contact">
                {heroCtaContact}
              </Button>
              <motion.a
                href="#projects"
                className="inline-flex items-center gap-2 text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
                whileHover={canAnimate ? { x: 4 } : undefined}
                transition={{ duration: 0.22 * animationConfig.durationScale, ease: 'easeOut' }}
              >
                Explorer la preuve
                <motion.span
                  animate={canAnimate ? { y: [0, 4, 0], opacity: [0.62, 1, 0.62] } : undefined}
                  transition={canAnimate ? { duration: 1.8 * animationConfig.durationScale, repeat: Infinity, ease: 'easeInOut' } : undefined}
                >
                  <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
                </motion.span>
              </motion.a>
            </motion.div>

            <motion.div
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {proofMetrics.map((metric, index) => (
                <motion.article
                  key={metric.label}
                  className="rounded-[var(--ui-radius-xl)] border px-4 py-4"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 78%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 76%, transparent)',
                  }}
                  whileHover={canAnimate ? { y: -6, scale: 1.015 } : undefined}
                  transition={{
                    duration: 0.24 * animationConfig.durationScale,
                    delay: canAnimate ? index * 0.02 : 0,
                    ease: 'easeOut',
                  }}
                >
                  <p className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-secondary)' }}>
                    {metric.label}
                  </p>
                  {metric.detail && (
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {metric.detail}
                    </p>
                  )}
                </motion.article>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            transition={{ duration: revealDuration }}
            className="order-1 lg:order-2"
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
              <motion.div
                className="relative overflow-hidden rounded-[2rem] border p-3"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 82%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 88%, transparent)',
                  boxShadow: '0 32px 56px -36px color-mix(in srgb, var(--color-accent-glow) 42%, transparent)',
                }}
                animate={canAnimate ? { y: [0, -8, 0], rotate: [0, 0.4, 0] } : undefined}
                transition={canAnimate ? loopingFloatTransition : undefined}
              >
                <div
                  className="absolute inset-x-0 top-0 h-32"
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, var(--color-accent-glow) 36%, transparent), transparent)',
                  }}
                />
                <motion.div
                  className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 72%, transparent)',
                    color: 'var(--color-text-primary)',
                  }}
                  whileHover={canAnimate ? { y: -2, scale: 1.02 } : undefined}
                  transition={{ duration: 0.22 * animationConfig.durationScale, ease: 'easeOut' }}
                >
                  <SparklesIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                  {photoStatus}
                </motion.div>

                <div
                  className="relative overflow-hidden rounded-[1.55rem] border"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)' }}
                >
                  {avatarUrl ? (
                    <motion.img
                      src={avatarUrl}
                      alt={photoAlt}
                      className="aspect-[4/5] w-full object-cover"
                      style={{ objectPosition: photoObjectPosition }}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      width="620"
                      height="760"
                      whileHover={canAnimate ? { scale: 1.03 } : undefined}
                      transition={{ duration: 0.38 * animationConfig.durationScale, ease: 'easeOut' }}
                    />
                  ) : (
                    <div
                      className="flex aspect-[4/5] w-full items-center justify-center text-8xl font-black select-none"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))',
                        color: '#ffffff',
                      }}
                      aria-label={`Avatar de ${heroNameRaw} avec initiales ${initials}`}
                    >
                      {initials}
                    </div>
                  )}
                </div>

                <motion.div
                  className="absolute bottom-4 left-4 right-4 rounded-[var(--ui-radius-xl)] border px-4 py-3"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 84%, transparent)',
                    backdropFilter: 'blur(var(--ui-surface-blur))',
                    WebkitBackdropFilter: 'blur(var(--ui-surface-blur))',
                  }}
                  whileHover={canAnimate ? { y: -3 } : undefined}
                  transition={{ duration: 0.22 * animationConfig.durationScale, ease: 'easeOut' }}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Stack de prédilection
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                    {photoStack}
                  </p>
                </motion.div>
              </motion.div>

              <div className="grid gap-4">
                {sideStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="rounded-[var(--ui-radius-2xl)] border px-4 py-4"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-border) 78%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 88%, transparent)',
                    }}
                    whileHover={canAnimate ? { y: -5, scale: 1.018 } : undefined}
                    animate={canAnimate ? { y: [0, index % 2 === 0 ? -4 : -2, 0] } : undefined}
                    transition={canAnimate
                      ? {
                          duration: (5.8 + index * 0.8) * animationConfig.durationScale,
                          ease: 'easeInOut',
                          repeat: Infinity,
                          repeatType: 'mirror',
                        }
                      : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className="text-[11px] uppercase tracking-[0.18em]"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Signal
                        </p>
                        <AnimatedCounter
                          value={stat.value}
                          enabled={animationConfig.statsCounterEnabled}
                          durationMs={animationConfig.statsCounterDurationMs}
                          className="mt-2 text-2xl font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        />
                      </div>
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--color-accent) 36%, var(--color-border))',
                          backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                        }}
                      >
                        <BoltIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
