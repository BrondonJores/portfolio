/* Composant racine avec CSP et layout de base */
import { Helmet } from 'react-helmet-async'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useSettings } from './context/SettingsContext.jsx'
import Spinner from './components/ui/Spinner.jsx'
import InteractiveCursor from './components/ui/InteractiveCursor.jsx'
import PageTransitionOverlay from './components/ui/PageTransitionOverlay.jsx'
import { getAnimationConfig, parseBooleanSetting } from './utils/animationSettings.js'
import { applyThemeSettings } from './utils/themeSettings.js'

const ScrollProgressBar = lazy(() => import('./components/ui/ScrollProgressBar.jsx'))
const AnimatedSpriteSystem = lazy(() => import('./components/ui/AnimatedSpriteSystem.jsx'))
const SpeedInsightsWidget = lazy(() =>
  import('@vercel/speed-insights/react').then((module) => ({ default: module.SpeedInsights }))
)

/* Politique de securite du contenu */
const apiOrigin = import.meta.env.VITE_API_URL || ''
const serverOrigin = import.meta.env.VITE_SERVER_URL || ''
const RECAPTCHA_SCRIPT_ORIGINS = ['https://www.google.com', 'https://www.gstatic.com', 'https://www.recaptcha.net']
const RECAPTCHA_FRAME_ORIGINS = ['https://www.google.com', 'https://recaptcha.google.com', 'https://www.recaptcha.net']
const VERCEL_SCRIPT_ORIGINS = ['https://va.vercel-scripts.com']
const VERCEL_CONNECT_ORIGINS = ['https://vitals.vercel-insights.com']

function joinCspSources(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean))).join(' ')
}

const CSP_POLICY = [
  "default-src 'self'",
  `script-src ${joinCspSources([
    "'self'",
    ...RECAPTCHA_SCRIPT_ORIGINS,
    ...VERCEL_SCRIPT_ORIGINS,
  ])}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${joinCspSources(["'self'", 'data:', 'https:', serverOrigin, ...RECAPTCHA_SCRIPT_ORIGINS])}`,
  `font-src ${joinCspSources(["'self'", 'data:'])}`,
  `connect-src ${joinCspSources([
    "'self'",
    'https://api.resend.com',
    apiOrigin,
    ...RECAPTCHA_SCRIPT_ORIGINS,
    ...VERCEL_CONNECT_ORIGINS,
  ])}`,
  `frame-src ${joinCspSources(["'self'", ...RECAPTCHA_FRAME_ORIGINS])}`,
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

function normalizeBaseUrl(rawValue) {
  if (typeof rawValue !== 'string') {
    return ''
  }
  return rawValue.trim().replace(/\/+$/, '')
}

function MaintenanceScreen({ siteName, tagline, badgeLabel, message }) {
  return (
    <section
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div
        className="w-full max-w-xl p-8 rounded-2xl border text-center"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-accent)' }}>
          {badgeLabel || 'Maintenance'}
        </p>
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {siteName}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {tagline || message || 'Le site est temporairement en maintenance. Revenez dans quelques instants.'}
        </p>
      </div>
    </section>
  )
}

