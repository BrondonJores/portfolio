/* Page de gestion des projets admin */
import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { PencilSquareIcon, TrashIcon, PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import { getAdminProjects, deleteProject, importAdminProjects } from '../../services/projectService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'
import { notifyAdminEditorSaved, openAdminEditorWindow, subscribeAdminEditorRefresh } from '../../utils/adminEditorWindow.js'
import { getProjectTaxonomy, getProjectDisplayTags } from '../../utils/projectTaxonomy.js'

const PAGE_LIMIT = 12

/**
 * Lit un fichier texte JSON cote navigateur.
 * @param {File} file Fichier selectionne.
 * @returns {Promise<string>} Contenu brut.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Impossible de lire le fichier JSON.'))
    reader.readAsText(file)
  })
}

/**
 * Normalise un payload d'import projets vers { projects: [...] }.
 * Accepte: tableau, objet { projects }, ou projet unique.
 * @param {unknown} parsed JSON parse.
 * @returns {{projects:Array<object>} | null} Payload normalise.
 */
function normalizeProjectImportPayload(parsed) {
  if (Array.isArray(parsed)) {
    return { projects: parsed }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  if (Array.isArray(parsed.projects)) {
    return { projects: parsed.projects }
  }

  if (parsed.title !== undefined || parsed.slug !== undefined) {
    return { projects: [parsed] }
  }

  return null
}

export default function AdminProjects() {
  const addToast = useAdminToast()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [projects, setProjects] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [replaceExistingImport, setReplaceExistingImport] = useState(false)

  const loadProjects = (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    getAdminProjects({ limit: PAGE_LIMIT, offset })
      .then((res) => {
        const normalized = normalizeAdminPagePayload(res?.data, {
          defaultLimit: PAGE_LIMIT,
          requestedOffset: offset,
        })
        setProjects(normalized.items)
        setPagination({
          total: normalized.total,
          limit: normalized.limit,
          offset: normalized.offset,
        })

        const pages = Math.max(1, Math.ceil(normalized.total / normalized.limit))
        if (targetPage > pages && normalized.total > 0) {
          setPage(pages)
        }
      })
      .catch(() => addToast('Erreur lors du chargement des projets.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProjects(page)
  }, [page])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'projects' || payload?.entity === 'global') {
        loadProjects(page)
      }
    })
  }, [page])

  /**
   * Ouvre l'editeur projet dans une fenetre dediee (fallback route locale).
   * @param {string} path Route cible.
   * @returns {void}
   */
  const openProjectEditor = (path) => {
    const popup = openAdminEditorWindow(path, { windowName: 'portfolio-admin-project-editor' })
    if (!popup) {
      navigate(path)
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteProject(confirmId)
      addToast('Projet supprime avec succes.', 'success')
      loadProjects(page)
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  /**
   * Ouvre le selecteur de fichier pour import JSON.
   * @returns {void}
   */
  const openImportPicker = () => {
    fileInputRef.current?.click()
  }

  /**
   * Importe des projets depuis un fichier JSON.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event Evenement de selection.
   * @returns {Promise<void>} Promise resolue apres import.
   */
  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    try {
      const rawText = await readFileAsText(file)
      const parsed = JSON.parse(rawText)
      const normalized = normalizeProjectImportPayload(parsed)

      if (!normalized || !Array.isArray(normalized.projects) || normalized.projects.length === 0) {
        addToast('Format JSON invalide. Utilise { "projects": [...] } ou un tableau.', 'error')
        return
      }

      const response = await importAdminProjects({
        projects: normalized.projects,
        replaceExisting: replaceExistingImport,
      })

      const summary = response?.data || {}
      await loadProjects(page)
      notifyAdminEditorSaved('projects')
      addToast(
        `Import termine: ${summary.created || 0} cree(s), ${summary.updated || 0} mis a jour, ${summary.skippedCount || 0} ignore(s).`,
        'success'
      )
    } catch (error) {
      addToast(error.message || "Erreur pendant l'import des projets.", 'error')
    } finally {
      setImporting(false)
    }
  }

  /* Formatage de la date */
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : '-'

  return (
    <>
      <Helmet>
        <title>Projets - Administration</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Projets
          </h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={replaceExistingImport}
                onChange={(event) => setReplaceExistingImport(event.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Remplacer les doublons
            </label>
            <Button variant="secondary" onClick={openImportPicker} disabled={importing}>
              {importing ? <Spinner size="sm" /> : <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />}
              Importer JSON
            </Button>
            <Button variant="primary" onClick={() => openProjectEditor('/admin/projets/nouveau')}>
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Nouveau projet
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : projects.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Aucun projet. Creez-en un.
          </p>
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <table className="w-full text-sm">
              <thead
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Titre</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Stack / Tech</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Publie</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project, i) => (
                  <tr
                    key={project.id}
                    style={{
                      backgroundColor:
                        i % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)',
                      borderTop: `1px solid var(--color-border)`,
                    }}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {project.title}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {(() => {
                        const taxonomy = getProjectTaxonomy(project)
                        const highlights = [
                          ...taxonomy.stack.slice(0, 1),
                          ...taxonomy.technologies.slice(0, 2),
                        ]
                        const chips = highlights.length > 0 ? highlights : getProjectDisplayTags(project, 2)
                        return (
                          <div className="flex flex-wrap gap-1">
                            {chips.map((chip) => (
                              <Badge key={`${project.id}-${chip}`}>{chip}</Badge>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          color: project.published ? '#4ade80' : '#f87171',
                          backgroundColor: project.published
                            ? 'rgba(74, 222, 128, 0.1)'
                            : 'rgba(248, 113, 113, 0.1)',
                        }}
                      >
                        {project.published ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 hidden lg:table-cell text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {fmt(project.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openProjectEditor(`/admin/projets/${project.id}`)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Modifier ${project.title}`}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmId(project.id)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Supprimer ${project.title}`}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <AdminPagination
            total={pagination.total}
            limit={pagination.limit}
            offset={pagination.offset}
            disabled={loading}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer le projet"
        message="Cette action est irreversible. Le projet sera definitivemet supprime."
      />
    </>
  )
}
