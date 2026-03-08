/* Utilitaires pour ouvrir et synchroniser les onglets d'edition admin. */
const ADMIN_EDITOR_REFRESH_KEY = 'portfolio_admin_editor_refresh'

/**
 * Ouvre un nouvel onglet d'edition admin.
 * @param {string} path Route cible.
 * @param {{windowName?: string, width?: number, height?: number}} [options] Options legacy conservees.
 * @returns {Window | null} Reference onglet ou null si bloque.
 */
export function openAdminEditorWindow(path, options = {}) {
  if (typeof window === 'undefined') {
    return null
  }
  void options

  /* Nouveau comportement: toujours un nouvel onglet (_blank), pas de popup dimensionnee. */
  const editorTab = window.open(path, '_blank')
  if (editorTab) {
    editorTab.focus()
  }

  return editorTab
}

/**
 * Emission d'un signal de refresh inter-onglets apres sauvegarde.
 * @param {string} entity Cible metier (projects/articles/newsletter...).
 * @returns {void}
 */
export function notifyAdminEditorSaved(entity) {
  if (typeof window === 'undefined') {
    return
  }

  const payload = JSON.stringify({
    entity: String(entity || 'global'),
    at: new Date().toISOString(),
  })

  localStorage.setItem(ADMIN_EDITOR_REFRESH_KEY, payload)
}

/**
 * Ecoute les evenements de refresh envoyes par d'autres onglets admin.
 * @param {(payload: {entity: string, at: string}) => void} callback Callback.
 * @returns {() => void} Fonction de nettoyage.
 */
export function subscribeAdminEditorRefresh(callback) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  /**
   * Handler storage event.
   * @param {StorageEvent} event Evenement browser.
   * @returns {void}
   */
  const onStorage = (event) => {
    if (event.key !== ADMIN_EDITOR_REFRESH_KEY || !event.newValue) return
    try {
      const payload = JSON.parse(event.newValue)
      callback(payload)
    } catch {
      /* Ignore payload invalide. */
    }
  }

  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

/**
 * Detecte si la page est ouverte depuis un autre onglet admin.
 * @returns {boolean} True si l'onglet parent existe.
 */
export function isAdminEditorPopup() {
  if (typeof window === 'undefined') return false
  return Boolean(window.opener && !window.opener.closed)
}
