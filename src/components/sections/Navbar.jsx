import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useScrollPosition } from '../../hooks/useScrollPosition.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'
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

function resolveActiveLinkId(navLinks, locationPathname, isHome) {
  if (isHome) {
    return 'home'
  }

  const activeLink = navLinks.find((link) => {
    const [pathname] = String(link.to || '').split('#')
    return pathname && pathname !== '/' && pathname === locationPathname
  })

  return activeLink?.id || null
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollY = useScrollPosition()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const uiPrimitives = useMemo(() => getUiThemePrimitives(settings), [settings])
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )
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
  const canAnimate = animationConfig.canAnimate
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
  const activeLinkId = resolveActiveLinkId(navLinks, location.pathname, isHome)
  const navTransition = useMemo(
    () => ({
      duration: Math.max(0.22, 0.36 * animationConfig.durationScale),
      ease: [0.22, 1, 0.36, 1],
    }),
    [animationConfig.durationScale]
  )

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.hash])

  function renderLinkChrome(isActive, mobile) {
    if (navMode === 'line' && !mobile) {
      return (
        <AnimatePresence initial={false}>
          {isActive && (
            <motion.span
              layoutId="navbar-line-indicator"
              className="pointer-events-none absolute inset-x-0 -bottom-1 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent-light) 86%, transparent), transparent)',
              }}
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.4 }}
              transition={navTransition}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      )
    }

    return (
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.span
            layoutId={mobile ? 'navbar-mobile-indicator' : 'navbar-desktop-indicator'}
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              backgroundColor: navMode === 'panel'
                ? 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)'
                : 'color-mix(in srgb, var(--color-accent-glow) 24%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-border))',
            }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={navTransition}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    )
  }

  function NavItem({ link, mobile = false }) {
    const isActive = activeLinkId === link.id
    const baseClass = mobile
      ? 'relative flex min-h-11 items-center overflow-hidden rounded-[var(--ui-radius-lg)] border px-3 py-2 text-sm font-medium transition-colors duration-200'
      : navMode === 'line'
        ? 'relative text-sm font-medium transition-colors duration-200'
        : navMode === 'panel'
          ? 'relative inline-flex items-center overflow-hidden rounded-[var(--ui-radius-lg)] border px-3 py-2 text-sm font-medium transition-colors duration-200'
          : 'relative inline-flex items-center overflow-hidden rounded-full border px-3 py-2 text-sm font-medium transition-colors duration-200'

    const linkMotion = canAnimate && !mobile
      ? { y: -2 }
      : undefined
    const linkTap = canAnimate
      ? { scale: 0.985 }
      : undefined
    const linkLabel = (
      <>
        {renderLinkChrome(isActive, mobile)}
        <motion.span
          className="relative z-[1] inline-flex items-center"
          whileHover={linkMotion}
          whileTap={linkTap}
          transition={navTransition}
        >
          {link.label}
        </motion.span>
      </>
    )

    if (isHome) {
      return (
        <a
          href={link.anchor}
          className={baseClass}
          style={buildLinkStyle(navMode, isActive)}
          onClick={mobile ? closeMenu : undefined}
        >
          {linkLabel}
        </a>
      )
    }

    return (
      <Link
        to={link.to}
        className={baseClass}
        style={buildLinkStyle(navMode, isActive)}
        onClick={mobile ? closeMenu : undefined}
      >
        {linkLabel}
      </Link>
    )
  }

  return (
    <motion.header
      className={`fixed left-0 right-0 z-50 ${navMode === 'line' ? 'top-0' : 'top-4 px-4 sm:px-6 lg:px-8'}`}
      style={navMode === 'line'
        ? {
            ...shellStyle,
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
          }
        : undefined}
      animate={canAnimate
        ? {
            y: navMode === 'line' ? 0 : isScrolled ? 0 : -4,
            opacity: 1,
          }
        : undefined}
      transition={navTransition}
    >
      <motion.nav
        className={navMode === 'line'
          ? 'mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'
          : 'mx-auto flex max-w-6xl items-center justify-between gap-4 border px-4 sm:px-6'}
        style={{
          ...(navMode === 'line' ? {} : shellStyle),
          minHeight: 'var(--ui-nav-height)',
          borderRadius: navMode === 'panel' ? 'calc(var(--ui-radius-2xl) + 2px)' : '999px',
        }}
        animate={canAnimate && navMode !== 'line'
          ? {
              scale: isScrolled ? 1 : 0.992,
            }
          : undefined}
        transition={navTransition}
        aria-label={navAriaMain}
      >
        <motion.div
          whileHover={canAnimate ? { y: -2 } : undefined}
          transition={navTransition}
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
        </motion.div>

        <motion.ul
          className={navMode === 'panel'
            ? 'hidden list-none items-center gap-2 rounded-[var(--ui-radius-xl)] border px-2 py-2 md:flex'
            : 'hidden list-none items-center gap-2 md:flex'}
          style={navMode === 'panel'
            ? {
                backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 70%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
              }
            : undefined}
          initial={false}
          animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
          transition={navTransition}
        >
          {navLinks.map((link, index) => (
            <motion.li
              key={link.id}
              initial={false}
              animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
              transition={{ ...navTransition, delay: canAnimate ? index * 0.02 : 0 }}
            >
              <NavItem link={link} mobile={false} />
            </motion.li>
          ))}
        </motion.ul>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={toggleTheme}
            className={navMode === 'line'
              ? 'rounded-[var(--ui-radius-lg)] p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'
              : 'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'
            }
            style={navMode === 'line'
              ? { color: 'var(--color-text-secondary)' }
              : { ...actionStyle, color: 'var(--color-text-secondary)' }}
            whileHover={canAnimate ? { y: -2, scale: 1.04 } : undefined}
            whileTap={canAnimate ? { scale: 0.92 } : undefined}
            transition={navTransition}
            aria-label={theme === 'dark' ? navToggleLight : navToggleDark}
          >
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </motion.button>

          <motion.button
            className={navMode === 'line'
              ? 'rounded-[var(--ui-radius-lg)] p-2 transition-colors md:hidden'
              : 'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors md:hidden'
            }
            style={navMode === 'line'
              ? { color: 'var(--color-text-secondary)' }
              : { ...actionStyle, color: 'var(--color-text-secondary)' }}
            onClick={toggleMenu}
            whileHover={canAnimate ? { y: -2, scale: 1.04 } : undefined}
            whileTap={canAnimate ? { scale: 0.92 } : undefined}
            transition={navTransition}
            aria-label={menuOpen ? navCloseMenu : navOpenMenu}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </motion.button>
        </div>
      </motion.nav>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            className={navMode === 'line'
              ? 'mx-auto border-t px-4 pb-4 pt-3 md:hidden'
              : 'mx-auto mt-3 max-w-6xl border p-4 md:hidden'}
            style={navMode === 'line'
              ? { borderColor: 'color-mix(in srgb, var(--color-border) 84%, transparent)' }
              : {
                  ...shellStyle,
                  borderRadius: 'calc(var(--ui-radius-2xl) + 2px)',
                }}
            initial={canAnimate ? { opacity: 0, y: -14, filter: 'blur(10px)' } : false}
            animate={canAnimate ? { opacity: 1, y: 0, filter: 'blur(0px)' } : false}
            exit={canAnimate ? { opacity: 0, y: -10, filter: 'blur(8px)' } : false}
            transition={navTransition}
          >
            <motion.ul
              className="flex list-none flex-col gap-2"
              initial={false}
              animate={canAnimate ? { opacity: 1 } : false}
              transition={{ staggerChildren: canAnimate ? 0.04 : 0 }}
            >
              {navLinks.map((link) => (
                <motion.li
                  key={link.id}
                  initial={canAnimate ? { opacity: 0, y: 8 } : false}
                  animate={canAnimate ? { opacity: 1, y: 0 } : false}
                  exit={canAnimate ? { opacity: 0, y: 6 } : false}
                  transition={navTransition}
                >
                  <NavItem link={link} mobile />
                </motion.li>
              ))}
            </motion.ul>
            <motion.div
              className="mt-4 border-t pt-4"
              style={{ borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)' }}
              initial={canAnimate ? { opacity: 0, y: 8 } : false}
              animate={canAnimate ? { opacity: 1, y: 0 } : false}
              exit={canAnimate ? { opacity: 0, y: 6 } : false}
              transition={navTransition}
            >
              <Link
                to="/admin/login"
                className="text-xs transition-colors duration-200"
                style={{ color: 'var(--color-text-secondary)' }}
                onClick={closeMenu}
              >
                {navAdminLabel}
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
