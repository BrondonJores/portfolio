/* Contexte pour les parametres dynamiques du portfolio */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSettings } from '../services/settingService.js'
import { applyThemeSettings, mergeWithThemeDefaults } from '../utils/themeSettings.js'

const SettingsContext = createContext({})

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => mergeWithThemeDefaults({}))
  const [loading, setLoading] = useState(true)

  const refreshSettings = useCallback(async () => {
    const res = await getSettings()
    const next = mergeWithThemeDefaults(res?.data || {})
    setSettings(next)
    return next
  }, [])

  const updateLocalSettings = useCallback((patch = {}) => {
    setSettings((prev) => mergeWithThemeDefaults({ ...prev, ...patch }))
  }, [])

  useEffect(() => {
    refreshSettings()
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshSettings])

  useEffect(() => {
    applyThemeSettings(settings)
  }, [settings])

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings, updateLocalSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
