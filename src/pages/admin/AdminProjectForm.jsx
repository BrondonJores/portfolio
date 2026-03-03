/* Formulaire de creation et d'edition de projet */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Badge from '../../components/ui/Badge.jsx'
import {
  getAdminProjects,
  createProject,
  updateProject,
} from '../../services/projectService.js'

/* Génération du slug cote client */
function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const EMPTY = {
  title: '',
  description: '',
  content: '',
  github_url: '',
  demo_url: '',
  image_url: '',
  featured: false,
  published: true,
  tags: [],
}

/* Style commun des inputs */
const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

export default function AdminProjectForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useAdminToast()
  const isEdit = !!id

  const [form, setForm] = useState(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  /* Chargement du projet en mode edition */
  useEffect(() => {
    if (!isEdit) return
    getAdminProjects()
      .then((res) => {
        const project = (res?.data || []).find((p) => String(p.id) === String(id))
        if (project) {
          setForm({
            title: project.title || '',
            description: project.description || '',
            content: project.content || '',
            github_url: project.github_url || '',
            demo_url: project.demo_url || '',
            image_url: project.image_url || '',
            featured: project.featured || false,
            published: project.published !== false,
            tags: project.tags || [],
          })
        }
      })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  /* Ajout d'un tag */
  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
    }
    setTagInput('')
  }

  /* Suppression d'un tag */
  const removeTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      addToast('Le titre est obligatoire.', 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateProject(id, form)
        addToast('Projet mis a jour.', 'success')
      } else {
        await createProject(form)
        addToast('Projet cree avec succes.', 'success')
      }
      navigate('/admin/projets')
    } catch (err) {
      addToast(err.message || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const slug = toSlug(form.title)

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Modifier le projet' : 'Nouveau projet'} - Administration</title>
      </Helmet>
      <div className="max-w-2xl">
        <h1
          className="text-2xl font-bold mb-8"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {isEdit ? 'Modifier le projet' : 'Nouveau projet'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Titre */}
          <div>
            <label
              htmlFor="pf-title"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Titre <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              id="pf-title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
              style={inputStyle}
            />
            {/* Slug en lecture seule */}
            {form.title && (
              <p
                className="text-xs mt-1 font-mono"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Slug : {slug}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="pf-desc"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Description
            </label>
            <textarea
              id="pf-desc"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-none"
              style={inputStyle}
            />
          </div>

          {/* Contenu */}
          <div>
            <label
              htmlFor="pf-content"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Contenu (HTML)
            </label>
            <textarea
              id="pf-content"
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={8}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-y font-mono"
              style={{ ...inputStyle, fontFamily: 'JetBrains Mono Variable, monospace' }}
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="pf-tag"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Tags
            </label>
            <div className="flex gap-2">
              <input
                id="pf-tag"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                style={inputStyle}
                placeholder="Appuyer sur Entree pour ajouter"
              />
              <Button type="button" variant="secondary" onClick={addTag}>
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1">
                    <Badge>{tag}</Badge>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-xs focus:outline-none"
                      style={{ color: 'var(--color-text-secondary)' }}
                      aria-label={`Supprimer le tag ${tag}`}
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pf-github"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                URL GitHub
              </label>
              <input
                id="pf-github"
                name="github_url"
                type="url"
                value={form.github_url}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                htmlFor="pf-demo"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                URL Demo
              </label>
              <input
                id="pf-demo"
                name="demo_url"
                type="url"
                value={form.demo_url}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label
              htmlFor="pf-image"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              URL de l&apos;image
            </label>
            <input
              id="pf-image"
              name="image_url"
              type="url"
              value={form.image_url}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
              style={inputStyle}
            />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                name="featured"
                type="checkbox"
                checked={form.featured}
                onChange={handleChange}
                className="rounded focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Mis en avant
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                name="published"
                type="checkbox"
                checked={form.published}
                onChange={handleChange}
                className="rounded focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Publie
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : 'Creer le projet'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/admin/projets')}
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
