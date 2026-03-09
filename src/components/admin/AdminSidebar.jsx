/* Barre laterale de navigation du tableau de bord */
import { NavLink, useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftIcon,
  Cog6ToothIcon,
  UsersIcon,
  NewspaperIcon,
  Squares2X2Icon,
  PaintBrushIcon,
  ShieldExclamationIcon,
  RectangleStackIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth.jsx'

/* Liens de navigation admin */
const NAV_ITEMS = [
  { to: '/admin', label: 'Tableau de bord', icon: HomeIcon, end: true },
  { to: '/admin/projets', label: 'Projets', icon: FolderOpenIcon },
  { to: '/admin/articles', label: 'Articles', icon: DocumentTextIcon },
  { to: '/admin/competences', label: 'Competences', icon: WrenchScrewdriverIcon },
  { to: '/admin/certifications', label: 'Certifications', icon: AcademicCapIcon },
  { to: '/admin/messages', label: 'Messages', icon: EnvelopeIcon },
  { to: '/admin/temoignages', label: 'Temoignages', icon: ChatBubbleLeftRightIcon },
  { to: '/admin/commentaires', label: 'Commentaires', icon: ChatBubbleLeftIcon },
  { to: '/admin/newsletter', label: 'Newsletter', icon: NewspaperIcon },
  { to: '/admin/pages', label: 'Pages CMS', icon: RectangleStackIcon },
  { to: '/admin/templates', label: 'Marketplace Templates', icon: Squares2X2Icon },
  { to: '/admin/themes', label: 'Marketplace Themes', icon: PaintBrushIcon },
  { to: '/admin/security', label: 'Securite', icon: ShieldExclamationIcon },
  { to: '/admin/subscribers', label: 'Abonnes', icon: UsersIcon },
  { to: '/admin/parametres', label: 'Parametres', icon: Cog6ToothIcon },
]

/**
 * Sidebar de navigation avec liens actifs et bouton de deconnexion.
 * Props : onClose (pour fermer en mobile).
 */
export default function AdminSidebar({ onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  /* Styles du lien actif */
  const getLinkClass = ({ isActive }) => {
    const base =
      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150'
    return isActive
      ? `${base} text-white`
      : `${base}`
  }

  const getLinkStyle = ({ isActive }) => {
    if (isActive) {
      return { backgroundColor: 'var(--color-accent)', color: '#fff' }
    }
    return { color: 'var(--color-text-secondary)' }
  }

  return (
    <aside
      className="flex flex-col h-full w-64"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center px-6 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-xl font-bold"
          style={{ color: 'var(--color-accent)' }}
        >
          BJ Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Navigation admin">
        {NAV_ITEMS.map((item) => {
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
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Bouton deconnexion */}
      <div
        className="p-4 border-t flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
          Deconnexion
        </button>
      </div>
    </aside>
  )
}
