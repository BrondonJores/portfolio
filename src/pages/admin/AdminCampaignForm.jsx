/* Formulaire de creation et d'edition de campagne newsletter */
import { useEffect, useMemo, useState } from 'react'
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

/* --------- Helpers: blocks <-> HTML (en gardant body_html pour l'envoi) --------- */

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function nl2br(s) {
  return escapeHtml(s).replace(/\n/g, '<br />')
}

function isJsonBlocksString(str) {
  if (typeof str !== 'string') return false
  const s = str.trim()
  if (!s.startsWith('{') && !s.startsWith('[')) return false
  return s.includes('"blocks"')
}

/* Désérialise body_html en tableau de blocs compatibles avec ton BlockEditor */
function parseContent(body_html) {
  try {
    if (isJsonBlocksString(body_html)) {
      const parsed = JSON.parse(body_html)
      if (parsed?.blocks && Array.isArray(parsed.blocks)) return parsed.blocks
    }
  } catch {
    /* ignore */
  }

  if (!body_html || typeof body_html !== 'string') return []

  const html = body_html.trim()
  if (!html.startsWith('<')) {
    // texte brut
    return [{ id: genId(), type: 'paragraph', content: html }]
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  const blocks = []
  const nodes = Array.from(doc.body.childNodes).filter(
    (n) => !(n.nodeType === 3 && !n.textContent.trim())
  )

  const pushParagraph = (txt) => {
    const t = (txt || '').trim()
    if (!t) return
    blocks.push({ id: genId(), type: 'paragraph', content: t })
  }

  const parseListItems = (listEl) => {
    const lis = Array.from(listEl.querySelectorAll(':scope > li'))
    // Ton ListBlock supporte string OU objet { content, items }
    return lis.map((li) => {
      // sous-listes (ul/ol) à l'intérieur d'un li
      const sub = li.querySelector(':scope > ul, :scope > ol')
      const contentText = (li.childNodes?.length ? Array.from(li.childNodes) : [li])
        .filter((x) => !(x.nodeType === 1 && (x.tagName?.toLowerCase() === 'ul' || x.tagName?.toLowerCase() === 'ol')))
        .map((x) => (x.textContent || '').trim())
        .join(' ')
        .trim()

      if (!sub) return contentText

      return {
        content: contentText,
        items: parseListItems(sub),
      }
    })
  }

  const handleEl = (node) => {
    if (node.nodeType === 3) {
      pushParagraph(node.textContent)
      return
    }

    const tag = node.tagName?.toLowerCase()
    if (!tag) return

    if (tag === 'p') {
      pushParagraph(node.textContent)
      return
    }

    if (/^h[1-6]$/.test(tag)) {
      // Ton HeadingBlock ne propose que H2/H3 dans le select
      const level = Number(tag.slice(1))
      const normalized = level <= 2 ? 2 : 3
      blocks.push({
        id: genId(),
        type: 'heading',
        level: normalized,
        content: (node.textContent || '').trim(),
      })
      return
    }

    if (tag === 'img') {
      const url = node.getAttribute('src') || ''
      const caption = node.getAttribute('alt') || ''
      if (url) blocks.push({ id: genId(), type: 'image', url, caption })
      return
    }

    if (tag === 'figure') {
      const img = node.querySelector('img')
      if (img) {
        const url = img.getAttribute('src') || ''
        const caption =
          (node.querySelector('figcaption')?.textContent || img.getAttribute('alt') || '').trim()
        if (url) blocks.push({ id: genId(), type: 'image', url, caption })
        return
      }
      // sinon fallback sur enfants
      Array.from(node.childNodes).forEach(handleEl)
      return
    }

    if (tag === 'blockquote') {
      blocks.push({
        id: genId(),
        type: 'quote',
        content: (node.textContent || '').trim(),
        author: '',
      })
      return
    }

    if (tag === 'pre') {
      const code = node.querySelector('code')
      blocks.push({
        id: genId(),
        type: 'code',
        language: 'html',
        content: (code?.textContent || node.textContent || '').trim(),
      })
      return
    }

    if (tag === 'code') {
      blocks.push({
        id: genId(),
        type: 'code',
        language: 'html',
        content: (node.textContent || '').trim(),
      })
      return
    }

    if (tag === 'ul' || tag === 'ol') {
      blocks.push({
        id: genId(),
        type: 'list',
        items: parseListItems(node),
      })
      return
    }

    if (tag === 'br') {
      return
    }

    // div/section/article etc: descend
    if (tag === 'div' || tag === 'section' || tag === 'article') {
      Array.from(node.childNodes).forEach(handleEl)
      return
    }

    // fallback: si l'élément contient du texte -> paragraphe
    pushParagraph(node.textContent)
  }

  nodes.forEach(handleEl)

  return blocks
}

/* Sérialise les blocs vers du HTML email (stocké dans body_html) */
function blocksToHtml(blocks) {
  return (blocks || [])
    .map((b) => {
      switch (b.type) {
        case 'paragraph':
          return `<p>${nl2br(b.content)}</p>`

        case 'heading': {
          // H2/H3 uniquement (conforme à ton editor)
          const lvl = b.level === 3 ? 3 : 2
          return `<h${lvl}>${escapeHtml(b.content)}</h${lvl}>`
        }

        case 'image': {
          if (!b.url) return ''
          const alt = escapeHtml(b.caption || '')
          const figcap = b.caption ? `<figcaption>${escapeHtml(b.caption)}</figcaption>` : ''
          return `<figure><img src="${escapeHtml(b.url)}" alt="${alt}" />${figcap}</figure>`
        }

        case 'code': {
          const lang = escapeHtml(b.language || 'js')
          return `<pre><code data-lang="${lang}">${escapeHtml(b.content)}</code></pre>`
        }

        case 'quote': {
          const author = (b.author || '').trim()
          const authorHtml = author ? `<footer>— ${escapeHtml(author)}</footer>` : ''
          return `<blockquote><p>${nl2br(b.content)}</p>${authorHtml}</blockquote>`
        }

        case 'list': {
          const renderItems = (items) =>
            (items || [])
              .map((it) => {
                if (typeof it === 'string') {
                  return `<li>${escapeHtml(it)}</li>`
                }
                // { content, items }
                const content = escapeHtml(it?.content || '')
                const sub = it?.items?.length ? `<ul>${renderItems(it.items)}</ul>` : ''
                return `<li>${content}${sub}</li>`
              })
              .join('')
          return `<ul>${renderItems(b.items)}</ul>`
        }

        default:
          return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}

const EMPTY = {
  subject: '',
  body_html: '',
  articles: [],
}

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
          const nextForm = {
            subject: campaign.subject || '',
            body_html: campaign.body_html || '',
            articles: campaign.articles || [],
          }

          setForm(nextForm)
          setStatus(campaign.status || 'draft')

          // IMPORTANT: reconstruire des blocs réels depuis body_html (HTML ou JSON blocks)
          setBlocks(parseContent(nextForm.body_html || ''))
        }
      })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleBlocksChange = (newBlocks) => {
    setBlocks(newBlocks)

    // IMPORTANT: on garde body_html en HTML (pour l'envoi plus tard)
    const html = blocksToHtml(newBlocks)
    setForm((prev) => ({ ...prev, body_html: html }))
  }

  const handleArticleToggle = (article) => {
    setForm((prev) => {
      const exists = prev.articles.find((a) => a.slug === article.slug)
      if (exists) {
        return {
          ...prev,
          articles: prev.articles.filter((a) => a.slug !== article.slug),
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

    // Synchronise body_html au cas où (si un autre code modifie form sans passer par handleBlocksChange)
    const synced = { ...form, body_html: blocksToHtml(blocks) }

    if (!synced.subject.trim() || blocks.length === 0) {
      addToast('Le sujet et le contenu sont obligatoires.', 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateCampaign(id, synced)
        addToast('Campagne mise à jour.', 'success')
      } else {
        await createCampaign(synced)
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
    if (!isEdit) return

    setSending(true)
    try {
      // Cause fréquente du timeout côté envoi:
      // - body_html vide / pas à jour (tout était "un seul paragraphe" ou non sérialisé correctement)
      // Ici on force une mise à jour du brouillon avec le HTML généré des blocs avant l'envoi.
      await updateCampaign(id, { ...form, body_html: blocksToHtml(blocks) })

      // Envoi inchangé
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
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
          {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sujet *
            </label>
            <input
              name="subject"
              type="text"
              value={form.subject}
              onChange={handleChange}
              disabled={isSent}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
              style={inputStyle}
            />
          </div>

          {/* Contenu par blocs */}
          {!isSent && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Contenu *
              </label>
              <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
            </div>
          )}

          {!isSent && (
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Sélectionner des articles
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {availableArticles.map((article) => {
                  const selected = form.articles.some((a) => a.slug === article.slug)
                  return (
                    <label key={article.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleArticleToggle(article)}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <span style={{ color: 'var(--color-text-primary)' }}>{article.title}</span>
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
              <Button type="button" variant="secondary" onClick={handleSend} disabled={sending}>
                {sending ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Envoyer
                  </>
                )}
              </Button>
            )}

            <Button type="button" variant="ghost" onClick={() => navigate('/admin/newsletter')}>
              Retour
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}