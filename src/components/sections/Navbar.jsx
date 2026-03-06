/* Barre de navigation fixe avec menu hamburger mobile et toggle theme */
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useScrollPosition } from '../../hooks/useScrollPosition.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'

/* Definition des liens avec ancre (accueil) et route (pages separees) */
const NAV_LINKS = [
  { anchor: '#hero',     to: '/',            label: 'Accueil' },
  { anchor: '#about',    to: '/#about',      label: 'A propos' },
  { anchor: '#skills',   to: '/competences', label: 'Competences' },
  { anchor: '#projects', to: '/projets',     label: 'Projets' },
  { anchor: '#blog',     to: '/blog',        label: 'Blog' },
  { anchor: '#contact',  to: '/contact',     label: 'Contact' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollY = useScrollPosition()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useSettings()
  const location = useLocation()

  const heroName = settings.hero_name || ''
  const logoInitials = heroName
    ? heroName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'BJ'

  /* Sur la page d'accueil, on utilise les ancres pour le scroll fluide */
  const isHome = location.pathname === '/'
  const isScrolled = scrollY > 20
  const toggleMenu = () => setMenuOpen((prev) => !prev)
  const closeMenu = () => setMenuOpen(false)

  /* Style commun des liens */
  const linkClass = 'text-sm font-medium transition-colors duration-200'
  const linkStyle = { color: 'var(--color-text-secondary)' }
  const activeLinkStyle = { color: 'var(--color-text-primary)' }

  /* Rendu d'un lien selon le contexte (accueil ou autre page) */
  function NavItem({ link, mobile }) {
    const baseClass = mobile
      ? 'block text-sm font-medium py-1 transition-colors duration-200'
      : linkClass

    if (isHome) {
      return (
        <a
          href={link.anchor}
          className={baseClass}
          style={linkStyle}
          onClick={mobile ? closeMenu : undefined}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          {link.label}
        </a>
      )
    }

    return (
      <NavLink
        to={link.to}
        className={baseClass}
        style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}
        onClick={mobile ? closeMenu : undefined}
      >
        {link.label}
      </NavLink>
    )
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: isScrolled ? 'var(--ui-navbar-bg-scrolled)' : 'var(--ui-navbar-bg)',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(var(--ui-navbar-blur))',
        WebkitBackdropFilter: 'blur(var(--ui-navbar-blur))',
      }}
    >
      <nav
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
        aria-label="Navigation principale"
      >
        {/* Logo - Link vers accueil */}
        <Link
          to="/"
          className="text-xl font-bold"
          style={{ color: 'var(--color-accent)' }}
          aria-label="BrondonJores - Accueil"
        >
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-8 w-auto" />
          ) : (
            logoInitials
          )}
        </Link>

        {/* Liens desktop */}
        <ul className="hidden md:flex items-center gap-8 list-none">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavItem link={link} mobile={false} />
            </li>
          ))}
        </ul>

        {/* Actions : toggle theme + hamburger mobile */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={{ color: 'var(--color-text-secondary)' }}
            whileTap={{ scale: 0.9 }}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </motion.button>

          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={toggleMenu}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Menu mobile deroulant */}
      {menuOpen && (
        <div
          className="md:hidden px-4 pb-4 pt-2 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <ul className="flex flex-col gap-4 list-none">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavItem link={link} mobile={true} />
              </li>
            ))}
          </ul>
          {/* Lien discret vers l'espace admin */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link
              to="/admin/login"
              className="text-xs transition-colors duration-200"
              style={{ color: 'var(--color-border)' }}
              onClick={closeMenu}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-border)' }}
            >
              Administration
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
