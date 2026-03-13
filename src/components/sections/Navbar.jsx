import { useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useScrollPosition } from '../../hooks/useScrollPosition.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getUiThemePrimitives } from '../../utils/themeSettings.js'

function buildShellStyle(navMode, isScrolled) {
  const baseBackground = isScrolled ? 'var(--ui-navbar-bg-scrolled)' : 'var(--ui-navbar-bg)'

  if (navMode === 'line') {
    return {
      backgroundColor: baseBackground,
      borderColor: 'color-mix(in srgb, var(--color-border) 84%, transparent)',
      backdropFilter: 'blur(var(--ui-navbar-blur))',
      WebkitBackdropFilter: 'blur(var(--ui-navbar-blur))',
    }
  }

  return {
    backgroundColor: baseBackground,
    borderColor: navMode === 'panel'
      ? 'color-mix(in srgb, var(--color-border) 88%, transparent)'
      : 'color-mix(in srgb, var(--color-border) 72%, transparent)',
    boxShadow: navMode === 'panel'
      ? '0 28px 48px -34px color-mix(in srgb, var(--color-border) 28%, transparent)'
      : '0 24px 44px -34px color-mix(in srgb, var(--color-accent-glow) 36%, transparent)',
    backdropFilter: 'blur(var(--ui-navbar-blur))',
    WebkitBackdropFilter: 'blur(var(--ui-navbar-blur))',
  }
}

function buildBrandStyle(navMode) {
  if (navMode === 'line') {
    return {
      color: 'var(--color-accent)',
    }
  }

  return {
    color: 'var(--color-text-primary)',
    backgroundColor: navMode === 'panel'
      ? 'color-mix(in srgb, var(--color-bg-primary) 80%, transparent)'
      : 'color-mix(in srgb, var(--color-bg-card) 72%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
  }
}

function buildLinkStyle(navMode, isActive) {
  if (navMode === 'line') {
    return {
      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    }
  }

  if (navMode === 'panel') {
    return {
      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
      backgroundColor: isActive
        ? 'color-mix(in srgb, var(--color-bg-primary) 84%, transparent)'
        : 'transparent',
      borderColor: isActive
        ? 'color-mix(in srgb, var(--color-accent) 36%, var(--color-border))'
        : 'transparent',
    }
  }

  return {
    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    backgroundColor: isActive
      ? 'color-mix(in srgb, var(--color-accent-glow) 22%, transparent)'
      : 'transparent',
    borderColor: isActive
      ? 'color-mix(in srgb, var(--color-border) 72%, transparent)'
      : 'transparent',
  }
}

