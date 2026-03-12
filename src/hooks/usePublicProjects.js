import { useEffect, useState } from 'react'
import { getProjects } from '../services/projectService.js'

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
 * Charge une liste publique de projets avec pagination/facettes.
 * @param {object} [params] Parametres de filtrage/pagination.
 * @returns {{projects:Array<object>, pagination:object|null, facets:object, loading:boolean}} Etat de chargement.
 */
export function usePublicProjects(params) {
  const requestKey = getRequestKey(params)
  const [projects, setProjects] = useState([])
  const [pagination, setPagination] = useState(null)
  const [facets, setFacets] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true
    setLoading(true)

    const requestParams = requestKey ? JSON.parse(requestKey) : undefined
    getProjects(requestParams)
      .then((response) => {
        if (!isActive) {
          return
        }

        setProjects(Array.isArray(response?.data) ? response.data : [])
        setPagination(response?.pagination || null)
        setFacets(response?.facets && typeof response.facets === 'object' ? response.facets : {})
      })
      .catch(() => {
        if (!isActive) {
          return
        }

        setProjects([])
        setPagination(null)
        setFacets({})
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
    projects,
    pagination,
    facets,
    loading,
  }
}
