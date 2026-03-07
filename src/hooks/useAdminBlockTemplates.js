/* Hook de chargement des templates de blocs admin, avec fallback local. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAdminBlockTemplates } from '../services/blockTemplateService.js'

/**
 * Transforme un template API en structure attendue par BlockEditor.
 * @param {object} template Template brut API.
 * @returns {{id: string, label: string, description: string, blocks: Array<object>} | null} Template normalise.
 */
function mapTemplateToEditorShape(template) {
  if (!template || typeof template !== 'object') return null
  if (!Array.isArray(template.blocks) || template.blocks.length === 0) return null

  return {
    id: `db-template-${template.id}`,
    label: template.name || `Template ${template.id}`,
    description: template.description || '',
    blocks: template.blocks,
  }
}

/**
 * Charge les templates DB puis les combine avec un fallback local.
 * @param {object} params Parametres du hook.
 * @param {'article'|'project'|'newsletter'|'all'} params.context Contexte de filtrage.
 * @param {Array<object>} [params.fallbackTemplates=[]] Templates locaux de secours.
 * @returns {{templates: Array<object>, loading: boolean, reload: () => Promise<void>}} Etat de chargement templates.
 */
export default function useAdminBlockTemplates({ context, fallbackTemplates = [] }) {
  const [remoteTemplates, setRemoteTemplates] = useState([])
  const [loading, setLoading] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getAdminBlockTemplates(context ? { context } : undefined)
      setRemoteTemplates(Array.isArray(response?.data) ? response.data : [])
    } catch {
      setRemoteTemplates([])
    } finally {
      setLoading(false)
    }
  }, [context])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const templates = useMemo(() => {
    const normalizedRemote = remoteTemplates
      .map((template) => mapTemplateToEditorShape(template))
      .filter(Boolean)

    return [...fallbackTemplates, ...normalizedRemote]
  }, [fallbackTemplates, remoteTemplates])

  return {
    templates,
    loading,
    reload: loadTemplates,
  }
}
