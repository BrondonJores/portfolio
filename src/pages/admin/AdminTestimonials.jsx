/* Page de gestion des temoignages admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import {
  getAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '../../services/testimonialService.js'

const EMPTY = { author_name: '', author_role: '', content: '', visible: true }

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

/* Formulaire de temoignage dans un modal */
function TestimonialModal({ isOpen, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY)

  useEffect(() => {
    setForm(initial || EMPTY)
  }, [initial])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'Modifier le temoignage' : 'Nouveau temoignage'}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="tm-author"
            className="block text-sm font-medium mb-1"
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
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            htmlFor="tm-role"
            className="block text-sm font-medium mb-1"
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
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            htmlFor="tm-content"
            className="block text-sm font-medium mb-1"
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
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
            style={inputStyle}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            name="visible"
            type="checkbox"
            checked={form.visible}
            onChange={handleChange}
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Visible publiquement
          </span>
        </label>
        <div className="flex items-center justify-end gap-3 pt-2">
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
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  const loadTestimonials = () => {
    setLoading(true)
    getAdminTestimonials()
      .then((res) => setTestimonials(res?.data || []))
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(loadTestimonials, [])

  const handleSave = async (form) => {
    try {
      if (editItem) {
        await updateTestimonial(editItem.id, form)
        addToast('Temoignage mis a jour.', 'success')
      } else {
        await createTestimonial(form)
        addToast('Temoignage cree.', 'success')
      }
      setShowModal(false)
      setEditItem(null)
      loadTestimonials()
    } catch (err) {
      addToast(err.message || 'Erreur.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteTestimonial(confirmId)
      addToast('Temoignage supprime.', 'success')
      loadTestimonials()
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  const openEdit = (item) => {
    setEditItem(item)
    setShowModal(true)
  }

  const openNew = () => {
    setEditItem(null)
    setShowModal(true)
  }

  return (
    <>
      <Helmet>
        <title>Temoignages - Administration</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Temoignages
          </h1>
          <Button variant="primary" onClick={openNew}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : testimonials.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucun temoignage.</p>
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
                  <th className="text-left px-4 py-3 font-medium">Auteur</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Role</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Visible</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {testimonials.map((t, i) => (
                  <tr
                    key={t.id}
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
                      {t.author_name}
                    </td>
                    <td
                      className="px-4 py-3 hidden md:table-cell text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t.author_role || '-'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          color: t.visible ? '#4ade80' : '#f87171',
                          backgroundColor: t.visible
                            ? 'rgba(74, 222, 128, 0.1)'
                            : 'rgba(248, 113, 113, 0.1)',
                        }}
                      >
                        {t.visible ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Modifier temoignage de ${t.author_name}`}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmId(t.id)}
                          className="p-1.5 rounded-lg transition-colors focus:outline-none"
                          style={{ color: 'var(--color-text-secondary)' }}
                          aria-label={`Supprimer temoignage de ${t.author_name}`}
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

      <TestimonialModal
        isOpen={showModal}
        initial={editItem}
        onSave={handleSave}
        onClose={() => { setShowModal(false); setEditItem(null) }}
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
