/* Contexte pour les parametres dynamiques du portfolio */
import { createContext, useContext, useState, useEffect } from 'react'
import { getSettings } from '../services/settingService.js'

const SettingsContext = createContext({})

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings()
      .then((res) => setSettings(res?.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
