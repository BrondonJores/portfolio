/* Formulaire de creation et d'edition d'article */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Badge from '../../components/ui/Badge.jsx'
import {
  getAdminArticles,
  createArticle,
  updateArticle,
} from '../../services/articleService.js'

/* Generation du slug cote client */
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
  excerpt: '',
  content: '',
  cover_image: '',
  published: false,
  tags: [],
}

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

export default function AdminArticleForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useAdminToast()
  const isEdit = !!id

  const [form, setForm] = useState(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getAdminArticles()
      .then((res) => {
        const article = (res?.data || []).find((a) => String(a.id) === String(id))
        if (article) {
          setForm({
            title: article.title || '',
            excerpt: article.excerpt || '',
            content: article.content || '',
            cover_image: article.cover_image || '',
            published: article.published || false,
            tags: article.tags || [],
          })
        }
      })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
    }
    setTagInput('')
  }

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
    if (!form.title.trim() || !form.content.trim()) {
      addToast('Le titre et le contenu sont obligatoires.', 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateArticle(id, form)
        addToast('Article mis a jour.', 'success')
      } else {
        await createArticle(form)
        addToast('Article cree avec succes.', 'success')
      }
      navigate('/admin/articles')
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
        <title>{isEdit ? "Modifier l'article" : 'Nouvel article'} - Administration</title>
      </Helmet>
      <div className="max-w-2xl">
        <h1
          className="text-2xl font-bold mb-8"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {isEdit ? "Modifier l'article" : 'Nouvel article'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Titre */}
          <div>
            <label
              htmlFor="af-title"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Titre <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              id="af-title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
              style={inputStyle}
            />
            {form.title && (
              <p
                className="text-xs mt-1 font-mono"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Slug : {slug}
              </p>
            )}
          </div>

          {/* Extrait */}
          <div>
            <label
              htmlFor="af-excerpt"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Extrait
            </label>
            <textarea
              id="af-excerpt"
              name="excerpt"
              value={form.excerpt}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-none"
              style={inputStyle}
            />
          </div>

          {/* Contenu */}
          <div>
            <label
              htmlFor="af-content"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Contenu (HTML) <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              id="af-content"
              name="content"
              value={form.content}
              onChange={handleChange}
              required
              rows={12}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all resize-y font-mono"
              style={{ ...inputStyle, fontFamily: 'JetBrains Mono Variable, monospace' }}
            />
          </div>

          {/* Image de couverture */}
          <div>
            <label
              htmlFor="af-cover"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Image de couverture (URL)
            </label>
            <input
              id="af-cover"
              name="cover_image"
              type="url"
              value={form.cover_image}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
              style={inputStyle}
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="af-tag"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Tags
            </label>
            <div className="flex gap-2">
              <input
                id="af-tag"
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

          {/* Publie */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              name="published"
              type="checkbox"
              checked={form.published}
              onChange={handleChange}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Publie
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : "Creer l'article"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/admin/articles')}
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
