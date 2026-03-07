/* Section Hero avec animations personnalisables */
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { ArrowDownIcon } from '@heroicons/react/24/outline'
import Button from '../ui/Button.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

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

export default function Hero() {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )

  const heroNameRaw = settings.hero_name || 'Brondon Jores'
  const nameParts = heroNameRaw.split(' ')
  const firstName = nameParts[0] || 'Brondon'
  const lastName = nameParts.slice(1).join(' ') || 'Jores'

  const heroTitleRaw = settings.hero_title || 'Developpeur\nFull Stack'
  const titleLines = heroTitleRaw.includes('\n') ? heroTitleRaw.split('\n') : [heroTitleRaw]

  const bio = settings.hero_bio || 'Je construis des applications web modernes, performantes et securisees.'
  const availability = settings.contact_availability || 'Disponible pour des projets'
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
      <AnimatedMascots scope="hero" />

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
        className="absolute w-96 h-96 rounded-full -z-10 opacity-40"
        style={{
          top: '10%',
          left: '5%',
          background: 'var(--color-accent-glow)',
          filter: 'blur(var(--ui-hero-blur))',
          animation: canAnimate ? 'aurora-float calc(10s / var(--ui-hero-speed-factor)) ease-in-out infinite' : 'none',
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full -z-10 opacity-30"
        style={{
          top: '50%',
          right: '5%',
          background: 'var(--color-accent-glow)',
          filter: 'blur(calc(var(--ui-hero-blur) * 0.88))',
          animation: canAnimate ? 'aurora-float calc(14s / var(--ui-hero-speed-factor)) ease-in-out infinite reverse' : 'none',
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full -z-10 opacity-20"
        style={{
          bottom: '15%',
          left: '40%',
          background: 'var(--color-accent-glow)',
          filter: 'blur(calc(var(--ui-hero-blur) * 0.75))',
          animation: canAnimate ? 'aurora-float calc(18s / var(--ui-hero-speed-factor)) ease-in-out infinite' : 'none',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24 relative z-20">
        <motion.div
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          animate={canAnimate ? 'visible' : false}
        >
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
            {titleLines.length > 1 ? (
              <>
                {titleLines[0]}
                <br />
                <span className="gradient-text">{titleLines[1]}</span>
              </>
            ) : (
              titleLines[0]
            )}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            transition={{ duration: revealDuration }}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {bio}
          </motion.p>

          <motion.div
            variants={itemVariants}
            transition={{ duration: revealDuration }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="primary" href="projects">
              Voir mes projets
            </Button>
            <Button variant="secondary" href="contact">
              Me contacter
            </Button>
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
