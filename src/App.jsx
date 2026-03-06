/* Composant racine avec CSP et layout de base */
import { Helmet } from 'react-helmet-async'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { SpeedInsights } from "@vercel/speed-insights/react"
import ScrollProgressBar from './components/ui/ScrollProgressBar.jsx'
import AnimatedSpriteSystem from './components/ui/AnimatedSpriteSystem.jsx'
import { useSettings } from './context/SettingsContext.jsx'
import { getAnimationConfig, parseBooleanSetting } from './utils/animationSettings.js'

/* Politique de securite du contenu */
const apiOrigin = import.meta.env.VITE_API_URL || ''
const serverOrigin = import.meta.env.VITE_SERVER_URL || ''

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: https:", serverOrigin].filter(Boolean).join(' '),
  "font-src 'self'",
  ["connect-src 'self' https://api.resend.com", apiOrigin].filter(Boolean).join(' '),
].join('; ')

function normalizeBaseUrl(rawValue) {
  if (typeof rawValue !== 'string') {
    return ''
  }
  return rawValue.trim().replace(/\/+$/, '')
}

function MaintenanceScreen({ siteName, tagline }) {
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
          Maintenance
        </p>
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {siteName}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {tagline || 'Le site est temporairement en maintenance. Revenez dans quelques instants.'}
        </p>
      </div>
    </section>
  )
}

/* Layout public */
export default function App() {
  const { settings } = useSettings()
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
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
        {!maintenanceMode && <ScrollProgressBar />}
        {!maintenanceMode && <AnimatedSpriteSystem />}
        <main>
          {maintenanceMode ? (
            <MaintenanceScreen siteName={siteName} tagline={tagline} />
          ) : (
            <Outlet />
          )}
          <SpeedInsights />
        </main>
      </motion.div>
    </>
  )
}