/* Layout public */
export default function App() {
  const { settings, loading, getThemeSettingsForPath } = useSettings()
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  const [speedInsightsReady, setSpeedInsightsReady] = useState(false)
  const [siteLoaderDelayDone, setSiteLoaderDelayDone] = useState(false)
  const [isPageTransitionVisible, setIsPageTransitionVisible] = useState(false)
  const previousPathRef = useRef(location.pathname)
  const activeThemeSettings = useMemo(
    () => getThemeSettingsForPath(location.pathname),
    [getThemeSettingsForPath, location.pathname]
  )

  useEffect(() => {
    applyThemeSettings(activeThemeSettings)
  }, [activeThemeSettings])

  useEffect(() => {
    const timer = window.setTimeout(() => setSiteLoaderDelayDone(true), 850)
    return () => window.clearTimeout(timer)
  }, [])

  const animationConfig = useMemo(
    () => getAnimationConfig(activeThemeSettings, Boolean(prefersReducedMotion)),
    [activeThemeSettings, prefersReducedMotion]
  )
  const siteName = (settings.site_name || settings.hero_name || 'Portfolio').trim()
  const tagline = (settings.tagline || settings.hero_title || '').trim()
  const seoTitle = (settings.seo_title || (tagline ? `${siteName} - ${tagline}` : siteName)).trim()
  const seoDescription = (settings.seo_description || tagline || `${siteName} portfolio`).trim()
  const seoKeywords = (settings.seo_keywords || '').trim()
  const ogImageUrl = (settings.og_image_url || '').trim()
  const siteBaseUrl = normalizeBaseUrl(settings.site_url)
  const canonicalUrl = siteBaseUrl ? `${siteBaseUrl}${location.pathname}` : ''
  const maintenanceMode = parseBooleanSetting(settings.maintenance_mode, false)
  const maintenanceBadge = (settings.ui_maintenance_badge || 'Maintenance').trim()
  const maintenanceMessage = (settings.ui_maintenance_message || '').trim()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const showPublicDecorations = !maintenanceMode && !isAdminRoute
  const showSiteLoader = !isAdminRoute && (loading || !siteLoaderDelayDone)

  useEffect(() => {
    if (!import.meta.env.PROD || speedInsightsReady) {
      return undefined
    }

    if (typeof window === 'undefined') {
      setSpeedInsightsReady(true)
      return undefined
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(
        () => setSpeedInsightsReady(true),
        { timeout: 1600 }
      )
      return () => {
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId)
        }
      }
    }

    const timer = window.setTimeout(() => setSpeedInsightsReady(true), 650)
    return () => window.clearTimeout(timer)
  }, [speedInsightsReady])

  useEffect(() => {
    const previousPath = previousPathRef.current
    if (previousPath === location.pathname) {
      return undefined
    }

    previousPathRef.current = location.pathname

    if (location.pathname.startsWith('/admin')) {
      setIsPageTransitionVisible(false)
      return undefined
    }

    if (!animationConfig.canAnimate || !animationConfig.pageTransitionEnabled || maintenanceMode) {
      setIsPageTransitionVisible(false)
      return undefined
    }

    const safeDuration = Math.max(250, Number(animationConfig.pageTransitionDurationMs) || 850)
    setIsPageTransitionVisible(true)
    const timer = window.setTimeout(() => setIsPageTransitionVisible(false), safeDuration)
    return () => window.clearTimeout(timer)
  }, [
    animationConfig.canAnimate,
    animationConfig.pageTransitionDurationMs,
    animationConfig.pageTransitionEnabled,
    location.pathname,
    maintenanceMode,
  ])

  return (
    <>
      <Helmet>
        <meta httpEquiv="Content-Security-Policy" content={CSP_POLICY} />
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        <meta property="og:site_name" content={siteName} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
        <meta name="twitter:card" content={ogImageUrl ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      </Helmet>

      {/* Fade-in global au montage */}
      <motion.div
        initial={animationConfig.canAnimate ? { opacity: 0 } : false}
        animate={animationConfig.canAnimate ? { opacity: 1 } : false}
        transition={{ duration: 0.4 * animationConfig.durationScale, ease: animationConfig.easePreset }}
      >
        {showPublicDecorations && (
          <Suspense fallback={null}>
            <ScrollProgressBar />
            <AnimatedSpriteSystem />
          </Suspense>
        )}
        {showPublicDecorations && <InteractiveCursor />}
        <main>
          {maintenanceMode ? (
            <MaintenanceScreen
              siteName={siteName}
              tagline={tagline}
              badgeLabel={maintenanceBadge}
              message={maintenanceMessage}
            />
          ) : (
            <Outlet />
          )}
          {import.meta.env.PROD && speedInsightsReady && (
            <Suspense fallback={null}>
              <SpeedInsightsWidget />
            </Suspense>
          )}
        </main>
        {showPublicDecorations && (
          <PageTransitionOverlay
            visible={isPageTransitionVisible}
            assetUrl={animationConfig.loaderPageAssetUrl}
            overlayOpacity={animationConfig.pageTransitionOverlayOpacity}
            durationMs={animationConfig.pageTransitionDurationMs}
          />
        )}
        {showSiteLoader && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" variant="site" />
              <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                {siteName}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </>
  )
}
