/* Hook de polling des messages non lus pour l'espace admin */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { getAdminMessages, markMessageAsRead } from '../services/messageService.js'
import { normalizeAdminPagePayload } from '../utils/adminPagination.js'

const POLL_INTERVAL = 30_000 /* 30 secondes */

/**
 * Recupere et met a jour periodiquement les messages non lus.
 * Expose : { unreadMessages, unreadCount, markAsRead, refresh }
 */
export function useUnreadMessages() {
  const [unreadMessages, setUnreadMessages] = useState([])
  const { accessToken, isAuthenticated, isLoading } = useAuth()

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setUnreadMessages([])
      return
    }

    try {
      const response = await getAdminMessages()
      const normalized = normalizeAdminPagePayload(response?.data)
      const all = normalized.items
      setUnreadMessages(all.filter((m) => m.read_at === null))
    } catch {
      /* Erreur silencieuse : on ne bloque pas l'interface */
    }
  }, [])

  /* Polling toutes les 30 secondes + appel immediat au montage */
  useEffect(() => {
    if (isLoading || !isAuthenticated || !accessToken) {
      setUnreadMessages([])
      return undefined
    }

    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [accessToken, isAuthenticated, isLoading, refresh])

  /* Mise a jour optimiste puis synchronisation avec le serveur */
  const markAsRead = useCallback(
    async (id) => {
      if (!isAuthenticated || !accessToken) {
        return
      }

      setUnreadMessages((prev) => prev.filter((m) => m.id !== id))
      try {
        await markMessageAsRead(id)
      } catch {
        /* En cas d'echec, on rafraichit pour retrouver l'etat reel */
        refresh()
      }
    },
    [accessToken, isAuthenticated, refresh]
  )

  return {
    unreadMessages,
    unreadCount: unreadMessages.length,
    markAsRead,
    refresh,
  }
}
