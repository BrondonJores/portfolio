/* Page de gestion des certifications admin. */
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  LinkIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ImageUploader from '../../components/ui/ImageUploader.jsx'
import DocumentUploader from '../../components/ui/DocumentUploader.jsx'
import {
  getAdminCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
} from '../../services/certificationService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'

const PAGE_LIMIT = 12

const EMPTY_FORM = {
  title: '',
  issuer: '',
  description: '',
  issued_at: '',
  expires_at: '',
  credential_id: '',
  credential_url: '',
  image_url: '',
  badge_image_url: '',
  pdf_url: '',
  badges: [],
  sort_order: 0,
  published: true,
}

/**
 * Normalise une liste de badges.
 * @param {unknown} value Valeur brute.
 * @returns {string[]} Tableau nettoye.
 */
function normalizeBadges(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((entry) => String(entry || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 24)
  }

  if (typeof value === 'string') {
    return normalizeBadges(value.split(','))
  }

  return []
}

/**
 * Normalise une date vers le format input date.
 * @param {unknown} value Valeur brute.
 * @returns {string} Date YYYY-MM-DD ou vide.
 */
function toDateInputValue(value) {
  if (!value) {
    return ''
  }
  return String(value).slice(0, 10)
}

/**
 * Formate les donnees API en valeurs de formulaire.
 * @param {object | null | undefined} source Source.
 * @returns {typeof EMPTY_FORM} Form normalise.
 */
function toFormValues(source) {
  const raw = source || EMPTY_FORM
  return {
    title: String(raw.title || ''),
    issuer: String(raw.issuer || ''),
    description: String(raw.description || ''),
    issued_at: toDateInputValue(raw.issued_at),
    expires_at: toDateInputValue(raw.expires_at),
    credential_id: String(raw.credential_id || ''),
    credential_url: String(raw.credential_url || ''),
    image_url: String(raw.image_url || ''),
    badge_image_url: String(raw.badge_image_url || ''),
    pdf_url: String(raw.pdf_url || ''),
    badges: normalizeBadges(raw.badges),
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : 0,
    published: raw.published !== false,
  }
}

/**
 * Formulaire de creation/edition d'une certification.
 * @param {{initial?: object, saving?: boolean, onSave: (payload: object) => Promise<void> | void, onCancel: () => void}} props Props.
 * @returns {JSX.Element} Formulaire.
 */
