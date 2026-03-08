/* Formulaire de creation et d'edition de campagne newsletter. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import BlockEditor from '../../components/admin/BlockEditor.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { NEWSLETTER_BLOCK_TEMPLATES } from '../../constants/blockTemplates.js'
import useAdminBlockTemplates from '../../hooks/useAdminBlockTemplates.js'
import useLocalDraftAutosave from '../../hooks/useLocalDraftAutosave.jsx'
import { isAdminEditorPopup, notifyAdminEditorSaved } from '../../utils/adminEditorWindow.js'
import {
  createBuilderChannel,
  openAdminVisualBuilder,
  subscribeBuilderChannel,
  writeBuilderChannelSnapshot,
} from '../../utils/adminVisualBuilderBridge.js'
import { getArticles } from '../../services/articleService.js'
import {
  createCampaign,
  getNewsletterCampaigns,
  sendCampaign,
  updateCampaign,
} from '../../services/newsletterService.js'

const EMPTY = {
  subject: '',
  body_html: '',
  articles: [],
}

const AUTOSAVE_DEBOUNCE_MS = 900
const LOCAL_DRAFT_PREFIX = 'portfolio_newsletter_campaign_draft'

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

/**
 * Genere un identifiant local pour les blocs.
 * @returns {string} Identifiant unique.
 */
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Echappe le HTML pour eviter l'injection dans le rendu.
 * @param {string | null | undefined} value Texte source.
 * @returns {string} Texte HTML escape.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Convertit les retours ligne en balises <br />.
 * @param {string | null | undefined} value Texte source.
 * @returns {string} Texte converti.
 */
function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

/**
 * Verifie si la chaine est un JSON de blocs.
 * @param {unknown} value Valeur a verifier.
 * @returns {boolean} true si la valeur ressemble a un JSON blocks.
 */
function isJsonBlocksString(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false
  return trimmed.includes('"blocks"')
}

/**
 * Parse une liste HTML (ul/ol) vers le format attendu par ListBlock.
 * @param {Element} listEl Element UL/OL.
 * @returns {Array<string | {content: string, items: Array}>} Liste normalisee.
 */
function parseListItems(listEl) {
  const lis = Array.from(listEl.querySelectorAll(':scope > li'))

  return lis.map((li) => {
    const childList = li.querySelector(':scope > ul, :scope > ol')
    const content = (li.childNodes?.length ? Array.from(li.childNodes) : [li])
      .filter((node) => !(node.nodeType === 1 && ['ul', 'ol'].includes(node.tagName?.toLowerCase())))
      .map((node) => (node.textContent || '').trim())
      .join(' ')
      .trim()

    if (!childList) return content

    return {
      content,
      items: parseListItems(childList),
    }
  })
}

/**
 * Reconstruit des blocs a partir de body_html (JSON blocks, texte ou HTML).
 * @param {string | null | undefined} bodyHtml Contenu source.
 * @returns {Array<object>} Tableau de blocs exploitable par BlockEditor.
 */
