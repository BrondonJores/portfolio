/* Definitions des cibles de theme par page publique. */

export const PAGE_THEME_TARGETS = [
  {
    id: 'home',
    label: 'Accueil',
    settingKey: 'theme_page_home_preset_id',
    routeHint: '/',
  },
  {
    id: 'projects',
    label: 'Projets',
    settingKey: 'theme_page_projects_preset_id',
    routeHint: '/projets',
  },
  {
    id: 'skills',
    label: 'Competences',
    settingKey: 'theme_page_skills_preset_id',
    routeHint: '/competences',
  },
  {
    id: 'blog',
    label: 'Blog',
    settingKey: 'theme_page_blog_preset_id',
    routeHint: '/blog',
  },
  {
    id: 'contact',
    label: 'Contact',
    settingKey: 'theme_page_contact_preset_id',
    routeHint: '/contact',
  },
]

/**
 * Resolut la cle de setting de theme a partir du pathname public.
 * @param {string} pathname Chemin courant.
 * @returns {string} Cle de setting associee ou chaine vide.
 */
export function resolveThemeSettingKeyForPath(pathname = '') {
  const path = String(pathname || '/').toLowerCase()

  if (path === '/') {
    return 'theme_page_home_preset_id'
  }

  if (path.startsWith('/projets')) {
    return 'theme_page_projects_preset_id'
  }

  if (path.startsWith('/competences')) {
    return 'theme_page_skills_preset_id'
  }

  if (path.startsWith('/blog')) {
    return 'theme_page_blog_preset_id'
  }

  if (path.startsWith('/contact')) {
    return 'theme_page_contact_preset_id'
  }

  return ''
}

