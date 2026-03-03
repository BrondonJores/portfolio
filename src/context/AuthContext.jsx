/* Contexte d'authentification pour l'espace administrateur */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { configureApi } from '../services/api.js'

const AuthContext = createContext(null)

/* Fournisseur du contexte d'authentification */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  /* Le token d'acces est stocke uniquement en memoire, jamais en localStorage */
  const [accessToken, setAccessToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  /* Tentative de restauration silencieuse de la session au montage */
  useEffect(() => {
    const restore = async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setAccessToken(data.accessToken)
          /* Recuperation des informations de l'utilisateur */
          const meResponse = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          })
          if (meResponse.ok) {
            const meData = await meResponse.json()
            setUser(meData.user)
          }
        }
      } catch {
        /* Echec silencieux : l'utilisateur n'est pas connecte */
      } finally {
        setIsLoading(false)
      }
    }

    restore()
  }, [])

  /* Connexion avec email et mot de passe */
  const login = useCallback(async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Identifiants invalides.')
    }

    const data = await response.json()
    setAccessToken(data.accessToken)
    setUser(data.user)

    return data
  }, [])

  /* Deconnexion et suppression du cookie refresh token */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      /* Echec silencieux */
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  /* Rafraichissement du token d'acces */
  const refreshToken = useCallback(async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Refresh token invalide.')
    }

    const data = await response.json()
    setAccessToken(data.accessToken)
    return data.accessToken
  }, [])

  /* Configuration du service API a chaque changement de token */
  useEffect(() => {
    configureApi({
      accessToken,
      refreshToken: refreshToken,
      logout,
    })
  }, [accessToken, refreshToken, logout])

  const value = {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    login,
    logout,
    refreshToken,
    setAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* Hook personnalise pour consommer le contexte d'authentification */
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext doit etre utilise a l'interieur de AuthProvider")
  }
  return context
}
