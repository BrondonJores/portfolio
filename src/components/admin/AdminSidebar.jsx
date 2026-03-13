/* Barre laterale de navigation du tableau de bord */
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  AcademicCapIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FolderOpenIcon,
  HomeIcon,
  NewspaperIcon,
  PaintBrushIcon,
  RectangleStackIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth.jsx'

const NAV_SECTIONS = [
  {
    title: 'Pilotage',
    items: [
      { to: '/admin', label: 'Tableau de bord', icon: HomeIcon, end: true },
      { to: '/admin/projets', label: 'Projets', icon: FolderOpenIcon },
      { to: '/admin/articles', label: 'Articles', icon: DocumentTextIcon },
      { to: '/admin/competences', label: 'Competences', icon: WrenchScrewdriverIcon },
      { to: '/admin/certifications', label: 'Certifications', icon: AcademicCapIcon },
      { to: '/admin/pages', label: 'Pages CMS', icon: RectangleStackIcon },
    ],
  },
  {
    title: 'Inbox',
    items: [
      { to: '/admin/messages', label: 'Messages', icon: EnvelopeIcon },
      { to: '/admin/commentaires', label: 'Commentaires', icon: ChatBubbleLeftIcon },
      { to: '/admin/temoignages', label: 'Temoignages', icon: ChatBubbleLeftRightIcon },
      { to: '/admin/newsletter', label: 'Newsletter', icon: NewspaperIcon },
      { to: '/admin/subscribers', label: 'Abonnes', icon: UserGroupIcon },
    ],
  },
  {
    title: 'Studio',
    items: [
      { to: '/admin/templates', label: 'Marketplace Templates', icon: Squares2X2Icon },
      { to: '/admin/themes', label: 'Marketplace Themes', icon: PaintBrushIcon },
      { to: '/admin/security', label: 'Securite', icon: ShieldExclamationIcon },
      { to: '/admin/parametres', label: 'Parametres', icon: Cog6ToothIcon },
    ],
  },
]

function getInitials(value) {
  return String(value || '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'A'
}

export default function AdminSidebar({ onClose }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  const getLinkClass = ({ isActive }) => {
    const base =
      'group flex items-center gap-3 rounded-[var(--ui-radius-xl)] border px-3.5 py-3 text-sm font-medium transition-all duration-150'
    return isActive ? `${base}` : `${base}`
  }

  const getLinkStyle = ({ isActive }) => ({
    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    borderColor: isActive
      ? 'color-mix(in srgb, var(--color-accent) 42%, var(--color-border))'
      : 'transparent',
    backgroundColor: isActive
      ? 'color-mix(in srgb, var(--color-accent-glow) 18%, transparent)'
      : 'transparent',
  })

  const displayName = user?.username || user?.email || 'Administrateur'
  const initials = getInitials(displayName)

  return (
    <aside
      className="flex h-full w-[18rem] flex-col overflow-hidden rounded-[calc(var(--ui-radius-2xl)+4px)] border"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-bg-secondary) 96%, transparent), color-mix(in srgb, var(--color-bg-card) 92%, transparent))',
        boxShadow: '0 28px 72px -46px color-mix(in srgb, var(--color-accent-glow) 26%, transparent)',
      }}
    >
      <div className="border-b p-5" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
              Admin studio
            </p>
            <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              BJ Admin
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border focus:outline-none"
              style={{
                color: 'var(--color-text-secondary)',
                borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
              }}
              aria-label="Fermer le menu"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          className="mt-5 rounded-[var(--ui-radius-xl)] border p-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))' }}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {displayName}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Poste de pilotage actif
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4" aria-label="Navigation admin">
        <div className="space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                {section.title}
              </p>
              <div className="mt-2 space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={getLinkClass}
                      style={getLinkStyle}
                      onClick={onClose}
                    >
                      <span
                        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--color-border) 62%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 50%, transparent)',
                        }}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 truncate">{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t p-4 space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center justify-between rounded-[var(--ui-radius-xl)] border px-4 py-3 text-sm font-medium"
          style={{
            color: 'var(--color-text-primary)',
            borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
          }}
        >
          <span className="inline-flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            Voir le site
          </span>
          <ArrowTopRightOnSquareIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
        </Link>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-[var(--ui-radius-xl)] border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={{
            color: 'var(--color-text-secondary)',
            borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
          }}
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
          Deconnexion
        </button>
      </div>
    </aside>
  )
}
