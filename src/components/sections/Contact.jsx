/* Section Contact avec formulaire et informations */
import { EnvelopeIcon, MapPinIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Button from '../ui/Button.jsx'
import { useContactForm } from '../../hooks/useContactForm.jsx'

/* Liens sociaux */
const SOCIAL_LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/BrondonJores',
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/brondonjores',
  },
]

/* Style commun des inputs */
const inputStyle = {
  backgroundColor: 'var(--color-bg-card)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

export default function Contact() {
  const { fields, handleChange, handleSubmit, status } = useContactForm()

  return (
    <AnimatedSection
      id="contact"
      className="py-24 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        <SectionTitle
          title="Contact"
          subtitle="Discutons de votre prochain projet"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Colonne gauche : informations de contact */}
          <div>
            <p
              className="text-base leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Je suis disponible pour des missions freelance, des opportunites d&apos;emploi ou
              simplement pour discuter de vos projets. N&apos;hesitez pas a me contacter.
            </p>

            {/* Informations de contact */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <EnvelopeIcon
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  contact@brondonjores.dev
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPinIcon
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  France
                </span>
              </div>
            </div>

            {/* Liens sociaux */}
            <div className="flex gap-4">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-sm font-medium transition-colors duration-200 underline underline-offset-4"
                  style={{ color: 'var(--color-accent-light)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-accent-light)'
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Colonne droite : formulaire de contact */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {/* Champ nom */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={fields.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                  style={inputStyle}
                  placeholder="Votre nom"
                />
              </div>

              {/* Champ email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={fields.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                  style={inputStyle}
                  placeholder="votre@email.com"
                />
              </div>

              {/* Champ message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={fields.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-none"
                  style={inputStyle}
                  placeholder="Decrivez votre projet ou votre demande..."
                />
              </div>

              {/* Message de succes */}
              {status.success && (
                <p
                  className="text-sm font-medium py-2 px-3 rounded-lg"
                  style={{
                    color: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                  }}
                  role="status"
                >
                  Votre message a ete envoye avec succes.
                </p>
              )}

              {/* Message d'erreur */}
              {status.error && (
                <p
                  className="text-sm font-medium py-2 px-3 rounded-lg"
                  style={{
                    color: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  }}
                  role="alert"
                >
                  {status.error}
                </p>
              )}

              {/* Bouton de soumission */}
              <Button
                type="submit"
                variant="primary"
                disabled={status.loading}
                className="w-full justify-center"
                aria-label="Envoyer le message de contact"
              >
                <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                {status.loading ? 'Envoi en cours...' : 'Envoyer le message'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AnimatedSection>
  )
}
