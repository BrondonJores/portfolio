/* Barre de navigation superieure du tableau de bord */
import { Link, useLocation } from 'react-router-dom'
import {
  Bars3Icon,
  MoonIcon,
  PaintBrushIcon,
  Squares2X2Icon,
  SunIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import NotificationBell from './NotificationBell.jsx'

function resolveAdminLabel(pathname) {
  if (pathname === '/admin') return 'Tableau de bord'
  if (pathname.startsWith('/admin/projets')) return 'Projets'
  if (pathname.startsWith('/admin/articles')) return 'Articles'
  if (pathname.startsWith('/admin/competences')) return 'Competences'
  if (pathname.startsWith('/admin/certifications')) return 'Certifications'
  if (pathname.startsWith('/admin/messages')) return 'Messages'
  if (pathname.startsWith('/admin/commentaires')) return 'Commentaires'
  if (pathname.startsWith('/admin/temoignages')) return 'Temoignages'
  if (pathname.startsWith('/admin/newsletter')) return 'Newsletter'
  if (pathname.startsWith('/admin/pages')) return 'Pages CMS'
  if (pathname.startsWith('/admin/templates')) return 'Marketplace Templates'
  if (pathname.startsWith('/admin/themes')) return 'Marketplace Themes'
  if (pathname.startsWith('/admin/security')) return 'Securite'
  if (pathname.startsWith('/admin/subscribers')) return 'Abonnes'
  if (pathname.startsWith('/admin/parametres')) return 'Parametres'
  return 'Administration'
}

function getInitials(value) {
  return String(value || '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'A'
}

function resolveQuickLinkStyle(active) {
  return {
    borderColor: active
      ? 'color-mix(in srgb, var(--color-accent) 72%, var(--color-border))'
      : 'color-mix(in srgb, var(--color-border) 68%, transparent)',
    color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    backgroundColor: active
      ? 'color-mix(in srgb, var(--color-accent-glow) 18%, var(--color-bg-primary))'
      : 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
    boxShadow: active
      ? '0 18px 34px -28px color-mix(in srgb, var(--color-accent-glow) 42%, transparent)'
      : 'none',
  }
}

export default function AdminNavbar({ onToggleSidebar }) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const currentLabel = resolveAdminLabel(location.pathname)
  const displayName = user?.username || user?.email || 'Administrateur'
  const templatesActive = location.pathname.startsWith('/admin/templates')
  const themesActive = location.pathname.startsWith('/admin/themes')

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 84%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
      }}
    >
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
            }}
            onClick={onToggleSidebar}
            aria-label="Ouvrir le menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
              Admin studio
            </p>
            <p className="truncate text-sm font-semibold md:text-base" style={{ color: 'var(--color-text-primary)' }}>
              {currentLabel}
            </p>
          </div>

          <span
            className="hidden md:inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
            }}
          >
            Studio live
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-2">
            <Link
              to="/admin/templates"
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition duration-200 hover:-translate-y-0.5"
              style={resolveQuickLinkStyle(templatesActive)}
            >
              <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
              Templates
            </Link>
            <Link
              to="/admin/themes"
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition duration-200 hover:-translate-y-0.5"
              style={resolveQuickLinkStyle(themesActive)}
            >
              <PaintBrushIcon className="h-4 w-4" aria-hidden="true" />
              Themes
            </Link>
          </div>

          <NotificationBell />

          <button
            onClick={toggleTheme}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
            }}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>

          <div
            className="hidden sm:flex items-center gap-3 rounded-[var(--ui-radius-xl)] border px-3 py-2"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
              boxShadow: '0 20px 40px -32px color-mix(in srgb, var(--color-accent-glow) 34%, transparent)',
            }}
          >
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))' }}
            >
              {getInitials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {displayName}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Session admin active
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
