/* Barre de navigation fixe avec menu hamburger mobile et toggle theme */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useScrollPosition } from '../../hooks/useScrollPosition.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

/* Liens de navigation avec ancres */
const NAV_LINKS = [
  { href: '#hero', label: 'Accueil' },
  { href: '#about', label: 'A propos' },
  { href: '#skills', label: 'Competences' },
  { href: '#projects', label: 'Projets' },
  { href: '#blog', label: 'Blog' },
  { href: '#contact', label: 'Contact' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollY = useScrollPosition()
  const { theme, toggleTheme } = useTheme()

  /* Opacite augmentee apres defilement */
  const isScrolled = scrollY > 20

  const toggleMenu = () => setMenuOpen((prev) => !prev)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md"
      style={{
        backgroundColor: isScrolled
          ? 'rgba(10, 10, 15, 0.95)'
          : 'rgba(10, 10, 15, 0.7)',
        borderBottom: `1px solid var(--color-border)`,
      }}
    >
      <nav
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
        aria-label="Navigation principale"
      >
        {/* Logo monogramme */}
        <a
          href="#hero"
          className="text-xl font-bold"
          style={{ color: 'var(--color-accent)' }}
          aria-label="BrondonJores - Accueil"
        >
          BJ
        </a>

        {/* Liens desktop */}
        <ul className="hidden md:flex items-center gap-8 list-none">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions : toggle theme + hamburger mobile */}
        <div className="flex items-center gap-2">
          {/* Bouton toggle theme */}
          <motion.button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={{ color: 'var(--color-text-secondary)' }}
            whileTap={{ scale: 0.9 }}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </motion.button>

          {/* Bouton hamburger mobile */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={toggleMenu}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
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
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block text-sm font-medium py-1 transition-colors duration-200"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onClick={closeMenu}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-secondary)'
                  }}
                >
                  {link.label}
                </a>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-border)'
              }}
            >
              Administration
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
