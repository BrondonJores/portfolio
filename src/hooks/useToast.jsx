/* Hook de gestion des notifications toast */
import { useState, useCallback } from 'react'

let nextId = 0

/**
 * Gere une liste de toasts avec ajout et suppression automatique.
 * Chaque toast disparait apres 3 secondes.
 */
export function useToast() {
  const [toasts, setToasts] = useState([])

  /* Suppression manuelle d'un toast par son identifiant */
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /* Ajout d'un toast avec disparition automatique apres 3 secondes */
  const addToast = useCallback(
    (message, type = 'info') => {
      const id = ++nextId
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => removeToast(id), 3000)
    },
    [removeToast]
  )

  return { toasts, addToast, removeToast }
}
