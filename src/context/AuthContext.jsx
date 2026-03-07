/* Contexte d'authentification pour l'espace administrateur */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { configureApi } from '../services/api.js'

const AuthContext = createContext(null)

/**
 * Extrait un message d'erreur lisible depuis un payload API.
 * @param {unknown} payload Corps JSON d'erreur.
 * @param {string} fallback Message par defaut.
 * @returns {string} Message utilisateur.
 */
function resolveApiErrorMessage(payload, fallback) {
  if (payload && typeof payload === 'object') {
    const direct = String(payload.error || '').trim()
    if (direct) {
      return direct
    }

    if (Array.isArray(payload.errors)) {
      const messages = Array.from(
        new Set(
          payload.errors
            .map((item) => String(item?.msg || '').trim())
            .filter(Boolean)
        )
      )
      if (messages.length > 0) {
        return messages.join(' ')
      }
    }
  }

  return fallback
}

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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setAccessToken(data.accessToken)
          /* Recuperation des informations de l'utilisateur */
          const meResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(resolveApiErrorMessage(data, 'Identifiants invalides.'))
    }

    const data = await response.json()
    if (data?.mfaRequired) {
      return data
    }

    setAccessToken(data.accessToken)
    setUser(data.user)

    return data
  }, [])

  /* Validation du challenge 2FA lors de la seconde etape de connexion */
  const verifyTwoFactor = useCallback(async ({ mfaToken, totpCode, recoveryCode }) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mfa_token: mfaToken,
        ...(totpCode ? { totp_code: totpCode } : {}),
        ...(recoveryCode ? { recovery_code: recoveryCode } : {}),
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(resolveApiErrorMessage(data, 'Code 2FA invalide.'))
    }

    const data = await response.json()
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data
  }, [])

  /* Deconnexion et suppression du cookie refresh token */
  const logout = useCallback(async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/refresh`, {
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
    verifyTwoFactor,
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
