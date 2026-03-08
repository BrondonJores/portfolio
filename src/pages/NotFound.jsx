/* Page 404 - Page introuvable */
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'

export default function NotFound() {
  const { settings } = useSettings()
  const notFoundTitle = settings.ui_notfound_title || 'Page introuvable'
  const notFoundMessage =
    settings.ui_notfound_message || "La page que vous recherchez n'existe pas ou a ete deplacee."
  const notFoundCta = settings.ui_notfound_cta || "Retourner a l'accueil"

  return (
    <>
      <Helmet>
        <title>{buildPageTitle(settings, notFoundTitle)}</title>
      </Helmet>
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <ExclamationTriangleIcon
          className="h-16 w-16 mb-6"
          style={{ color: 'var(--color-accent)' }}
          aria-hidden="true"
        />
        <h1
          className="text-8xl font-black mb-4"
          style={{ color: 'var(--color-accent)' }}
        >
          404
        </h1>
        <p
          className="text-2xl font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {notFoundTitle}
        </p>
        <p
          className="text-base mb-8 max-w-md"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {notFoundMessage}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
          }}
        >
          {notFoundCta}
        </Link>
      </div>
    </>
  )
}
