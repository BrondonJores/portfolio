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
  ShieldCheckIcon,
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

const panelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 78%, transparent)',
}

const metricCardStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
}

const inputStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
  color: 'var(--color-text-primary)',
}

const textInputClassName = 'w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'
const textareaClassName = `${textInputClassName} min-h-[120px] resize-y`

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
 * Formate une date pour l'admin.
 * @param {unknown} value Valeur brute.
 * @returns {string} Date lisible ou fallback.
 */
function formatDate(value) {
  if (!value) {
    return 'Non renseignee'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Non renseignee'
  }

  return date.toLocaleDateString('fr-FR')
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
 * Retourne le ton visuel du statut public.
 * @param {boolean} published Statut publication.
 * @returns {{color:string, backgroundColor:string, borderColor:string}} Styles badge.
 */
function getPublishedTone(published) {
  if (published) {
    return {
      color: '#4ade80',
      backgroundColor: 'rgba(74, 222, 128, 0.12)',
      borderColor: 'rgba(74, 222, 128, 0.28)',
    }
  }

  return {
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
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

  const publishedTone = getPublishedTone(form.published)

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-5 rounded-[30px] border p-5 md:p-6"
      style={panelStyle}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
            Credential editor
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--color-text-primary)' }}>
            {initial?.id ? 'Ajuster une certification existante' : 'Ajouter une nouvelle certification'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: 'var(--color-text-secondary)' }}>
            Cadre les metadonnees, les medias et les badges dans un panneau plus net pour garder
            une vraie qualite de presentation, meme cote admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]" style={publishedTone}>
            {form.published ? 'Publiee' : 'Brouillon'}
          </span>
          <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs" style={metricCardStyle}>
            {form.badges.length} badge{form.badges.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Titre <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className={textInputClassName}
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
            className={textInputClassName}
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
          className={textareaClassName}
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
            className={textInputClassName}
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
            className={textInputClassName}
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
            className={textInputClassName}
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
            className={textInputClassName}
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
            className={textInputClassName}
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
            className={`${textInputClassName} flex-1`}
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

  const publishedCount = useMemo(
    () => certifications.filter((item) => item?.published).length,
    [certifications]
  )
  const withPdfCount = useMemo(
    () => certifications.filter((item) => item?.pdf_url).length,
    [certifications]
  )

  return (
    <>
      <Helmet>
        <title>Certifications - Administration</title>
      </Helmet>

      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-[32px] border px-5 py-5 sm:px-6 sm:py-6"
          style={panelStyle}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span
                className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
                }}
              >
                <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
                Credentials vault
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  Des certifications mieux mises en scene et mieux pilotees.
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Gere les preuves de competence, leurs badges et leurs medias dans un espace plus net,
                  sans perdre la lisibilite des dates et du statut public.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                setEditingId(null)
                setShowAdd((prev) => !prev)
              }}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Ajouter
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Publiees', value: publishedCount },
              { label: 'Avec PDF', value: withPdfCount },
              { label: 'Total suivis', value: pagination.total },
            ].map((metric) => (
              <article key={metric.label} className="rounded-[24px] border px-4 py-4" style={metricCardStyle}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </section>

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
          <div className="flex justify-center rounded-[28px] border py-20" style={panelStyle}>
            <Spinner size="lg" />
          </div>
        ) : certifications.length === 0 ? (
          <section className="rounded-[28px] border px-6 py-14 text-center" style={panelStyle}>
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Aucune certification enregistree.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Ajoute ta premiere certification pour commencer a structurer ta preuve de competence.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                variant="primary"
                onClick={() => {
                  setEditingId(null)
                  setShowAdd(true)
                }}
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Ajouter une certification
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {certifications.map((item) => {
                const publishedTone = getPublishedTone(Boolean(item.published))

                return (
                  <article key={item.id} className="rounded-[26px] border p-4" style={panelStyle}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {item.title}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.issuer}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={publishedTone}>
                        {item.published ? 'Publiee' : 'Brouillon'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          Dates
                        </p>
                        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {formatDate(item.issued_at)}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Expire: {formatDate(item.expires_at)}
                        </p>
                      </div>
                      <div className="rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          Medias
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {item.image_url && <PhotoIcon className="h-4 w-4" />}
                          {item.credential_url && <LinkIcon className="h-4 w-4" />}
                          {item.pdf_url && <DocumentTextIcon className="h-4 w-4" />}
                          <span>{[item.image_url, item.credential_url, item.pdf_url].filter(Boolean).length} asset(s)</span>
                        </div>
                      </div>
                    </div>

                    {(item.badges || []).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(item.badges || []).slice(0, 4).map((badge) => (
                          <Badge key={`${item.id}-${badge}`}>{badge}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowAdd(false)
                          setEditingId(item.id)
                        }}
                        className="flex-1"
                      >
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Modifier
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setConfirmId(item.id)} className="w-full sm:w-auto">
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        Supprimer
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>

            <section className="hidden overflow-hidden rounded-[30px] border lg:block" style={panelStyle}>
              <div
                className="grid grid-cols-[minmax(0,1.1fr)_220px_220px_180px] gap-4 border-b px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                }}
              >
                <span>Certification</span>
                <span>Dates</span>
                <span>Medias et badges</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                {certifications.map((item) => {
                  const publishedTone = getPublishedTone(Boolean(item.published))

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1.1fr)_220px_220px_180px] items-center gap-4 px-6 py-5 transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 72%, transparent)' }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {item.issuer}
                            </p>
                          </div>
                          <span className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={publishedTone}>
                            {item.published ? 'Publiee' : 'Brouillon'}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <p>Obtenue: {formatDate(item.issued_at)}</p>
                        <p className="mt-1">Expire: {formatDate(item.expires_at)}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {item.image_url && <PhotoIcon className="h-4 w-4" />}
                          {item.credential_url && <LinkIcon className="h-4 w-4" />}
                          {item.pdf_url && <DocumentTextIcon className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(item.badges || []).slice(0, 3).map((badge) => (
                            <Badge key={`${item.id}-${badge}`}>{badge}</Badge>
                          ))}
                          {(item.badges || []).length > 3 && <Badge>+{item.badges.length - 3}</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setShowAdd(false)
                            setEditingId(item.id)
                          }}
                        >
                          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                          Modifier
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setConfirmId(item.id)}>
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <div className="pt-1">
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
