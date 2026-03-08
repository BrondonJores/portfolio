/* Section Hero avec animations personnalisables */
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { ArrowDownIcon, BoltIcon, MapPinIcon } from '@heroicons/react/24/outline'
import Button from '../ui/Button.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

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

export default function Hero() {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'hero'),
    [settings, prefersReducedMotion]
  )

  const heroNameRaw = settings.hero_name || 'Brondon Jores'
  const nameParts = heroNameRaw.split(' ')
  const firstName = nameParts[0] || 'Brondon'
  const lastName = nameParts.slice(1).join(' ') || 'Jores'
  const initials = buildInitials(heroNameRaw)

  const heroTitleRaw = settings.hero_title || 'Developpeur\nFull Stack'
  const titleLines = heroTitleRaw.includes('\n')
    ? heroTitleRaw.split('\n').filter((line) => line.trim().length > 0)
    : [heroTitleRaw]

  const bio = settings.hero_bio || 'Je construis des applications web modernes, performantes et securisees.'
  const availability = settings.contact_availability || 'Disponible pour des projets'
  const location = settings.contact_location || 'Remote'
  const photoStatus = settings.hero_photo_status || 'Ouvert aux collaborations'
  const photoStack = settings.hero_photo_stack || 'React | Node.js | PostgreSQL'
  const photoAlt = settings.hero_photo_alt || `Portrait de ${heroNameRaw}`
  const photoObjectPosition = settings.hero_photo_object_position || '50% 30%'
  const avatarUrl = settings.avatar_url || ''
  const stats = [
    {
      value: settings.stat_1_value || '3+',
      label: settings.stat_1_label || "ans d'experience",
    },
    {
      value: settings.stat_2_value || '20+',
      label: settings.stat_2_label || 'projets livres',
    },
    {
      value: settings.stat_3_value || '10+',
      label: settings.stat_3_label || 'clients satisfaits',
    },
  ]
  const heroSpeedFactorRaw = Number(settings.ui_hero_speed_factor)
  const heroSpeedFactor = Number.isFinite(heroSpeedFactorRaw)
    ? Math.min(2, Math.max(0.5, heroSpeedFactorRaw))
    : 1
  const canAnimate = animationConfig.canAnimate
  const revealDuration = Math.max(0.2, 0.6 * animationConfig.durationScale)

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <AnimatedMascots scope="hero" sceneKey="hero" />

      <motion.div
        className="absolute inset-0 -z-10"
        animate={canAnimate ? {
          background: [
            'radial-gradient(ellipse at 20% 50%, var(--color-accent-glow) 0%, transparent 60%)',
            'radial-gradient(ellipse at 80% 50%, var(--color-accent-glow) 0%, transparent 60%)',
            'radial-gradient(ellipse at 50% 20%, var(--color-accent-glow) 0%, transparent 60%)',
            'radial-gradient(ellipse at 20% 50%, var(--color-accent-glow) 0%, transparent 60%)',
          ],
        } : undefined}
        transition={{
          duration: (12 / heroSpeedFactor) * animationConfig.durationScale,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      />

      <div
        className="absolute w-96 h-96 rounded-full -z-10 opacity-40 pointer-events-none"
        style={{
          top: '10%',
          left: '5%',
          background: 'var(--color-accent-glow)',
          filter: 'blur(var(--ui-hero-blur))',
          animation: canAnimate ? 'aurora-float calc(10s / var(--ui-hero-speed-factor)) ease-in-out infinite' : 'none',
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full -z-10 opacity-30 pointer-events-none"
        style={{
          top: '50%',
          right: '5%',
          background: 'var(--color-accent-glow)',
          filter: 'blur(calc(var(--ui-hero-blur) * 0.88))',
          animation: canAnimate ? 'aurora-float calc(14s / var(--ui-hero-speed-factor)) ease-in-out infinite reverse' : 'none',
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full -z-10 opacity-20 pointer-events-none"
        style={{
          bottom: '15%',
          left: '40%',
          background: 'var(--color-accent-glow)',
          filter: 'blur(calc(var(--ui-hero-blur) * 0.75))',
          animation: canAnimate ? 'aurora-float calc(18s / var(--ui-hero-speed-factor)) ease-in-out infinite' : 'none',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-20">
        <motion.div
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          animate={canAnimate ? 'visible' : false}
          className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] items-center gap-12 lg:gap-16"
        >
          <div className="text-center lg:text-left">
            <motion.div variants={itemVariants} transition={{ duration: revealDuration }} className="mb-6">
              <span
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full border"
                style={{
                  color: 'var(--color-accent-light)',
                  borderColor: 'var(--color-accent)',
                  backgroundColor: 'var(--color-accent-glow)',
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full ${canAnimate ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                {availability}
              </span>
            </motion.div>

            <motion.div variants={itemVariants} transition={{ duration: revealDuration }} className="mb-2">
              <span className="text-3xl sm:text-4xl font-bold gradient-text">
                {canAnimate ? (
                  <>
                    {Array.from(firstName).map((char, i) => (
                      <motion.span
                        key={`first-${i}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 + i * 0.04, duration: 0.45 * animationConfig.durationScale }}
                      >
                        {char}
                      </motion.span>
                    ))}
                    {' '}
                    {Array.from(lastName).map((char, i) => (
                      <motion.span
                        key={`last-${i}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 + (firstName.length + 1 + i) * 0.04, duration: 0.45 * animationConfig.durationScale }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </>
                ) : (
                  heroNameRaw
                )}
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="text-5xl sm:text-7xl font-black mb-6 leading-none tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {titleLines.map((line, index) => {
                const isLastLine = index === titleLines.length - 1 && titleLines.length > 1
                return (
                  <span key={`${line}-${index}`} className="block">
                    {isLastLine ? <span className="gradient-text">{line}</span> : line}
                  </span>
                )
              })}
            </motion.h1>

            <motion.p
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="text-lg sm:text-xl max-w-2xl lg:max-w-xl lg:mx-0 mx-auto mb-10 leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {bio}
            </motion.p>

            <motion.div
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4"
            >
              <Button variant="primary" href="projets">
                Voir mes projets
              </Button>
              <Button variant="secondary" href="contact">
                Me contacter
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              transition={{ duration: revealDuration }}
              className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto lg:mx-0"
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border px-4 py-3 text-left"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-card)',
                  }}
                >
                  <div className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {stat.value}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            transition={{ duration: revealDuration }}
            className="relative mx-auto w-full max-w-md"
          >
            <motion.div
              className="absolute -inset-8 rounded-[2.5rem] opacity-65 -z-10 pointer-events-none"
              animate={canAnimate ? { rotate: [0, 3, -3, 0], scale: [1, 1.03, 0.98, 1] } : undefined}
              transition={{
                duration: 10 * animationConfig.durationScale,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
              }}
              style={{
                background: 'radial-gradient(circle at 20% 20%, var(--color-accent-glow) 0%, transparent 65%)',
              }}
            />

            <div
              className="rounded-[2rem] border p-3 backdrop-blur-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <div
                className="relative overflow-hidden rounded-[1.6rem] border"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={photoAlt}
                    className="w-full aspect-[4/5] object-cover"
                    style={{ objectPosition: photoObjectPosition }}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    width="560"
                    height="700"
                  />
                ) : (
                  <div
                    className="w-full aspect-[4/5] flex items-center justify-center text-8xl font-black select-none"
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
            </div>

            <div
              className="absolute -top-4 -right-3 sm:right-0 rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg max-w-[190px]"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <BoltIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                <span>{photoStatus}</span>
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{photoStack}</div>
            </div>

            <div
              className="absolute -bottom-4 -left-3 sm:left-0 rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                <span>{location}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {canAnimate && (
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5 * animationConfig.durationScale, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDownIcon
            className="h-6 w-6"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-hidden="true"
          />
        </motion.div>
      )}
    </section>
  )
}
