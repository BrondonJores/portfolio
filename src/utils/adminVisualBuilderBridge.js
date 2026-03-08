/* Bridge entre les formulaires admin et la page builder visuelle. */
import { openAdminEditorWindow } from './adminEditorWindow.js'

const BUILDER_CHANNEL_PREFIX = 'portfolio_admin_visual_builder_channel_'

/**
 * Nettoie une valeur pour creer une cle de canal stable.
 * @param {unknown} value Valeur brute.
 * @returns {string} Chaine sanitisee.
 */
function sanitizeKeyPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'new'
}

/**
 * Construit l'identifiant de canal pour un contenu donne.
 * @param {string} entity Entite metier (article/project/newsletter).
 * @param {string|number|undefined|null} resourceId Identifiant de ressource.
 * @returns {string} Identifiant de canal stable.
 */
export function createBuilderChannel(entity, resourceId) {
  const safeEntity = sanitizeKeyPart(entity)
  const safeResource = sanitizeKeyPart(resourceId ?? 'new')
  return `${safeEntity}:${safeResource}`
}

/**
 * Construit la cle localStorage associee a un canal.
 * @param {string} channel Canal logique.
 * @returns {string} Cle localStorage.
 */
function getChannelStorageKey(channel) {
  return `${BUILDER_CHANNEL_PREFIX}${sanitizeKeyPart(channel)}`
}

/**
 * Ecrit un snapshot dans le canal builder.
 * @param {string} channel Canal cible.
 * @param {object} payload Donnees a partager.
 * @returns {void}
 */
export function writeBuilderChannelSnapshot(channel, payload) {
  if (typeof window === 'undefined') return

  const key = getChannelStorageKey(channel)
  const snapshot = JSON.stringify({
    payload,
    at: new Date().toISOString(),
  })
  localStorage.setItem(key, snapshot)
}

/**
 * Lit un snapshot de canal builder.
 * @param {string} channel Canal cible.
 * @returns {{payload: object, at: string} | null} Snapshot trouve.
 */
export function readBuilderChannelSnapshot(channel) {
  if (typeof window === 'undefined') return null

  const key = getChannelStorageKey(channel)
  const raw = localStorage.getItem(key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Ecoute les changements de snapshot sur un canal donne.
 * @param {string} channel Canal cible.
 * @param {(snapshot: {payload: object, at: string}) => void} callback Callback.
 * @returns {() => void} Fonction de nettoyage.
 */
export function subscribeBuilderChannel(channel, callback) {
  if (typeof window === 'undefined') return () => {}

  const key = getChannelStorageKey(channel)
  const onStorage = (event) => {
    if (event.key !== key || !event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue)
      callback(parsed)
    } catch {
      /* Snapshot invalide ignore. */
    }
  }

  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

/**
 * Ouvre la page builder visuelle dans un nouvel onglet.
 * @param {{entity: string, channel: string}} options Options d'ouverture.
 * @returns {Window | null} Reference onglet.
 */
export function openAdminVisualBuilder(options) {
  const entity = sanitizeKeyPart(options?.entity || 'article')
  const channel = sanitizeKeyPart(options?.channel || `${entity}-new`)
  const path = `/admin/builder?entity=${encodeURIComponent(entity)}&channel=${encodeURIComponent(channel)}`
  return openAdminEditorWindow(path)
}