function CertificationForm({ initial, saving = false, onSave, onCancel }) {
  const [form, setForm] = useState(() => toFormValues(initial))
  const [badgeInput, setBadgeInput] = useState('')

  useEffect(() => {
    setForm(toFormValues(initial))
    setBadgeInput('')
  }, [initial])

  const inputStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  /**
   * Met a jour un champ texte/checkbox.
   * @param {import('react').ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} event Evenement input.
   * @returns {void}
   */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'sort_order' ? Number(value) : value,
    }))
  }

  const addBadge = () => {
    const next = badgeInput.trim()
    if (!next) return
    setForm((prev) => ({ ...prev, badges: normalizeBadges([...(prev.badges || []), next]) }))
    setBadgeInput('')
  }

  /**
   * Supprime un badge depuis la liste.
   * @param {string} badge Badge cible.
   * @returns {void}
   */
  const removeBadge = (badge) => {
    setForm((prev) => ({
      ...prev,
      badges: (prev.badges || []).filter((entry) => entry !== badge),
    }))
  }

  /**
   * Soumet le formulaire parent.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evenement submit.
   * @returns {void}
   */
  const handleSubmit = (event) => {
    event.preventDefault()
    void onSave({
      ...form,
      badges: normalizeBadges(form.badges),
      issued_at: form.issued_at || null,
      expires_at: form.expires_at || null,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border p-4 md:p-5 space-y-5"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Titre <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
            placeholder="Ex: AWS Certified Solutions Architect"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Organisme <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            name="issuer"
            value={form.issuer}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
            placeholder="Ex: Amazon Web Services"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Description
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
          style={inputStyle}
          placeholder="Resume rapide de la certification..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Date d'obtention
          </label>
          <input
            type="date"
            name="issued_at"
            value={form.issued_at}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Date d'expiration
          </label>
          <input
            type="date"
            name="expires_at"
            value={form.expires_at}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            ID credential
          </label>
          <input
            name="credential_id"
            value={form.credential_id}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
            placeholder="Ex: ABC-123"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Ordre d'affichage
          </label>
          <input
            type="number"
            min="0"
            step="1"
            name="sort_order"
            value={form.sort_order}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Lien credential
          </label>
          <input
            type="url"
            name="credential_url"
            value={form.credential_url}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
            placeholder="https://..."
          />
        </div>
        <div className="flex items-center">
          <label className="inline-flex items-center gap-2 mt-6 cursor-pointer">
            <input
              type="checkbox"
              name="published"
              checked={form.published}
              onChange={handleChange}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Afficher cette certification publiquement
            </span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Badges texte
        </label>
        <div className="flex gap-2">
          <input
            value={badgeInput}
            onChange={(event) => setBadgeInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addBadge()
              }
            }}
            className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
            placeholder="Ex: Cloud, Security, Associate"
          />
          <Button type="button" variant="secondary" onClick={addBadge}>
            <PlusIcon className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
        {form.badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.badges.map((badge) => (
              <span key={badge} className="inline-flex items-center gap-1">
                <Badge>{badge}</Badge>
                <button
                  type="button"
                  onClick={() => removeBadge(badge)}
                  className="p-1 rounded"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label={`Supprimer le badge ${badge}`}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ImageUploader
          label="Image de certification"
          value={form.image_url}
          onUpload={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
        />
        <ImageUploader
          label="Image du badge"
          value={form.badge_image_url}
          onUpload={(url) => setForm((prev) => ({ ...prev, badge_image_url: url }))}
        />
        <DocumentUploader
          label="Document PDF"
          value={form.pdf_url}
          onUpload={(url) => setForm((prev) => ({ ...prev, pdf_url: url }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? <Spinner size="sm" /> : <CheckIcon className="h-4 w-4" />}
          {initial?.id ? 'Mettre a jour' : 'Ajouter'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

export default function AdminCertifications() {
  const addToast = useAdminToast()
  const [certifications, setCertifications] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  /**
   * Charge les certifications admin paginees.
   * @param {number} [targetPage=page] Page cible.
   * @returns {Promise<void>} Promise resolue apres chargement.
   */
  const loadCertifications = async (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    try {
      const response = await getAdminCertifications({ limit: PAGE_LIMIT, offset })
      const normalized = normalizeAdminPagePayload(response?.data, {
        defaultLimit: PAGE_LIMIT,
        requestedOffset: offset,
      })

      setCertifications(
        normalized.items.map((entry) => ({
          ...entry,
          badges: normalizeBadges(entry.badges),
        }))
      )
      setPagination({
        total: normalized.total,
        limit: normalized.limit,
        offset: normalized.offset,
      })

      const pages = Math.max(1, Math.ceil(normalized.total / normalized.limit))
      if (targetPage > pages && normalized.total > 0) {
        setPage(pages)
      }
    } catch (error) {
      addToast(error.message || 'Erreur lors du chargement des certifications.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCertifications(page)
  }, [page])

  const editingItem = useMemo(
    () => certifications.find((entry) => Number(entry.id) === Number(editingId)) || null,
    [certifications, editingId]
  )

  const closeEditor = () => {
    setShowAdd(false)
    setEditingId(null)
  }

  /**
   * Cree une certification.
   * @param {object} payload Payload formulaire.
   * @returns {Promise<void>} Promise resolue apres creation.
   */
  const handleCreate = async (payload) => {
    setSaving(true)
    try {
      await createCertification(payload)
      addToast('Certification ajoutee.', 'success')
      closeEditor()
      await loadCertifications(page)
    } catch (error) {
      addToast(error.message || "Erreur lors de l'ajout.", 'error')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Met a jour une certification.
   * @param {object} payload Payload formulaire.
   * @returns {Promise<void>} Promise resolue apres mise a jour.
   */
  const handleUpdate = async (payload) => {
    if (!editingId) return
    setSaving(true)
    try {
      await updateCertification(editingId, payload)
      addToast('Certification mise a jour.', 'success')
      closeEditor()
      await loadCertifications(page)
    } catch (error) {
      addToast(error.message || 'Erreur lors de la mise a jour.', 'error')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Supprime une certification.
   * @returns {Promise<void>} Promise resolue apres suppression.
   */
  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteCertification(confirmId)
      addToast('Certification supprimee.', 'success')
      await loadCertifications(page)
    } catch (error) {
      addToast(error.message || 'Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString('fr-FR') : '-')

  return (
    <>
      <Helmet>
        <title>Certifications - Administration</title>
      </Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Certifications
          </h1>
          <Button
            variant="primary"
            onClick={() => {
              setEditingId(null)
              setShowAdd((prev) => !prev)
            }}
            disabled={saving}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>

        {showAdd && (
          <CertificationForm
            onSave={handleCreate}
            onCancel={closeEditor}
            saving={saving}
          />
        )}

        {editingItem && (
          <CertificationForm
            initial={editingItem}
            onSave={handleUpdate}
            onCancel={closeEditor}
            saving={saving}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : certifications.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Aucune certification enregistree.
          </p>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Certification</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Dates</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Badges</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Media</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor:
                        index % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)',
                      borderTop: `1px solid var(--color-border)`,
                    }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {item.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.issuer}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs">
                        Obtenue: {formatDate(item.issued_at)}
                      </p>
                      <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs">
                        Expire: {formatDate(item.expires_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(item.badges || []).slice(0, 2).map((badge) => (
                          <Badge key={`${item.id}-${badge}`}>{badge}</Badge>
                        ))}
                        {(item.badges || []).length > 2 && <Badge>+{item.badges.length - 2}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {item.image_url && <PhotoIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />}
                        {item.credential_url && <LinkIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />}
                        {item.pdf_url && <DocumentTextIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />}
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.published ? 'Publie' : 'Brouillon'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowAdd(false)
                            setEditingId(item.id)
                          }}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Modifier ${item.title}`}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.color = 'var(--color-accent)'
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.color = 'var(--color-text-secondary)'
                          }}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmId(item.id)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Supprimer ${item.title}`}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.color = '#f87171'
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.color = 'var(--color-text-secondary)'
                          }}
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
        isOpen={Boolean(confirmId)}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer la certification"
        message="Cette action est irreversible."
      />
    </>
  )
}
