/* Barre de navigation superieure du tableau de bord */
import { Bars3Icon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import NotificationBell from './NotificationBell.jsx'

/**
 * Barre superieure affichant le nom de l'admin et les controles globaux.
 * Props : onToggleSidebar (pour le menu mobile).
 */
export default function AdminNavbar({ onToggleSidebar }) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header
      className="h-16 flex items-center justify-between px-4 sm:px-6 border-b"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Bouton hamburger pour mobile */}
      <button
        className="lg:hidden p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        style={{ color: 'var(--color-text-secondary)' }}
        onClick={onToggleSidebar}
        aria-label="Ouvrir le menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      <span
        className="hidden lg:block text-sm font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Espace Administrateur
      </span>

      {/* Informations de l'administrateur et toggle theme */}
      <div className="flex items-center gap-4">
        {/* Cloche de notification */}
        <NotificationBell />

        {/* Toggle theme clair/sombre */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark' ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </button>

        {/* Nom de l'administrateur connecte */}
        {user && (
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {user.username || user.email}
          </span>
        )}
      </div>
    </header>
  )
}
