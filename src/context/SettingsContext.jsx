/* Contexte pour les parametres dynamiques du portfolio */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSettings } from '../services/settingService.js'
import { getPublicThemePresets } from '../services/themePresetService.js'
import { applyThemeSettings, mergeWithThemeDefaults } from '../utils/themeSettings.js'
import { resolveThemeSettingKeyForPath } from '../utils/pageThemeTargets.js'

const SettingsContext = createContext({})

/**
 * Convertit un identifiant brut en entier positif.
 * @param {unknown} rawValue Valeur brute.
 * @returns {number|null} Identifiant numerique valide ou null.
 */
function toPositiveInteger(rawValue) {
  const parsed = Number.parseInt(String(rawValue ?? ''), 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => mergeWithThemeDefaults({}))
  const [themePresets, setThemePresets] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshSettings = useCallback(async () => {
    const res = await getSettings()
    const next = mergeWithThemeDefaults(res?.data || {})
    setSettings(next)
    return next
  }, [])

  const refreshThemePresets = useCallback(async () => {
    const res = await getPublicThemePresets()
    const nextPresets = Array.isArray(res?.data) ? res.data : []
    setThemePresets(nextPresets)
    return nextPresets
  }, [])

  const updateLocalSettings = useCallback((patch = {}) => {
    setSettings((prev) => mergeWithThemeDefaults({ ...prev, ...patch }))
  }, [])

  /**
   * Construit les settings effectifs d'une page en tenant compte
   * du preset assigne a cette route.
   * @param {string} pathname Pathname public courant.
   * @returns {Record<string, unknown>} Settings resolus pour la page.
   */
  const getThemeSettingsForPath = useCallback((pathname = '/') => {
    const settingKey = resolveThemeSettingKeyForPath(pathname)
    if (!settingKey) {
      return mergeWithThemeDefaults(settings)
    }

    const presetId = toPositiveInteger(settings[settingKey])
    if (!presetId) {
      return mergeWithThemeDefaults(settings)
    }

    const matchedPreset = themePresets.find((preset) => Number(preset?.id) === presetId)
    const presetSettings = matchedPreset?.settings && typeof matchedPreset.settings === 'object'
      ? matchedPreset.settings
      : {}

    return mergeWithThemeDefaults({
      ...settings,
      ...presetSettings,
    })
  }, [settings, themePresets])

  useEffect(() => {
    Promise.all([refreshSettings(), refreshThemePresets()])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshSettings, refreshThemePresets])

  useEffect(() => {
    applyThemeSettings(settings)
  }, [settings])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        themePresets,
        loading,
        refreshSettings,
        refreshThemePresets,
        updateLocalSettings,
        getThemeSettingsForPath,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
