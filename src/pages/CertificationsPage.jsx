/* Page liste de toutes les certifications publiques. */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import SectionTitle from '../components/ui/SectionTitle.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { getCertifications } from '../services/certificationService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'

/**
 * Normalise une liste de badges texte.
 * @param {unknown} value Valeur brute.
 * @returns {string[]} Liste nettoyee.
 */
function normalizeBadges(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 24)
}

/**
 * Formate une date ISO en texte local.
 * @param {string | null | undefined} value Date brute.
 * @returns {string} Date lisible.
 */
function formatDate(value) {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { settings } = useSettings()

  const pageTitle = buildPageTitle(settings, 'Certifications')
  const heading = settings.ui_certifications_page_title || 'Toutes mes certifications'
  const subtitle =
    settings.ui_certifications_page_subtitle ||
    'Retrouve l ensemble de mes certifications, badges et preuves officielles.'
  const emptyLabel = settings.ui_certifications_page_empty || 'Aucune certification disponible pour le moment.'
  const viewCredentialLabel = settings.ui_certification_view_credential || 'Verifier'
  const viewPdfLabel = settings.ui_certification_view_pdf || 'Voir PDF'

  useEffect(() => {
    getCertifications()
      .then((response) => {
        const list = Array.isArray(response?.data) ? response.data : []
        setCertifications(
          list.map((item) => ({
            ...item,
            badges: normalizeBadges(item.badges),
          }))
        )
      })
      .catch(() => setCertifications([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle title={heading} subtitle={subtitle} />

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : certifications.length === 0 ? (
            <p className="text-center py-20" style={{ color: 'var(--color-text-secondary)' }}>
              {emptyLabel}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {certifications.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
                >
                  <Card className="h-full flex flex-col !p-0 overflow-hidden">
                    <div className="relative h-44 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={`Certification ${item.title}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            background:
                              'radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--color-accent) 35%, transparent), transparent 60%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--color-accent-light) 24%, transparent), transparent 55%), var(--color-bg-secondary)',
                          }}
                        >
                          <AcademicCapIcon className="h-14 w-14" style={{ color: 'var(--color-accent)' }} />
                        </div>
                      )}

                      <div className="absolute top-3 right-3">
                        {item.badge_image_url ? (
                          <img
                            src={item.badge_image_url}
                            alt={`Badge ${item.title}`}
                            className="w-14 h-14 object-cover rounded-xl border"
                            style={{
                              borderColor: 'color-mix(in srgb, var(--color-accent) 45%, var(--color-border))',
                              backgroundColor: 'rgba(8, 15, 30, 0.35)',
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border"
                            style={{
                              borderColor: 'color-mix(in srgb, var(--color-accent) 45%, var(--color-border))',
                              backgroundColor: 'rgba(8, 15, 30, 0.35)',
                            }}
                          >
                            <CheckBadgeIcon className="h-6 w-6" style={{ color: 'var(--color-accent-light)' }} />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                          {item.title}
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.issuer}
                        </p>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        {item.issued_at && (
                          <p className="inline-flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <CalendarDaysIcon className="h-4 w-4" />
                            Obtenue le {formatDate(item.issued_at)}
                          </p>
                        )}
                        {item.expires_at && (
                          <p className="inline-flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <CalendarDaysIcon className="h-4 w-4" />
                            Expire le {formatDate(item.expires_at)}
                          </p>
                        )}
                        {item.credential_id && (
                          <p style={{ color: 'var(--color-text-secondary)' }}>
                            ID: {item.credential_id}
                          </p>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.description}
                        </p>
                      )}

                      {item.badges.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.badges.map((badge) => (
                            <Badge key={`${item.id}-${badge}`}>{badge}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center gap-2 pt-2">
                        {item.credential_url && (
                          <Button variant="secondary" href={item.credential_url}>
                            <LinkIcon className="h-4 w-4" aria-hidden="true" />
                            {viewCredentialLabel}
                          </Button>
                        )}
                        {item.pdf_url && (
                          <Button variant="ghost" href={item.pdf_url}>
                            <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
                            {viewPdfLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
