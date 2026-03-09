/* Section A propos avec mise en page deux colonnes */
import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import { UserIcon, BriefcaseIcon, CodeBracketIcon, MapPinIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import AnimatedSceneAsset from '../ui/AnimatedSceneAsset.jsx'
import Card from '../ui/Card.jsx'
import AnimatedCounter from '../ui/AnimatedCounter.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

export default function About() {
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'about'),
    [settings, prefersReducedMotion]
  )

  const stats = [
    { icon: BriefcaseIcon, value: settings.stat_1_value || '3+', label: settings.stat_1_label || "ans d'experience" },
    { icon: CodeBracketIcon, value: settings.stat_2_value || '20+', label: settings.stat_2_label || 'projets realises' },
    { icon: UserIcon, value: settings.stat_3_value || '10+', label: settings.stat_3_label || 'clients satisfaits' },
  ]

  const bio = settings.bio || "Developpeur Full Stack passionne par la creation d'applications web modernes et performantes. Je me specialise dans l'ecosysteme JavaScript avec React pour le frontend et Node.js pour le backend."

  const heroName = settings.hero_name || 'BJ'
  const avatarUrl = settings.avatar_url || ''
  const avatarAlt = settings.hero_photo_alt || `Portrait de ${heroName}`
  const photoObjectPosition = settings.hero_photo_object_position || '50% 30%'
  const location = settings.contact_location || 'Remote'
  const aboutPhotoBadge = settings.about_photo_badge || 'Disponible pour missions freelance'
  const aboutPhotoCaption = settings.about_photo_caption || 'De la conception au deploiement, je prends en charge le cycle complet.'
  const aboutTitle = settings.ui_about_title || 'A propos de moi'
  const initials = heroName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <AnimatedSection
      id="about"
      sectionKey="about"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <AnimatedMascots scope="about" sceneKey="about" />
      <AnimatedSceneAsset scope="about" sceneKey="about" />

      <div className="max-w-6xl mx-auto relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Colonne gauche : photo hero retravaillee */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative w-fit">
              <div
                className="absolute -inset-5 rounded-[2.4rem] opacity-65 -z-10 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 20% 20%, var(--color-accent-glow) 0%, transparent 70%)',
                  filter: 'blur(18px)',
                }}
              />

              <div
                className="rounded-[2.1rem] border p-3"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-card)',
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={avatarAlt}
                    className="w-72 h-[22rem] sm:w-80 sm:h-96 rounded-[1.7rem] object-cover"
                    style={{ objectPosition: photoObjectPosition }}
                    loading="lazy"
                    decoding="async"
                    width="420"
                    height="520"
                  />
                ) : (
                  <div
                    className="w-72 h-[22rem] sm:w-80 sm:h-96 rounded-[1.7rem] flex items-center justify-center text-7xl font-black select-none"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))',
                      color: '#ffffff',
                    }}
                    aria-label={`Avatar de ${heroName} avec initiales ${initials}`}
                  >
                    {initials}
                  </div>
                )}
              </div>

              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-xl border px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {aboutPhotoBadge}
              </div>
            </div>

            <p className="mt-8 text-sm max-w-sm text-center lg:text-left" style={{ color: 'var(--color-text-secondary)' }}>
              {aboutPhotoCaption}
            </p>

            <div
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <MapPinIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
              <span>{location}</span>
            </div>
          </div>

          {/* Colonne droite : bio et statistiques */}
          <div>
            <h2
              className="text-4xl font-bold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {aboutTitle}
            </h2>
            <div
              className="h-1 w-16 rounded mb-6"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <p
              className="text-base leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {bio}
            </p>

            {/* Statistiques */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.label} className="text-center py-4 transition-transform duration-300 hover:-translate-y-1">
                    <Icon
                      className="h-6 w-6 mx-auto mb-2"
                      style={{ color: 'var(--color-accent)' }}
                      aria-hidden="true"
                    />
                    <AnimatedCounter
                      value={stat.value}
                      enabled={animationConfig.statsCounterEnabled}
                      durationMs={animationConfig.statsCounterDurationMs}
                      className="text-2xl font-bold mb-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    />
                    <div
                      className="text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {stat.label}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}
