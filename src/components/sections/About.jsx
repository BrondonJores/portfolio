/* Section A propos avec mise en page deux colonnes */
import { UserIcon, BriefcaseIcon, CodeBracketIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import Card from '../ui/Card.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'

export default function About() {
  const { settings } = useSettings()

  const stats = [
    { icon: BriefcaseIcon, value: settings.stat_1_value || '3+', label: settings.stat_1_label || "ans d'experience" },
    { icon: CodeBracketIcon, value: settings.stat_2_value || '20+', label: settings.stat_2_label || 'projets realises' },
    { icon: UserIcon, value: settings.stat_3_value || '10+', label: settings.stat_3_label || 'clients satisfaits' },
  ]

  const bio = settings.bio || "Developpeur Full Stack passionne par la creation d'applications web modernes et performantes. Je me specialise dans l'ecosysteme JavaScript avec React pour le frontend et Node.js pour le backend."

  const heroName = settings.hero_name || 'BJ'
  const initials = heroName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <AnimatedSection
      id="about"
      className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Colonne gauche : avatar placeholder */}
          <div className="flex justify-center lg:justify-start">
            {settings.avatar_url ? (
              <img
                src={settings.avatar_url}
                alt={`Avatar de ${heroName}`}
                className="w-64 h-64 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="w-64 h-64 rounded-2xl flex items-center justify-center text-6xl font-black select-none"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))',
                  color: '#fff',
                }}
                aria-label={`Avatar de ${heroName} avec initiales ${initials}`}
              >
                {initials}
              </div>
            )}
          </div>

          {/* Colonne droite : bio et statistiques */}
          <div>
            <h2
              className="text-4xl font-bold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              A propos de moi
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
                  <Card key={stat.label} className="text-center py-4">
                    <Icon
                      className="h-6 w-6 mx-auto mb-2"
                      style={{ color: 'var(--color-accent)' }}
                      aria-hidden="true"
                    />
                    <div
                      className="text-2xl font-bold mb-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {stat.value}
                    </div>
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
