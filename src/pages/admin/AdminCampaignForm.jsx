/* Formulaire de creation et d'edition de campagne newsletter */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import BlockEditor from '../../components/admin/BlockEditor.jsx'
import {
  getNewsletterCampaigns,
  createCampaign,
  updateCampaign,
  sendCampaign,
} from '../../services/newsletterService.js'

/* Serialise les blocs en HTML pour l'envoi par email */
function blocksToHtml(blocks) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'paragraph':
          return `<p>${block.content || ''}</p>`
        case 'heading':
          return `<h${block.level || 2}>${block.content || ''}</h${block.level || 2}>`
        case 'image':
          return block.url
            ? `<figure><img src="${block.url}" alt="${block.caption || ''}" style="max-width:100%" />${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}</figure>`
            : ''
        case 'code':
          return `<pre><code class="language-${block.language || 'js'}">${block.content || ''}</code></pre>`
        case 'quote':
          return `<blockquote><p>${block.content || ''}</p>${block.author ? `<cite>${block.author}</cite>` : ''}</blockquote>`
        default:
          return ''
      }
    })
    .join('\n')
}

/* Deserialise le contenu en tableau de blocs */
function parseContent(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed?.blocks && Array.isArray(parsed.blocks)) return parsed.blocks
  } catch { /* ignore */ }
  return content
    ? [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'paragraph', content }]
    : []
}

const EMPTY = { subject: '', body_html: '' }

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

export default function AdminCampaignForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useAdminToast()
  const isEdit = !!id

  const [form, setForm] = useState(EMPTY)
  const [blocks, setBlocks] = useState([])
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getNewsletterCampaigns()
      .then((res) => {
        const campaign = (res?.data || []).find((c) => String(c.id) === String(id))
        if (campaign) {
          setForm({ subject: campaign.subject || '', body_html: campaign.body_html || '' })
          setStatus(campaign.status || 'draft')
          setBlocks(parseContent(campaign.body_html || ''))
        }
      })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlocksChange = (newBlocks) => {
    setBlocks(newBlocks)
    setForm((prev) => ({ ...prev, body_html: blocksToHtml(newBlocks) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim()) {
      addToast('Le sujet est obligatoire.', 'error')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updateCampaign(id, form)
        addToast('Campagne mise a jour.', 'success')
      } else {
        await createCampaign(form)
        addToast('Brouillon enregistre.', 'success')
      }
      navigate('/admin/newsletter')
    } catch (err) {
      addToast(err.message || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      await sendCampaign(id)
      addToast('Campagne envoyee avec succes.', 'success')
      navigate('/admin/newsletter')
    } catch (err) {
      addToast(err.message || "Erreur lors de l'envoi.", 'error')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const isSent = status === 'sent'

  return (
    <>
      <Helmet>
        <title>
          {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'} - Administration
        </title>
      </Helmet>
      <div className="max-w-2xl">
        <h1
          className="text-2xl font-bold mb-8"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
        </h1>

        {isSent && (
          <div
            className="mb-4 px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
          >
            Cette campagne a deja ete envoyee et ne peut plus etre modifiee.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sujet */}
          <div>
            <label
              htmlFor="cf-subject"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sujet <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              id="cf-subject"
              name="subject"
              type="text"
              value={form.subject}
              onChange={handleChange}
              required
              disabled={isSent}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
              style={inputStyle}
            />
          </div>

          {/* Contenu par blocs */}
          {!isSent && (
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Contenu <span style={{ color: '#f87171' }}>*</span>
              </label>
              <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
            </div>
          )}

          {/* Statut en lecture seule */}
          {isEdit && (
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Statut
              </label>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={
                  isSent
                    ? { color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)' }
                    : { color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-primary)' }
                }
              >
                {isSent ? 'Envoyee' : 'Brouillon'}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {!isSent && (
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? <Spinner size="sm" /> : isEdit ? 'Enregistrer' : 'Creer le brouillon'}
              </Button>
            )}
            {isEdit && !isSent && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Envoyer maintenant
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/admin/newsletter')}
            >
              {isSent ? 'Retour' : 'Annuler'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
