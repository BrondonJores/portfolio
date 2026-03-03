/* Contexte pour la gestion du theme clair/sombre */
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

/* Fournisseur du contexte de theme */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    /* Lecture de la preference sauvegardee en localStorage */
    return localStorage.getItem('theme') ?? 'dark'
  })

  useEffect(() => {
    /* Persistance de la preference dans localStorage */
    localStorage.setItem('theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/* Hook personnalise pour consommer le contexte de theme */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme doit etre utilise a l\'interieur de ThemeProvider')
  }
  return context
}