function parseContent(bodyHtml) {
  try {
    if (isJsonBlocksString(bodyHtml)) {
      const parsed = JSON.parse(bodyHtml)
      if (parsed?.blocks && Array.isArray(parsed.blocks)) {
        return parsed.blocks
      }
    }
  } catch {
    /* ignore parse JSON error */
  }

  if (!bodyHtml || typeof bodyHtml !== 'string') return []

  const html = bodyHtml.trim()
  if (!html.startsWith('<')) {
    return [{ id: genId(), type: 'paragraph', content: html }]
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks = []
  const nodes = Array.from(doc.body.childNodes).filter(
    (node) => !(node.nodeType === 3 && !(node.textContent || '').trim())
  )

  /**
   * Ajoute un bloc paragraphe si le texte contient du contenu.
   * @param {string | null | undefined} text Texte source.
   * @returns {void}
   */
  const pushParagraph = (text) => {
    const value = (text || '').trim()
    if (!value) return
    blocks.push({ id: genId(), type: 'paragraph', content: value })
  }

  /**
   * Parse un noeud HTML vers un bloc ou des sous-blocs.
   * @param {Node} node Noeud a analyser.
   * @returns {void}
   */
  const handleNode = (node) => {
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
      const level = Number(tag.slice(1))
      blocks.push({
        id: genId(),
        type: 'heading',
        level: level <= 2 ? 2 : 3,
        content: (node.textContent || '').trim(),
      })
      return
    }

    if (tag === 'img') {
      const url = node.getAttribute('src') || ''
      const caption = node.getAttribute('alt') || ''
      if (url) {
        blocks.push({ id: genId(), type: 'image', url, caption })
      }
      return
    }

    if (tag === 'figure') {
      const img = node.querySelector('img')
      if (img) {
        const url = img.getAttribute('src') || ''
        const caption = (node.querySelector('figcaption')?.textContent || img.getAttribute('alt') || '').trim()
        if (url) {
          blocks.push({ id: genId(), type: 'image', url, caption })
        }
        return
      }
      Array.from(node.childNodes).forEach(handleNode)
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

    if (tag === 'div' || tag === 'section' || tag === 'article') {
      Array.from(node.childNodes).forEach(handleNode)
      return
    }

    pushParagraph(node.textContent)
  }

  nodes.forEach(handleNode)
  return blocks
}

/**
 * Serialise les blocs vers un HTML email.
 * @param {Array<object>} blocks Tableau de blocs.
 * @returns {string} HTML final.
 */
function blocksToHtml(blocks) {
  return (blocks || [])
    .map((block) => {
      switch (block.type) {
        case 'paragraph':
          return `<p>${nl2br(block.content)}</p>`

        case 'heading': {
          const level = block.level === 3 ? 3 : 2
          return `<h${level}>${escapeHtml(block.content)}</h${level}>`
        }

        case 'image': {
          if (!block.url) return ''
          const alt = escapeHtml(block.caption || '')
          const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''
          return `<figure><img src="${escapeHtml(block.url)}" alt="${alt}" />${caption}</figure>`
        }

        case 'code': {
          const lang = escapeHtml(block.language || 'js')
          return `<pre><code data-lang="${lang}">${escapeHtml(block.content)}</code></pre>`
        }

        case 'quote': {
          const author = (block.author || '').trim()
          const authorHtml = author ? `<footer>-- ${escapeHtml(author)}</footer>` : ''
          return `<blockquote><p>${nl2br(block.content)}</p>${authorHtml}</blockquote>`
        }

        case 'list': {
          const renderItems = (items) =>
            (items || [])
              .map((item) => {
                if (typeof item === 'string') {
                  return `<li>${escapeHtml(item)}</li>`
                }

                const content = escapeHtml(item?.content || '')
                const children = item?.items?.length ? `<ul>${renderItems(item.items)}</ul>` : ''
                return `<li>${content}${children}</li>`
              })
              .join('')

          return `<ul>${renderItems(block.items)}</ul>`
        }

        default:
          return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Cree la cle localStorage du brouillon.
 * @param {boolean} isEdit true si on modifie une campagne existante.
 * @param {string | undefined} campaignId Identifiant de campagne.
 * @returns {string} Cle de stockage.
 */
function getLocalDraftKey(isEdit, campaignId) {
  return isEdit ? `${LOCAL_DRAFT_PREFIX}_edit_${campaignId}` : `${LOCAL_DRAFT_PREFIX}_new`
}

export default function AdminCampaignForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useAdminToast()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [blocks, setBlocks] = useState([])
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [availableArticles, setAvailableArticles] = useState([])
  const builderChannel = useMemo(() => createBuilderChannel('newsletter', id || 'new'), [id])

  const isSent = status === 'sent'

  const draftStorageKey = useMemo(() => getLocalDraftKey(isEdit, id), [isEdit, id])
  const previewHtml = useMemo(() => blocksToHtml(blocks), [blocks])
  const hasDraftContent = useMemo(
    () => Boolean(form.subject.trim() || blocks.length > 0 || (form.articles || []).length > 0),
    [form.subject, form.articles, blocks]
  )
  const draftData = useMemo(
    () => ({
      subject: form.subject,
      articles: form.articles || [],
      blocks,
      status,
    }),
    [form.subject, form.articles, blocks, status]
  )

  /**
   * Applique un brouillon restaure depuis localStorage.
   * @param {unknown} draft Donnees restaurees.
   * @returns {void}
   */
  const handleRestoreDraft = useCallback((draft) => {
    const restoredBlocks = Array.isArray(draft?.blocks) ? draft.blocks : []
    setBlocks(restoredBlocks)
    setStatus(typeof draft?.status === 'string' ? draft.status : 'draft')
    setForm((prev) => ({
      ...prev,
      subject: typeof draft?.subject === 'string' ? draft.subject : '',
      articles: Array.isArray(draft?.articles) ? draft.articles : [],
      body_html: blocksToHtml(restoredBlocks),
    }))
    addToast('Brouillon local restaure sur ce navigateur.', 'info')
  }, [addToast])

  const { autosaveLabel, localDraftRestored, clearDraft } = useLocalDraftAutosave({
    storageKey: draftStorageKey,
    loading,
    hasContent: hasDraftContent,
    draftData,
    onRestore: handleRestoreDraft,
    debounceMs: AUTOSAVE_DEBOUNCE_MS,
    enabled: !isSent,
  })
  const { templates: editorTemplates } = useAdminBlockTemplates({
    context: 'newsletter',
    fallbackTemplates: NEWSLETTER_BLOCK_TEMPLATES,
  })

  useEffect(() => {
    return subscribeBuilderChannel(builderChannel, (snapshot) => {
      const payload = snapshot?.payload
      if (!payload || (payload.type !== 'builder-draft' && payload.type !== 'builder-save')) {
        return
      }

      const nextBlocks = Array.isArray(payload.blocks) ? payload.blocks : []
      setBlocks(nextBlocks)
      setForm((prev) => ({ ...prev, body_html: blocksToHtml(nextBlocks) }))
    })
  }, [builderChannel])

  /**
   * Retourne a la liste newsletter ou ferme la popup d'edition.
   * @returns {void}
   */
  const closeEditorOrBack = () => {
    if (isAdminEditorPopup()) {
      window.close()
      if (!window.closed) {
        navigate('/admin/newsletter')
      }
      return
    }
    navigate('/admin/newsletter')
  }

  useEffect(() => {
    getArticles().then((res) => {
      setAvailableArticles(res?.data || [])
    })
  }, [])

  useEffect(() => {
    if (!isEdit) return

    getNewsletterCampaigns()
      .then((res) => {
        const campaign = (res?.data || []).find((entry) => String(entry.id) === String(id))
        if (!campaign) return

        const nextForm = {
          subject: campaign.subject || '',
          body_html: campaign.body_html || '',
          articles: campaign.articles || [],
        }

        setForm(nextForm)
        setStatus(campaign.status || 'draft')
        setBlocks(parseContent(nextForm.body_html || ''))
      })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  /**
   * Met a jour les champs de formulaire standards.
   * @param {React.ChangeEvent<HTMLInputElement>} event Evenement input.
   * @returns {void}
   */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  /**
   * Met a jour les blocs et le HTML derive.
   * @param {Array<object>} nextBlocks Nouveau tableau de blocs.
   * @returns {void}
   */
  const handleBlocksChange = (nextBlocks) => {
    setBlocks(nextBlocks)
    setForm((prev) => ({ ...prev, body_html: blocksToHtml(nextBlocks) }))
  }

  /**
   * Ouvre le builder visuel plein ecran (style Elementor) dans un nouvel onglet.
   * @returns {void}
   */
  const openVisualBuilder = () => {
    writeBuilderChannelSnapshot(builderChannel, {
      type: 'builder-init',
      entity: 'newsletter',
      title: form.subject || 'Newsletter',
      blocks,
      templates: editorTemplates,
    })

    const builderTab = openAdminVisualBuilder({
      entity: 'newsletter',
      channel: builderChannel,
    })

    if (!builderTab) {
      navigate(`/admin/builder?entity=newsletter&channel=${encodeURIComponent(builderChannel)}`)
    }
  }

  /**
   * Ajoute ou retire un article associe a la campagne.
   * @param {object} article Article source.
   * @returns {void}
   */
  const handleArticleToggle = (article) => {
    setForm((prev) => {
      const exists = prev.articles.find((entry) => entry.slug === article.slug)
      if (exists) {
        return {
          ...prev,
          articles: prev.articles.filter((entry) => entry.slug !== article.slug),
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

  /**
   * Sauvegarde le brouillon (creation ou edition).
   * @param {React.FormEvent<HTMLFormElement>} event Evenement submit.
   * @returns {Promise<void>} Promise de fin de traitement.
   */
  const handleSubmit = async (event) => {
    event.preventDefault()

    const synced = { ...form, body_html: blocksToHtml(blocks) }
    if (!synced.subject.trim() || blocks.length === 0) {
      addToast('Le sujet et le contenu sont obligatoires.', 'error')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateCampaign(id, synced)
        addToast('Campagne mise a jour.', 'success')
      } else {
        await createCampaign(synced)
        addToast('Brouillon enregistre.', 'success')
      }

      clearDraft()
      notifyAdminEditorSaved('newsletter')
      closeEditorOrBack()
    } catch (error) {
      addToast(error.message || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Envoie la campagne apres synchronisation du HTML.
   * @returns {Promise<void>} Promise de fin de traitement.
   */
  const handleSend = async () => {
    if (!isEdit) return

    setSending(true)
    try {
      await updateCampaign(id, { ...form, body_html: blocksToHtml(blocks) })
      await sendCampaign(id)
      clearDraft()
      notifyAdminEditorSaved('newsletter')
      addToast('Campagne envoyee avec succes.', 'success')
      closeEditorOrBack()
    } catch (error) {
      addToast(error.message || "Erreur lors de l'envoi.", 'error')
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

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'} - Administration</title>
      </Helmet>

      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
          {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="space-y-6 min-w-0">
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

              {!isSent && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label
                      className="block text-sm font-medium"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Contenu *
                    </label>
                    <Button type="button" variant="ghost" onClick={openVisualBuilder}>
                      Builder visuel
                    </Button>
                  </div>
                  <BlockEditor
                    blocks={blocks}
                    onChange={handleBlocksChange}
                    templates={editorTemplates}
                  />
                </div>
              )}

              {!isSent && (
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Selectionner des articles
                  </label>

                  <div
                    className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {availableArticles.map((article) => {
                      const selected = form.articles.some((entry) => entry.slug === article.slug)
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

                <Button type="button" variant="ghost" onClick={closeEditorOrBack}>
                  Retour
                </Button>
              </div>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 self-start">
              <div
                className="rounded-xl border p-3 space-y-1"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                  Autosave local
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {autosaveLabel}
                </p>
                {localDraftRestored && (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Un brouillon local a ete restaure automatiquement.
                  </p>
                )}
              </div>

              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
              >
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Apercu live newsletter
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Mise a jour en temps reel pendant la redaction.
                  </p>
                </div>

                <div className="p-4 max-h-[72vh] overflow-y-auto space-y-4">
                  <section
                    className="rounded-lg border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                  >
                    <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                      Sujet
                    </p>
                    <h2 className="text-xl font-semibold break-words" style={{ color: 'var(--color-text-primary)' }}>
                      {form.subject.trim() || 'Sujet de la campagne...'}
                    </h2>
                  </section>

                  <article
                    className="prose prose-sm max-w-none leading-relaxed"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {previewHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    ) : (
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        Ajoute des blocs pour voir le rendu ici.
                      </p>
                    )}
                  </article>

                  {form.articles.length > 0 && (
                    <section
                      className="rounded-lg border p-3"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                    >
                      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Articles lies
                      </p>
                      <ul className="space-y-2">
                        {form.articles.map((article) => (
                          <li key={article.slug} className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {article.title}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </>
  )
}
