import { useEffect, useState } from 'react'
import { getArticles } from '../services/articleService.js'

function getRequestKey(params) {
  if (!params || typeof params !== 'object') {
    return ''
  }

  try {
    return JSON.stringify(params)
  } catch {
    return ''
  }
}

/**
 * Charge une liste publique d'articles.
 * @param {object} [params] Parametres de filtrage/pagination.
 * @returns {{articles:Array<object>, pagination:object|null, loading:boolean}} Etat de chargement.
 */
export function usePublicArticles(params) {
  const requestKey = getRequestKey(params)
  const [articles, setArticles] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true
    setLoading(true)

    const requestParams = requestKey ? JSON.parse(requestKey) : undefined
    getArticles(requestParams)
      .then((response) => {
        if (!isActive) {
          return
        }

        setArticles(Array.isArray(response?.data) ? response.data : [])
        setPagination(response?.pagination || null)
      })
      .catch(() => {
        if (!isActive) {
          return
        }

        setArticles([])
        setPagination(null)
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [requestKey])

  return {
    articles,
    pagination,
    loading,
  }
}
