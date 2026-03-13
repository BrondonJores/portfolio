/* Page de gestion des temoignages admin */
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChatBubbleBottomCenterTextIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import {
  isAdminEditorPopup,
  notifyAdminEditorSaved,
  openAdminEditorWindow,
  subscribeAdminEditorRefresh,
} from '../../utils/adminEditorWindow.js'
import {
  getAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '../../services/testimonialService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'

const EMPTY = { author_name: '', author_role: '', content: '', visible: true }
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

/**
 * Retourne le style visuel d'un badge visible/non visible.
 * @param {boolean} visible Visibilite publique.
 * @returns {{color:string, backgroundColor:string, borderColor:string}} Styles badge.
 */
function getVisibilityTone(visible) {
  if (visible) {
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

/* Formulaire de temoignage dans un modal */
function TestimonialModal({ isOpen, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY)

  useEffect(() => {
    setForm(initial || EMPTY)
  }, [initial])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const visibilityTone = getVisibilityTone(form.visible)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'Modifier le temoignage' : 'Nouveau temoignage'}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave(form)
        }}
        className="space-y-5"
      >
        <section className="rounded-[24px] border p-4" style={metricCardStyle}>
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="tm-author"
                className="block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Auteur <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                id="tm-author"
                name="author_name"
                type="text"
                value={form.author_name}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={inputStyle}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tm-role"
                className="block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Role
              </label>
              <input
                id="tm-role"
                name="author_role"
                type="text"
                value={form.author_role}
                onChange={handleChange}
                className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border p-4" style={metricCardStyle}>
          <div className="space-y-2">
            <label
              htmlFor="tm-content"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Contenu <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              id="tm-content"
              name="content"
              value={form.content}
              onChange={handleChange}
              required
              rows={5}
              className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
              style={inputStyle}
            />
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Garde un ton humain et suffisamment court pour bien vivre sur la home.
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border p-4" style={metricCardStyle}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Visibilite publique
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Controle si le temoignage peut etre affiche sur le site.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3">
              <span
                className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={visibilityTone}
              >
                {form.visible ? 'Visible' : 'Masque'}
              </span>
              <input
                name="visible"
                type="checkbox"
                checked={form.visible}
                onChange={handleChange}
                style={{ accentColor: 'var(--color-accent)' }}
              />
            </label>
          </div>
        </section>

        <div className="rounded-[24px] border p-4" style={metricCardStyle}>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
            Apercu
          </p>
          <blockquote className="mt-3 text-sm leading-7" style={{ color: 'var(--color-text-primary)' }}>
            {form.content?.trim() || 'Le contenu du temoignage apparaitra ici.'}
          </blockquote>
          <p className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {form.author_name?.trim() || 'Auteur'}{form.author_role?.trim() ? `, ${form.author_role}` : ''}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminTestimonials() {
  const addToast = useAdminToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [testimonials, setTestimonials] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const editorParam = searchParams.get('editor')

  const loadTestimonials = (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    getAdminTestimonials({ limit: PAGE_LIMIT, offset })
      .then((res) => {
        const normalized = normalizeAdminPagePayload(res?.data, {
          defaultLimit: PAGE_LIMIT,
          requestedOffset: offset,
        })
        setTestimonials(normalized.items)
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
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTestimonials(page)
  }, [page])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'testimonials' || payload?.entity === 'global') {
        loadTestimonials(page)
      }
    })
  }, [page])

  useEffect(() => {
    if (!editorParam) return

    if (editorParam === 'new') {
      setEditItem(null)
      setShowModal(true)
      return
    }

    const parsedId = Number.parseInt(editorParam, 10)
    if (!Number.isInteger(parsedId) || parsedId <= 0) return

    const target = testimonials.find((item) => Number(item.id) === parsedId)
    if (target) {
      setEditItem(target)
      setShowModal(true)
    }
  }, [editorParam, testimonials])

  /**
   * Ferme l'editeur popup ou revient a l'etat liste.
   * @returns {void}
   */
  const closeEditorOrBack = () => {
    if (isAdminEditorPopup()) {
      window.close()
      if (!window.closed) {
        navigate('/admin/temoignages')
      }
      return
    }

    if (editorParam) {
      navigate('/admin/temoignages', { replace: true })
    }
    setShowModal(false)
    setEditItem(null)
  }

  /**
   * Ouvre l'editeur temoignage dans une popup dediee.
   * @param {'new' | number} target Cible.
   * @param {() => void} fallback Action locale si popup bloquee.
   * @returns {void}
   */
  const openTestimonialEditor = (target, fallback) => {
    if (isAdminEditorPopup()) {
      fallback()
      return
    }

    const path = target === 'new' ? '/admin/temoignages?editor=new' : `/admin/temoignages?editor=${target}`

    const popup = openAdminEditorWindow(path, {
      windowName: 'portfolio-admin-testimonial-editor',
      width: 1180,
      height: 860,
    })

    if (!popup) {
      fallback()
    }
  }

  const handleSave = async (form) => {
    try {
      if (editItem) {
        await updateTestimonial(editItem.id, form)
        addToast('Temoignage mis a jour.', 'success')
      } else {
        await createTestimonial(form)
        addToast('Temoignage cree.', 'success')
      }
      notifyAdminEditorSaved('testimonials')
      if (isAdminEditorPopup()) {
        closeEditorOrBack()
        return
      }
      closeEditorOrBack()
      loadTestimonials(page)
    } catch (err) {
      addToast(err.message || 'Erreur.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteTestimonial(confirmId)
      addToast('Temoignage supprime.', 'success')
      notifyAdminEditorSaved('testimonials')
      loadTestimonials(page)
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  const openEdit = (item) => {
    openTestimonialEditor(item.id, () => {
      setEditItem(item)
      setShowModal(true)
    })
  }

  const openNew = () => {
    openTestimonialEditor('new', () => {
      setEditItem(null)
      setShowModal(true)
    })
  }

  const visibleCount = useMemo(
    () => testimonials.filter((testimonial) => testimonial?.visible).length,
    [testimonials]
  )
  const hiddenCount = useMemo(
    () => testimonials.filter((testimonial) => !testimonial?.visible).length,
    [testimonials]
  )

  return (
    <>
      <Helmet>
        <title>Temoignages - Administration</title>
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
                <ChatBubbleBottomCenterTextIcon className="h-4 w-4" aria-hidden="true" />
                Social proof
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  Des temoignages mieux calibres pour le site et pour l admin.
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Gere les citations, leur visibilite et leur qualite editoriale dans un espace plus
                  dense, plus clair et plus agreable a relire.
                </p>
              </div>
            </div>

            <Button variant="primary" onClick={openNew} className="w-full sm:w-auto">
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Ajouter
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Visibles', value: visibleCount },
              { label: 'Masques', value: hiddenCount },
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

        {loading ? (
          <div className="flex justify-center rounded-[28px] border py-20" style={panelStyle}>
            <Spinner size="lg" />
          </div>
        ) : testimonials.length === 0 ? (
          <section className="rounded-[28px] border px-6 py-14 text-center" style={panelStyle}>
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Aucun temoignage.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Ajoute une premiere citation pour alimenter la preuve sociale du portfolio.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="primary" onClick={openNew}>
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Ajouter un temoignage
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {testimonials.map((testimonial) => {
                const visibilityTone = getVisibilityTone(Boolean(testimonial.visible))

                return (
                  <article key={testimonial.id} className="rounded-[26px] border p-4" style={panelStyle}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {testimonial.author_name}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {testimonial.author_role || 'Role non renseigne'}
                        </p>
                      </div>
                      <span
                        className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        style={visibilityTone}
                      >
                        {testimonial.visible ? 'Visible' : 'Masque'}
                      </span>
                    </div>

                    <blockquote className="mt-4 line-clamp-4 text-sm leading-7" style={{ color: 'var(--color-text-primary)' }}>
                      {testimonial.content}
                    </blockquote>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openEdit(testimonial)} className="flex-1">
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Modifier
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setConfirmId(testimonial.id)} className="w-full sm:w-auto">
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
                className="grid grid-cols-[minmax(0,1fr)_220px_140px_180px] gap-4 border-b px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                }}
              >
                <span>Auteur</span>
                <span>Role</span>
                <span>Visibilite</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                {testimonials.map((testimonial) => {
                  const visibilityTone = getVisibilityTone(Boolean(testimonial.visible))

                  return (
                    <div
                      key={testimonial.id}
                      className="grid grid-cols-[minmax(0,1fr)_220px_140px_180px] items-center gap-4 px-6 py-5 transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 72%, transparent)' }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {testimonial.author_name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {testimonial.content}
                        </p>
                      </div>

                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {testimonial.author_role || '-'}
                      </p>

                      <span
                        className="inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                        style={visibilityTone}
                      >
                        {testimonial.visible ? 'Visible' : 'Masque'}
                      </span>

                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => openEdit(testimonial)}>
                          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                          Modifier
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setConfirmId(testimonial.id)}>
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

      <TestimonialModal
        isOpen={showModal}
        initial={editItem}
        onSave={handleSave}
        onClose={closeEditorOrBack}
      />

      <ConfirmModal
        isOpen={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer le temoignage"
        message="Ce temoignage sera definitivement supprime."
      />
    </>
  )
}
