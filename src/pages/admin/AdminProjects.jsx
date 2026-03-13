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

  const publishedOnPage = projects.filter((project) => project.published).length
  const featuredOnPage = projects.filter((project) => project.featured).length

  return (
    <>
      <Helmet>
        <title>Projets - Administration</title>
      </Helmet>
      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-card) 90%, transparent), color-mix(in srgb, var(--color-accent-glow) 18%, transparent))',
            boxShadow: '0 30px 68px -46px color-mix(in srgb, var(--color-accent-glow) 28%, transparent)',
          }}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] xl:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                Admin studio
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Projets
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Gerer le catalogue, ouvrir l'editeur, importer des lots JSON et garder une lecture claire de la production en cours.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div
                  className="rounded-full border px-4 py-2 text-xs font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
                  }}
                >
                  {pagination.total || 0} projet(s)
                </div>
                <div
                  className="rounded-full border px-4 py-2 text-xs font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
                  }}
                >
                  {publishedOnPage} publie(s) sur cette vue
                </div>
                <div
                  className="rounded-full border px-4 py-2 text-xs font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
                  }}
                >
                  {featuredOnPage} mis en avant
                </div>
              </div>
            </div>

            <div
              className="rounded-[var(--ui-radius-xl)] border p-4"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 82%, transparent)',
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                Operations
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)', borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)' }}>
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
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : projects.length === 0 ? (
          <div
            className="rounded-[var(--ui-radius-2xl)] border p-6"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
            }}
          >
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Aucun projet pour le moment
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Cree un premier projet ou importe un fichier JSON pour alimenter le showcase.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {projects.map((project) => {
                const taxonomy = getProjectTaxonomy(project)
                const highlights = [
                  ...taxonomy.stack.slice(0, 1),
                  ...taxonomy.technologies.slice(0, 3),
                ]
                const chips = highlights.length > 0 ? highlights : getProjectDisplayTags(project, 3)

                return (
                  <div
                    key={project.id}
                    className="rounded-[var(--ui-radius-2xl)] border p-5"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {project.title}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className="rounded-full px-3 py-1 text-xs font-medium"
                            style={{
                              color: project.published ? '#4ade80' : '#f87171',
                              backgroundColor: project.published
                                ? 'rgba(74, 222, 128, 0.1)'
                                : 'rgba(248, 113, 113, 0.1)',
                            }}
                          >
                            {project.published ? 'Publie' : 'Brouillon'}
                          </span>
                          {project.featured && <Badge>Mis en avant</Badge>}
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmt(project.created_at)}
                      </span>
                    </div>

                    {chips.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {chips.map((chip) => (
                          <Badge key={`${project.id}-${chip}`}>{chip}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 flex items-center gap-2">
                      <Button variant="secondary" onClick={() => openProjectEditor(`/admin/projets/${project.id}`)} className="flex-1 justify-center">
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Modifier
                      </Button>
                      <button
                        onClick={() => setConfirmId(project.id)}
                        className="inline-flex h-[var(--ui-control-height)] w-[var(--ui-control-height)] items-center justify-center rounded-[var(--ui-radius-xl)] border focus:outline-none focus:ring-2 focus:ring-red-500"
                        style={{
                          color: 'var(--color-text-secondary)',
                          borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                        }}
                        aria-label={`Supprimer ${project.title}`}
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="hidden overflow-hidden rounded-[var(--ui-radius-2xl)] border lg:block"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 84%, transparent)',
              }}
            >
              <table className="w-full text-sm">
                <thead
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 86%, transparent)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <tr>
                    <th className="text-left px-5 py-4 font-medium">Titre</th>
                    <th className="text-left px-5 py-4 font-medium">Stack / Tech</th>
                    <th className="text-left px-5 py-4 font-medium">Publie</th>
                    <th className="text-left px-5 py-4 font-medium">Date</th>
                    <th className="text-right px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, index) => (
                    <tr
                      key={project.id}
                      style={{
                        backgroundColor:
                          index % 2 === 0
                            ? 'color-mix(in srgb, var(--color-bg-card) 82%, transparent)'
                            : 'color-mix(in srgb, var(--color-bg-secondary) 66%, transparent)',
                        borderTop: '1px solid color-mix(in srgb, var(--color-border) 62%, transparent)',
                      }}
                    >
                      <td className="px-5 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {project.title}
                      </td>
                      <td className="px-5 py-4">
                        {(() => {
                          const taxonomy = getProjectTaxonomy(project)
                          const highlights = [
                            ...taxonomy.stack.slice(0, 1),
                            ...taxonomy.technologies.slice(0, 2),
                          ]
                          const chips = highlights.length > 0 ? highlights : getProjectDisplayTags(project, 2)
                          return (
                            <div className="flex flex-wrap gap-1.5">
                              {chips.map((chip) => (
                                <Badge key={`${project.id}-${chip}`}>{chip}</Badge>
                              ))}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-medium"
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
                      <td className="px-5 py-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {fmt(project.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openProjectEditor(`/admin/projets/${project.id}`)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                            style={{
                              color: 'var(--color-text-secondary)',
                              borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                            }}
                            aria-label={`Modifier ${project.title}`}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmId(project.id)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            style={{
                              color: 'var(--color-text-secondary)',
                              borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                            }}
                            aria-label={`Supprimer ${project.title}`}
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
          </>
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
