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
import { getArticles } from '../../services/articleService.js'

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

function parseContent(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed?.blocks && Array.isArray(parsed.blocks)) return parsed.blocks
  } catch {}
  return content
    ? [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'paragraph', content }]
    : []
}

const EMPTY = {
  subject: '',
  body_html: '',
  articles: [],
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

  const [availableArticles, setAvailableArticles] = useState([])

  useEffect(() => {
    getArticles().then((res) => {
      setAvailableArticles(res?.data || [])
    })
  }, [])

  useEffect(() => {
    if (!isEdit) return
    getNewsletterCampaigns()
      .then((res) => {
        const campaign = (res?.data || []).find((c) => String(c.id) === String(id))
        if (campaign) {
          setForm({
            subject: campaign.subject || '',
            body_html: campaign.body_html || '',
            articles: campaign.articles || [],
          })
          setStatus(campaign.status || 'draft')
          setBlocks(parseContent(campaign.body_html || ''))
        }
      })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleBlocksChange = (newBlocks) => {
    setBlocks(newBlocks)
    setForm((prev) => ({
      ...prev,
      body_html: blocksToHtml(newBlocks),
    }))
  }

  const handleArticleToggle = (article) => {
    setForm((prev) => {
      const exists = prev.articles.find((a) => a.id === article.id)

      if (exists) {
        return {
          ...prev,
          articles: prev.articles.filter((a) => a.id !== article.id),
        }
      }

      const formatted = {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        cover_image: article.cover_image,
        published_at: article.published_at,
        tags: article.tags || [],
      }

      return {
        ...prev,
        articles: [...prev.articles, formatted],
      }
    })
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
        addToast('Campagne mise à jour.', 'success')
      } else {
        await createCampaign(form)
        addToast('Brouillon enregistré.', 'success')
      }

      navigate('/admin/newsletter')
    } catch (err) {
      addToast(err.message || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    if (!window.confirm('Envoyer cette campagne à tous les abonnés confirmés ?')) return

    setSending(true)
    try {
      await sendCampaign(id)
      addToast('Campagne envoyée avec succès.', 'success')
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
        <title>{isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'} - Administration</title>
      </Helmet>

      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold mb-8">
          {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="block text-sm font-medium mb-2">
              Sujet *
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, subject: e.target.value }))
              }
              disabled={isSent}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {!isSent && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Contenu *
              </label>
              <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
            </div>
          )}

          {!isSent && (
            <div>
              <label className="block text-sm font-medium mb-3">
                Sélectionner des articles
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {availableArticles.map((article) => {
                  const selected = form.articles.some(
                    (a) => a.slug === article.slug
                  )

                  return (
                    <label
                      key={article.id}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleArticleToggle(article)}
                      />
                      <span>{article.title}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {!isSent && (
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'Enregistrer'}
              </Button>
            )}

            {isEdit && !isSent && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? <Spinner size="sm" /> : <>
                  <PaperAirplaneIcon className="h-4 w-4" />
                  Envoyer
                </>}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/admin/newsletter')}
            >
              Retour
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}