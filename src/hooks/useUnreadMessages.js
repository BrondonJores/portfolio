/* Hook de polling des messages non lus pour l'espace admin */
import { useState, useEffect, useCallback } from 'react'
import { getAdminMessages, markMessageAsRead } from '../services/messageService.js'

const POLL_INTERVAL = 30_000 /* 30 secondes */

/**
 * Recupere et met a jour periodiquement les messages non lus.
 * Expose : { unreadMessages, unreadCount, markAsRead, refresh }
 */
export function useUnreadMessages() {
  const [unreadMessages, setUnreadMessages] = useState([])

  const refresh = useCallback(async () => {
    try {
      const response = await getAdminMessages()
      const all = response?.data ?? []
      setUnreadMessages(all.filter((m) => m.read_at === null))
    } catch {
      /* Erreur silencieuse : on ne bloque pas l'interface */
    }
  }, [])

  /* Polling toutes les 30 secondes + appel immediat au montage */
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [refresh])

  /* Mise a jour optimiste puis synchronisation avec le serveur */
  const markAsRead = useCallback(
    async (id) => {
      setUnreadMessages((prev) => prev.filter((m) => m.id !== id))
      try {
        await markMessageAsRead(id)
      } catch {
        /* En cas d'echec, on rafraichit pour retrouver l'etat reel */
        refresh()
      }
    },
    [refresh]
  )

  return {
    unreadMessages,
    unreadCount: unreadMessages.length,
    markAsRead,
    refresh,
  }
}
