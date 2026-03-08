/* Page de gestion des competences admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PencilSquareIcon, TrashIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import { getAdminSkills, createSkill, updateSkill, deleteSkill } from '../../services/skillService.js'
import {
  isAdminEditorPopup,
  notifyAdminEditorSaved,
  openAdminEditorWindow,
  subscribeAdminEditorRefresh,
} from '../../utils/adminEditorWindow.js'

/* Formulaire inline pour une competence */
function SkillForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { name: '', category: 'Frontend', level: 80, sort_order: 0 }
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'level' || name === 'sort_order' ? Number(value) : value }))
  }

  const inputStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  return (
    <tr style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)' }}>
      <td className="px-4 py-2">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={inputStyle}
          placeholder="Nom"
          required
        />
      </td>
      <td className="px-4 py-2">
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={inputStyle}
        >
          <option>Frontend</option>
          <option>Backend</option>
          <option>Outils</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <input
            name="level"
            type="range"
            min="0"
            max="100"
            value={form.level}
            onChange={handleChange}
            className="flex-1"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <span className="text-xs w-8 text-right" style={{ color: 'var(--color-text-secondary)' }}>
            {form.level}%
          </span>
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onSave(form)}
            className="p-1.5 rounded-lg focus:outline-none"
            style={{ color: '#4ade80' }}
            aria-label="Valider"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg focus:outline-none"
            style={{ color: '#f87171' }}
            aria-label="Annuler"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function AdminSkills() {
  const addToast = useAdminToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [grouped, setGrouped] = useState({})
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const editorParam = searchParams.get('editor')

  const loadSkills = () => {
    setLoading(true)
    getAdminSkills()
      .then((res) => setGrouped(res?.data || {}))
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(loadSkills, [])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'skills' || payload?.entity === 'global') {
        loadSkills()
      }
    })
  }, [])

  /**
   * Ferme l'editeur popup ou revient a l'etat liste.
   * @returns {void}
   */
  const closeEditorOrBack = () => {
    if (isAdminEditorPopup()) {
      window.close()
      if (!window.closed) {
        navigate('/admin/competences')
      }
      return
    }

    if (editorParam) {
      navigate('/admin/competences', { replace: true })
    }
    setShowAdd(false)
    setEditingId(null)
  }

  /**
   * Ouvre l'editeur de competences dans une popup dediee.
   * @param {'new' | number} target Cible a editer.
   * @param {() => void} fallback Action locale si popup bloquee.
   * @returns {void}
   */
  const openSkillEditor = (target, fallback) => {
    if (isAdminEditorPopup()) {
      fallback()
      return
    }

    const path =
      target === 'new'
        ? '/admin/competences?editor=new'
        : `/admin/competences?editor=${target}`

    const popup = openAdminEditorWindow(path, {
      windowName: 'portfolio-admin-skill-editor',
      width: 1200,
      height: 880,
    })

    if (!popup) {
      fallback()
    }
  }

  useEffect(() => {
    if (!editorParam) return

    if (editorParam === 'new') {
      setEditingId(null)
      setShowAdd(true)
      return
    }

    const parsedId = Number.parseInt(editorParam, 10)
    if (Number.isInteger(parsedId) && parsedId > 0) {
      setShowAdd(false)
      setEditingId(parsedId)
    }
  }, [editorParam])

  const handleAdd = async (form) => {
    try {
      await createSkill(form)
      addToast('Competence ajoutee.', 'success')
      notifyAdminEditorSaved('skills')
      if (isAdminEditorPopup()) {
        closeEditorOrBack()
        return
      }
      closeEditorOrBack()
      loadSkills()
    } catch (err) {
      addToast(err.message || 'Erreur.', 'error')
    }
  }

  const handleUpdate = async (id, form) => {
    try {
      await updateSkill(id, form)
      addToast('Competence mise a jour.', 'success')
      notifyAdminEditorSaved('skills')
      if (isAdminEditorPopup()) {
        closeEditorOrBack()
        return
      }
      closeEditorOrBack()
      loadSkills()
    } catch (err) {
      addToast(err.message || 'Erreur.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteSkill(confirmId)
      addToast('Competence supprimee.', 'success')
      notifyAdminEditorSaved('skills')
      loadSkills()
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  /* Aplatissement des competences pour la liste */
  const allSkills = Object.values(grouped).flat()

  return (
    <>
      <Helmet>
        <title>Competences - Administration</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Competences
          </h1>
          <Button
            variant="primary"
            onClick={() =>
              openSkillEditor('new', () => {
                setEditingId(null)
                setShowAdd(true)
              })
            }
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
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
                  <th className="text-left px-4 py-3 font-medium">Nom</th>
                  <th className="text-left px-4 py-3 font-medium">Categorie</th>
                  <th className="text-left px-4 py-3 font-medium">Niveau</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {showAdd && (
                  <SkillForm
                    onSave={handleAdd}
                    onCancel={closeEditorOrBack}
                  />
                )}
                {allSkills.map((skill, i) =>
                  editingId === skill.id ? (
                    <SkillForm
                      key={skill.id}
                      initial={skill}
                      onSave={(form) => handleUpdate(skill.id, form)}
                      onCancel={closeEditorOrBack}
                    />
                  ) : (
                    <tr
                      key={skill.id}
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
                        {skill.name}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {skill.category}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 flex-1 rounded-full overflow-hidden max-w-24"
                            style={{ backgroundColor: 'var(--color-border)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${skill.level}%`,
                                backgroundColor: 'var(--color-accent)',
                              }}
                            />
                          </div>
                          <span
                            className="text-xs w-8"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {skill.level}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              openSkillEditor(skill.id, () => {
                                setShowAdd(false)
                                setEditingId(skill.id)
                              })
                            }
                            className="p-1.5 rounded-lg transition-colors focus:outline-none"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={`Modifier ${skill.name}`}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmId(skill.id)}
                            className="p-1.5 rounded-lg transition-colors focus:outline-none"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={`Supprimer ${skill.name}`}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer la competence"
        message="Cette competence sera definitivement supprimee."
      />
    </>
  )
}
