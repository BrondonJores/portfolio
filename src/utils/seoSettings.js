export function getSiteName(settings = {}) {
  return (settings.site_name || settings.hero_name || 'Portfolio').trim()
}

export function getDefaultSeoTitle(settings = {}) {
  const siteName = getSiteName(settings)
  const tagline = (settings.tagline || settings.hero_title || '').trim()
  return (settings.seo_title || (tagline ? `${siteName} - ${tagline}` : siteName)).trim()
}

export function buildPageTitle(settings = {}, pageTitle = '') {
  const cleanPageTitle = String(pageTitle || '').trim()
  if (!cleanPageTitle) {
    return getDefaultSeoTitle(settings)
  }
  return `${cleanPageTitle} - ${getSiteName(settings)}`
}
