/* Page de gestion des campagnes newsletter admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { TrashIcon, PaperAirplaneIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import {
  getNewsletterCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
} from '../../services/newsletterService.js'

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

const EMPTY_FORM = { subject: '', body_html: '' }

export default function AdminNewsletter() {
  const addToast = useAdminToast()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)

  const loadCampaigns = () => {
    setLoading(true)
    getNewsletterCampaigns()
      .then((res) => setCampaigns(res?.data || []))
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(loadCampaigns, [])

  const openNew = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (campaign) => {
    setEditItem(campaign)
    setForm({ subject: campaign.subject, body_html: campaign.body_html })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditItem(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        await updateCampaign(editItem.id, form)
        addToast('Campagne mise a jour.', 'success')
      } else {
        await createCampaign(form)
        addToast('Brouillon enregistre.', 'success')
      }
      closeForm()
      loadCampaigns()
    } catch (err) {
      addToast(err.message || 'Erreur.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteCampaign(id)
      addToast('Campagne supprimee.', 'success')
      setConfirmingId(null)
      loadCampaigns()
    } catch (err) {
      addToast(err.message || 'Erreur lors de la suppression.', 'error')
    }
  }

  const handleSend = async (id) => {
    try {
      await sendCampaign(id)
      addToast('Campagne envoyee avec succes.', 'success')
      setConfirmingId(null)
      loadCampaigns()
    } catch (err) {
      addToast(err.message || 'Erreur lors de l\'envoi.', 'error')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  return (
    <>
      <Helmet>
        <title>Newsletter - Administration</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Newsletter
          </h1>
          <Button variant="primary" onClick={openNew}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Nouvelle campagne
          </Button>
        </div>

        {/* Formulaire inline */}
        {showForm && (
          <div
            className="mb-6 p-6 rounded-xl border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {editItem ? 'Modifier le brouillon' : 'Nouvelle campagne'}
              </h2>
              <button
                onClick={closeForm}
                className="p-1 rounded focus:outline-none"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Fermer le formulaire"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Sujet <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Contenu HTML <span style={{ color: '#f87171' }}>*</span>
                </label>
                <textarea
                  value={form.body_html}
                  onChange={(e) => setForm((prev) => ({ ...prev, body_html: e.target.value }))}
                  required
                  rows={10}
                  placeholder="<h1>Bonjour !</h1><p>Votre contenu HTML ici...</p>"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-y font-mono"
                  style={inputStyle}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={closeForm}>Annuler</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer le brouillon'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : campaigns.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucune campagne.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Sujet</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Statut</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date d'envoi</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {c.subject}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={c.status === 'sent'
                          ? { color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)' }
                          : { color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-primary)' }}
                      >
                        {c.status === 'sent' ? 'Envoyee' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDate(c.sent_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {c.status === 'draft' && (
                          <>
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded-lg text-xs transition-colors focus:outline-none"
                              style={{ color: 'var(--color-text-secondary)' }}
                              aria-label={`Modifier la campagne ${c.subject}`}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                            >
                              Modifier
                            </button>
                            {confirmingId === `send-${c.id}` ? (
                              <span className="flex items-center gap-1">
                                <button
                                  onClick={() => handleSend(c.id)}
                                  className="text-xs px-2 py-1 rounded focus:outline-none"
                                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  className="text-xs px-2 py-1 rounded focus:outline-none"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  Annuler
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmingId(`send-${c.id}`)}
                                className="p-1.5 rounded-lg transition-colors focus:outline-none"
                                style={{ color: 'var(--color-text-secondary)' }}
                                aria-label={`Envoyer la campagne ${c.subject}`}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                              >
                                <PaperAirplaneIcon className="h-4 w-4" />
                              </button>
                            )}
                            {confirmingId === `del-${c.id}` ? (
                              <span className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="text-xs px-2 py-1 rounded focus:outline-none"
                                  style={{ backgroundColor: '#f87171', color: '#fff' }}
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  className="text-xs px-2 py-1 rounded focus:outline-none"
                                  style={{ color: 'var(--color-text-secondary)' }}
                                >
                                  Annuler
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmingId(`del-${c.id}`)}
                                className="p-1.5 rounded-lg transition-colors focus:outline-none"
                                style={{ color: 'var(--color-text-secondary)' }}
                                aria-label={`Supprimer la campagne ${c.subject}`}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
