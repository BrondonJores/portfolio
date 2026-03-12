import { useEffect, useMemo, useState } from 'react'
import { getSkills } from '../services/skillService.js'

function toSkillGroupItems(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((skill) => String(skill?.name || '').trim())
    .filter(Boolean)
}

/**
 * Charge les competences publiques et expose les formes utiles a la vue.
 * @returns {{groupedSkills:Record<string, Array<object>>, skillGroups:Array<object>, loading:boolean}} Etat de chargement.
 */
export function usePublicSkills() {
  const [groupedSkills, setGroupedSkills] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true
    setLoading(true)

    getSkills()
      .then((response) => {
        if (!isActive) {
          return
        }

        setGroupedSkills(response?.data && typeof response.data === 'object' ? response.data : {})
      })
      .catch(() => {
        if (isActive) {
          setGroupedSkills({})
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const skillGroups = useMemo(
    () =>
      Object.entries(groupedSkills).map(([category, skills]) => ({
        category,
        items: toSkillGroupItems(skills),
      })),
    [groupedSkills]
  )

  return {
    groupedSkills,
    skillGroups,
    loading,
  }
}
