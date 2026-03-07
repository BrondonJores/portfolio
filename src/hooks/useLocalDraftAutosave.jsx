/* Hook de sauvegarde automatique locale avec restauration. */
import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Lit un brouillon localStorage.
 * @param {string} key Cle de stockage.
 * @returns {{saved_at: number, data: unknown} | null} Brouillon lu ou null.
 */
function readDraft(key) {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    return {
      saved_at: Number(parsed?.saved_at) || Date.now(),
      data: parsed?.data ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Ecrit un brouillon dans localStorage.
 * @param {string} key Cle de stockage.
 * @param {{saved_at: number, data: unknown}} payload Donnees a persister.
 * @returns {void}
 */
function writeDraft(key, payload) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Supprime un brouillon de localStorage.
 * @param {string} key Cle de stockage.
 * @returns {void}
 */
function removeDraft(key) {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore remove errors */
  }
}

/**
 * Formate un timestamp d'autosave en texte court.
 * @param {number | null} timestamp Date epoch en millisecondes.
 * @returns {string} Libelle lisible.
 */
function formatAutosaveLabel(timestamp) {
  if (!timestamp) return 'Aucune sauvegarde locale'

  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(timestamp))
  } catch {
    return 'Sauvegarde locale active'
  }
}

/**
 * Gere la restauration + autosave locale d'un formulaire.
 * @param {object} params Parametres du hook.
 * @param {string} params.storageKey Cle localStorage unique au formulaire.
 * @param {boolean} params.loading Etat de chargement distant.
 * @param {boolean} params.hasContent true si le formulaire contient des donnees utiles.
 * @param {unknown} params.draftData Donnees serialisables a sauvegarder.
 * @param {(draftData: unknown) => void} [params.onRestore] Callback appele a la restauration.
 * @param {number} [params.debounceMs=800] Delai debounce autosave.
 * @param {boolean} [params.enabled=true] Active ou non le mecanisme.
 * @returns {{autosaveAt: number | null, autosaveLabel: string, localDraftHydrated: boolean, localDraftRestored: boolean, clearDraft: () => void}} Etat et actions autosave.
 */
export default function useLocalDraftAutosave({
  storageKey,
  loading,
  hasContent,
  draftData,
  onRestore,
  debounceMs = 800,
  enabled = true,
}) {
  const [autosaveAt, setAutosaveAt] = useState(null)
  const [localDraftHydrated, setLocalDraftHydrated] = useState(false)
  const [localDraftRestored, setLocalDraftRestored] = useState(false)

  useEffect(() => {
    setAutosaveAt(null)
    setLocalDraftHydrated(false)
    setLocalDraftRestored(false)
  }, [storageKey])

  useEffect(() => {
    if (!enabled || loading || localDraftHydrated) return

    const draft = readDraft(storageKey)
    setLocalDraftHydrated(true)
    if (!draft) return

    setAutosaveAt(draft.saved_at)
    setLocalDraftRestored(true)
    if (typeof onRestore === 'function') {
      onRestore(draft.data)
    }
  }, [enabled, loading, localDraftHydrated, storageKey, onRestore])

  useEffect(() => {
    if (!enabled || loading || !localDraftHydrated) return

    if (!hasContent) {
      removeDraft(storageKey)
      setAutosaveAt(null)
      return
    }

    const timer = setTimeout(() => {
      const payload = {
        saved_at: Date.now(),
        data: draftData,
      }

      writeDraft(storageKey, payload)
      setAutosaveAt(payload.saved_at)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [enabled, loading, localDraftHydrated, hasContent, storageKey, draftData, debounceMs])

  /**
   * Efface explicitement le brouillon local courant.
   * @returns {void}
   */
  const clearDraft = useCallback(() => {
    removeDraft(storageKey)
    setAutosaveAt(null)
  }, [storageKey])

  const autosaveLabel = useMemo(() => formatAutosaveLabel(autosaveAt), [autosaveAt])

  return {
    autosaveAt,
    autosaveLabel,
    localDraftHydrated,
    localDraftRestored,
    clearDraft,
  }
}
