/* Contexte d'authentification pour l'espace administrateur */
import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { configureApi } from '../services/api.js'
import {
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  verifyTwoFactor as verifyTwoFactorRequest,
} from '../services/authService.js'

const AuthContext = createContext(null)

/**
 * Decode un segment JWT base64url.
 * @param {string} value Segment JWT.
 * @returns {string} Texte decode.
 */
function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = padding > 0 ? normalized.padEnd(normalized.length + (4 - padding), '=') : normalized
  return atob(padded)
}

/**
 * Reconstruit le profil utilisateur a partir du payload du JWT access.
 * Sert de filet de securite si le backend ne renvoie pas encore `user` sur /auth/refresh.
 * @param {string | null | undefined} token JWT access.
 * @returns {{id:number,username:string,email:string,twoFactorEnabled:boolean} | null} Profil reconstruit.
 */
function deriveUserFromAccessToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    return null
  }

  try {
    const [, payloadSegment] = token.split('.')
    if (!payloadSegment) {
      return null
    }

    const payload = JSON.parse(decodeBase64Url(payloadSegment))
    const id = Number(payload?.id)
    if (!Number.isInteger(id) || id <= 0) {
      return null
    }

    return {
      id,
      username: String(payload?.username || ''),
      email: String(payload?.email || ''),
      twoFactorEnabled: payload?.twoFactorEnabled === true,
    }
  } catch {
    return null
  }
}

/* Fournisseur du contexte d'authentification */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  /* Le token d'acces est stocke uniquement en memoire, jamais en localStorage */
  const [accessToken, setAccessToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshPromiseRef = useRef(null)
  const authEpochRef = useRef(0)

  /* Deconnexion et suppression du cookie refresh token */
  const logout = useCallback(async () => {
    authEpochRef.current += 1
    refreshPromiseRef.current = null
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
    if (!refreshPromiseRef.current) {
      const authEpochAtStart = authEpochRef.current
      refreshPromiseRef.current = refreshRequest()
        .then((data) => {
          const nextAccessToken = data?.accessToken || null
          const derivedUser = data?.user || deriveUserFromAccessToken(nextAccessToken)

          if (authEpochRef.current === authEpochAtStart) {
            setAccessToken(nextAccessToken)
            setUser((currentUser) => derivedUser || currentUser || null)
          }

          return nextAccessToken
        })
        .finally(() => {
          refreshPromiseRef.current = null
        })
    }

    return refreshPromiseRef.current
  }, [])

  /* Tentative de restauration silencieuse de la session au montage */
  useEffect(() => {
    let active = true

    const restore = async () => {
      try {
        await refreshToken()
      } catch {
        /* Echec silencieux : l'utilisateur n'est pas connecte */
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    restore()
    return () => {
      active = false
    }
  }, [refreshToken])

  /* Connexion avec email et mot de passe */
  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password)
    if (data?.mfaRequired) {
      return data
    }

    authEpochRef.current += 1
    refreshPromiseRef.current = null
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
    authEpochRef.current += 1
    refreshPromiseRef.current = null
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data
  }, [])

  /* Configuration du service API a chaque changement de token */
  useLayoutEffect(() => {
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
