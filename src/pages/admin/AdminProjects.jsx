/* Page de gestion des projets admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import { getAdminProjects, deleteProject } from '../../services/projectService.js'

export default function AdminProjects() {
  const addToast = useAdminToast()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)

  const loadProjects = () => {
    setLoading(true)
    getAdminProjects()
      .then((res) => setProjects(res?.data || []))
      .catch(() => addToast('Erreur lors du chargement des projets.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(loadProjects, [])

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteProject(confirmId)
      addToast('Projet supprime avec succes.', 'success')
      loadProjects()
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
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
          <Link to="/admin/projets/nouveau">
            <Button variant="primary">
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Nouveau projet
            </Button>
          </Link>
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
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tags</th>
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
                      <div className="flex flex-wrap gap-1">
                        {(project.tags || []).slice(0, 2).map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </div>
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
                        <Link to={`/admin/projets/${project.id}`}>
                          <button
                            className="p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={`Modifier ${project.title}`}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        </Link>
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
