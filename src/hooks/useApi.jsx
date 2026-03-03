/* Hook generique pour les appels API avec gestion d'etat */
import { useState, useCallback } from 'react'

/**
 * Encapsule un appel de service avec les etats data, loading et error.
 * Accepte une fonction de service en parametre (principe d'inversion de dependances).
 */
export function useApi(serviceFn) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /* Reinitialisation de l'etat */
  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
  }, [])

  /* Execution de la fonction de service */
  const execute = useCallback(
    async (...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await serviceFn(...args)
        setData(result)
        return result
      } catch (err) {
        const message = err.message || 'Une erreur est survenue.'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [serviceFn]
  )

  return { data, loading, error, execute, reset }
}
