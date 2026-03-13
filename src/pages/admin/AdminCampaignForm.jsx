/* Formulaire de creation et d'edition de campagne newsletter. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  EnvelopeIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import DOMPurify from 'dompurify'
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
  getNewsletterCampaignById,
  sendCampaign,
  updateCampaign,
} from '../../services/newsletterService.js'
import { deleteCurrentVisualBuilderDraft } from '../../services/adminVisualBuilderService.js'

const EMPTY = {
  subject: '',
  body_html: '',
  articles: [],
}

const AUTOSAVE_DEBOUNCE_MS = 900
const LOCAL_DRAFT_PREFIX = 'portfolio_newsletter_campaign_draft'

const inputStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
  color: 'var(--color-text-primary)',
}

const panelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 78%, transparent)',
}

const insetPanelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
}

const textInputClassName = 'w-full rounded-2xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'

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

/**
 * Retourne le style du badge de statut campagne.
 * @param {string} status Statut campagne.
 * @returns {{color:string, backgroundColor:string, borderColor:string}} Style badge.
 */
function getStatusTone(status) {
  if (status === 'sent') {
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
  const safePreviewHtml = useMemo(() => DOMPurify.sanitize(previewHtml), [previewHtml])
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

    getNewsletterCampaignById(id)
      .then((res) => {
        const campaign = res?.data
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
      void deleteCurrentVisualBuilderDraft({
        entity: 'newsletter',
        channel: builderChannel,
      }).catch(() => {})
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
      void deleteCurrentVisualBuilderDraft({
        entity: 'newsletter',
        channel: builderChannel,
      }).catch(() => {})
      notifyAdminEditorSaved('newsletter')
      addToast('Campagne envoyee avec succes.', 'success')
      closeEditorOrBack()
    } catch (error) {
      addToast(error.message || "Erreur lors de l'envoi.", 'error')
    } finally {
      setSending(false)
    }
  }

  const selectedArticles = form.articles || []
  const statusTone = getStatusTone(status)

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

      <div className="max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border px-5 py-5 sm:px-6 sm:py-6" style={panelStyle}>
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
                <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
                Campaign studio
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  {isEdit ? 'Affiner la campagne sans casser le rythme de diffusion.' : 'Monter une campagne avec une vraie vision d ensemble.'}
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Le sujet, les blocs, la selection d articles et l apercu email restent visibles
                  dans un seul cockpit plus clair pour les envois editoriaux.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
                style={statusTone}
              >
                {isSent ? 'Envoyee' : 'Brouillon'}
              </span>
              <span
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
                }}
              >
                {autosaveLabel}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Blocs email', value: blocks.length },
              { label: 'Articles relies', value: selectedArticles.length },
              { label: 'Sujet actif', value: form.subject.trim() || 'A definir' },
            ].map((metric) => (
              <article key={metric.label} className="rounded-[24px] border px-4 py-4" style={insetPanelStyle}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                  {metric.label}
                </p>
                <p className="mt-3 text-sm font-semibold sm:text-base" style={{ color: 'var(--color-text-primary)' }}>
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            <div className="space-y-5 min-w-0">
              <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Ligne editoriale
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Cadre le sujet et l angle de la campagne avant l envoi.
                    </p>
                  </div>
                  {!isSent && (
                    <button
                      type="button"
                      onClick={openVisualBuilder}
                      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                      style={insetPanelStyle}
                    >
                      <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                      Ouvrir le builder visuel
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Sujet *
                  </label>
                  <input
                    name="subject"
                    type="text"
                    value={form.subject}
                    onChange={handleChange}
                    disabled={isSent}
                    className={textInputClassName}
                    style={inputStyle}
                  />
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Ce sujet porte la premiere promesse visible dans la boite mail.
                  </p>
                </div>
              </section>

              {!isSent && (
                <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        Contenu de la campagne
                      </h2>
                      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Redige le coeur de l email comme une mini page editoriale.
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium" style={insetPanelStyle}>
                      {blocks.length} bloc{blocks.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="rounded-[24px] border p-3 sm:p-4" style={insetPanelStyle}>
                    <BlockEditor
                      blocks={blocks}
                      onChange={handleBlocksChange}
                      templates={editorTemplates}
                    />
                  </div>
                </section>
              )}

              {!isSent && (
                <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Articles relies
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Selectionne les contenus a pousser dans cette edition.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {availableArticles.map((article) => {
                      const selected = selectedArticles.some((entry) => entry.slug === article.slug)
                      return (
                        <label
                          key={article.id}
                          className="flex cursor-pointer items-start justify-between gap-4 rounded-[24px] border px-4 py-4 transition hover:-translate-y-0.5"
                          style={{
                            ...insetPanelStyle,
                            borderColor: selected
                              ? 'color-mix(in srgb, var(--color-accent) 72%, var(--color-border))'
                              : insetPanelStyle.borderColor,
                            backgroundColor: selected
                              ? 'color-mix(in srgb, var(--color-accent-glow) 16%, var(--color-bg-primary))'
                              : insetPanelStyle.backgroundColor,
                          }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {article.title}
                            </p>
                            {article.excerpt && (
                              <p className="mt-2 line-clamp-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                {article.excerpt}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                              style={selected ? getStatusTone('sent') : insetPanelStyle}
                            >
                              {selected ? 'Selectionne' : 'Disponible'}
                            </span>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => handleArticleToggle(article)}
                              style={{ accentColor: 'var(--color-accent)' }}
                            />
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </section>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
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
              <section className="rounded-[28px] border p-5" style={panelStyle}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Pulse
                    </p>
                    <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Etat de la campagne
                    </h2>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={statusTone}
                  >
                    {isSent ? 'Live' : 'Draft'}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Autosave local', value: autosaveLabel },
                    { label: 'Sujet courant', value: form.subject.trim() || 'A definir' },
                    { label: 'Articles relies', value: `${selectedArticles.length} selectionnes` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border px-4 py-3" style={insetPanelStyle}>
                      <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {localDraftRestored && (
                  <p className="mt-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Un brouillon local a ete restaure automatiquement sur ce navigateur.
                  </p>
                )}
              </section>

              <section className="overflow-hidden rounded-[28px] border" style={panelStyle}>
                <div className="border-b px-5 py-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                  <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Preview
                  </p>
                  <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Apercu live newsletter
                  </h2>
                </div>

                <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
                  <section className="rounded-[22px] border p-4" style={insetPanelStyle}>
                    <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                      Sujet
                    </p>
                    <h2 className="mt-3 break-words text-2xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--color-text-primary)' }}>
                      {form.subject.trim() || 'Sujet de la campagne...'}
                    </h2>
                  </section>

                  <article className="rounded-[22px] border p-4" style={insetPanelStyle}>
                    <div className="prose prose-sm max-w-none leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                      {safePreviewHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: safePreviewHtml }} />
                      ) : (
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                          Ajoute des blocs pour voir le rendu ici.
                        </p>
                      )}
                    </div>
                  </article>

                  {selectedArticles.length > 0 && (
                    <section className="rounded-[22px] border p-4" style={insetPanelStyle}>
                      <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                        Articles relies
                      </p>
                      <ul className="mt-3 space-y-2">
                        {selectedArticles.map((article) => (
                          <li key={article.slug} className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {article.title}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </form>
      </div>
    </>
  )
}
