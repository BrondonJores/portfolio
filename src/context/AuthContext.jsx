/* Contexte d'authentification pour l'espace administrateur */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { configureApi } from '../services/api.js'
import {
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  verifyTwoFactor as verifyTwoFactorRequest,
} from '../services/authService.js'

const AuthContext = createContext(null)

/* Fournisseur du contexte d'authentification */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  /* Le token d'acces est stocke uniquement en memoire, jamais en localStorage */
  const [accessToken, setAccessToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  /* Deconnexion et suppression du cookie refresh token */
  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      /* Echec silencieux */
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  /* Rafraichissement du token d'acces */
  const refreshToken = useCallback(async () => {
    const data = await refreshRequest()
    setAccessToken(data.accessToken)
    if (data?.user) {
      setUser(data.user)
    }
    return data.accessToken
  }, [])

  /* Tentative de restauration silencieuse de la session au montage */
  useEffect(() => {
    const restore = async () => {
      try {
        const data = await refreshRequest()
        if (data?.accessToken) {
          setAccessToken(data.accessToken)
          setUser(data.user || null)
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
    const data = await loginRequest(email, password)
    if (data?.mfaRequired) {
      return data
    }

    setAccessToken(data.accessToken)
    setUser(data.user)

    return data
  }, [])

  /* Validation du challenge 2FA lors de la seconde etape de connexion */
  const verifyTwoFactor = useCallback(async ({ mfaToken, totpCode, recoveryCode }) => {
    const data = await verifyTwoFactorRequest({
      mfaToken,
      totpCode,
      recoveryCode,
    })
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data
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