function buildActionChrome(navMode) {
  if (navMode === 'line') {
    return {}
  }

  return {
    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 74%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
  }
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollY = useScrollPosition()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useSettings()
  const uiPrimitives = useMemo(() => getUiThemePrimitives(settings), [settings])
  const location = useLocation()

  const siteName = settings.site_name || settings.hero_name || 'Portfolio'
  const logoInitials = siteName
    .split(' ')
    .map((token) => token[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const isHome = location.pathname === '/'
  const isScrolled = scrollY > 20
  const navMode = uiPrimitives.navMode
  const toggleMenu = () => setMenuOpen((prev) => !prev)
  const closeMenu = () => setMenuOpen(false)
  const navLinks = [
    { id: 'home', anchor: '#hero', to: '/', label: settings.ui_nav_label_home || 'Accueil' },
    { id: 'about', anchor: '#about', to: '/#about', label: settings.ui_nav_label_about || 'A propos' },
    { id: 'skills', anchor: '#skills', to: '/competences', label: settings.ui_nav_label_skills || 'Competences' },
    { id: 'certifications', anchor: '#certifications', to: '/certifications', label: settings.ui_nav_label_certifications || 'Certifications' },
    { id: 'projects', anchor: '#projects', to: '/projets', label: settings.ui_nav_label_projects || 'Projets' },
    { id: 'blog', anchor: '#blog', to: '/blog', label: settings.ui_nav_label_blog || 'Blog' },
    { id: 'contact', anchor: '#contact', to: '/contact', label: settings.ui_nav_label_contact || 'Contact' },
  ]
  const navAriaMain = settings.ui_nav_aria_main || 'Navigation principale'
  const navHomeLabel = settings.ui_nav_aria_home || 'Accueil'
  const navToggleLight = settings.ui_nav_toggle_to_light || 'Passer en mode clair'
  const navToggleDark = settings.ui_nav_toggle_to_dark || 'Passer en mode sombre'
  const navOpenMenu = settings.ui_nav_open_menu || 'Ouvrir le menu'
  const navCloseMenu = settings.ui_nav_close_menu || 'Fermer le menu'
  const navAdminLabel = settings.ui_nav_label_admin || 'Administration'
  const shellStyle = buildShellStyle(navMode, isScrolled)
  const brandStyle = buildBrandStyle(navMode)
  const actionStyle = buildActionChrome(navMode)

  function NavItem({ link, mobile = false }) {
    const baseClass = mobile
      ? 'flex min-h-11 items-center rounded-[var(--ui-radius-lg)] border px-3 py-2 text-sm font-medium transition-colors duration-200'
      : navMode === 'line'
        ? 'text-sm font-medium transition-colors duration-200'
        : navMode === 'panel'
          ? 'inline-flex items-center rounded-[var(--ui-radius-lg)] border px-3 py-2 text-sm font-medium transition-colors duration-200'
          : 'inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition-colors duration-200'

    if (isHome) {
      return (
        <a
          href={link.anchor}
          className={baseClass}
          style={buildLinkStyle(navMode, false)}
          onClick={mobile ? closeMenu : undefined}
          onMouseEnter={(event) => {
            if (navMode === 'line') {
              event.currentTarget.style.color = 'var(--color-text-primary)'
            }
          }}
          onMouseLeave={(event) => {
            if (navMode === 'line') {
              event.currentTarget.style.color = 'var(--color-text-secondary)'
            }
          }}
        >
          {link.label}
        </a>
      )
    }

    return (
      <NavLink
        to={link.to}
        className={baseClass}
        style={({ isActive }) => buildLinkStyle(navMode, isActive)}
        onClick={mobile ? closeMenu : undefined}
      >
        {link.label}
      </NavLink>
    )
  }

  return (
    <header
      className={`fixed left-0 right-0 z-50 ${navMode === 'line' ? 'top-0' : 'top-4 px-4 sm:px-6 lg:px-8'}`}
      style={navMode === 'line'
        ? {
            ...shellStyle,
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
          }
        : undefined}
    >
      <nav
        className={navMode === 'line'
          ? 'mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'
          : 'mx-auto flex max-w-6xl items-center justify-between gap-4 border px-4 sm:px-6'}
        style={{
          ...(navMode === 'line' ? {} : shellStyle),
          minHeight: 'var(--ui-nav-height)',
          borderRadius: navMode === 'panel' ? 'calc(var(--ui-radius-2xl) + 2px)' : '999px',
        }}
        aria-label={navAriaMain}
      >
        <Link
          to="/"
          className={navMode === 'line'
            ? 'text-xl font-semibold tracking-[0.12em]'
            : 'inline-flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-semibold tracking-[0.14em] uppercase'
          }
          style={brandStyle}
          aria-label={`${siteName} - ${navHomeLabel}`}
        >
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={`Logo de ${siteName}`} className="h-8 w-auto" />
          ) : (
            <>
              <span>{logoInitials}</span>
              {navMode !== 'line' && (
                <span className="hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>
                  {siteName}
                </span>
              )}
            </>
          )}
        </Link>

        <ul
          className={navMode === 'panel'
            ? 'hidden md:flex items-center gap-2 rounded-[var(--ui-radius-xl)] border px-2 py-2'
            : 'hidden md:flex items-center gap-2 list-none'}
          style={navMode === 'panel'
            ? {
                backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 70%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
              }
            : undefined}
        >
          {navLinks.map((link) => (
            <li key={link.id}>
              <NavItem link={link} mobile={false} />
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={toggleTheme}
            className={navMode === 'line'
              ? 'p-2 rounded-[var(--ui-radius-lg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'
              : 'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'
            }
            style={navMode === 'line'
              ? { color: 'var(--color-text-secondary)' }
              : { ...actionStyle, color: 'var(--color-text-secondary)' }}
            whileTap={{ scale: 0.92 }}
            aria-label={theme === 'dark' ? navToggleLight : navToggleDark}
          >
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </motion.button>

          <button
            className={navMode === 'line'
              ? 'md:hidden p-2 rounded-[var(--ui-radius-lg)] transition-colors'
              : 'md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors'
            }
            style={navMode === 'line'
              ? { color: 'var(--color-text-secondary)' }
              : { ...actionStyle, color: 'var(--color-text-secondary)' }}
            onClick={toggleMenu}
            aria-label={menuOpen ? navCloseMenu : navOpenMenu}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className={navMode === 'line'
            ? 'mx-auto border-t px-4 pb-4 pt-3 md:hidden'
            : 'mx-auto mt-3 max-w-6xl border p-4 md:hidden'}
          style={navMode === 'line'
            ? { borderColor: 'color-mix(in srgb, var(--color-border) 84%, transparent)' }
            : {
                ...shellStyle,
                borderRadius: 'calc(var(--ui-radius-2xl) + 2px)',
              }}
        >
          <ul className="flex flex-col gap-2 list-none">
            {navLinks.map((link) => (
              <li key={link.id}>
                <NavItem link={link} mobile />
              </li>
            ))}
          </ul>
          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)' }}
          >
            <Link
              to="/admin/login"
              className="text-xs transition-colors duration-200"
              style={{ color: 'var(--color-text-secondary)' }}
              onClick={closeMenu}
            >
              {navAdminLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
