/* Page builder visuelle type Elementor (V1) pour edition plein ecran des blocs. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3Icon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import BlockEditor from '../../components/admin/BlockEditor.jsx'
import Button from '../../components/ui/Button.jsx'
import ImageUploader from '../../components/ui/ImageUploader.jsx'
import {
  ARTICLE_BLOCK_TEMPLATES,
  NEWSLETTER_BLOCK_TEMPLATES,
  PROJECT_BLOCK_TEMPLATES,
  PAGE_BLOCK_TEMPLATES,
} from '../../constants/blockTemplates.js'
import useAdminBlockTemplates from '../../hooks/useAdminBlockTemplates.js'
import { notifyAdminEditorSaved } from '../../utils/adminEditorWindow.js'
import {
  readBuilderChannelSnapshot,
  subscribeBuilderChannel,
  writeBuilderChannelSnapshot,
} from '../../utils/adminVisualBuilderBridge.js'
import {
  getCurrentVisualBuilderDraft,
  upsertCurrentVisualBuilderDraft,
} from '../../services/adminVisualBuilderService.js'

const ENTITY_CONFIG = {
  article: {
    context: 'article',
    fallbackTemplates: ARTICLE_BLOCK_TEMPLATES,
    label: 'Article',
    notifyEntity: 'articles',
    defaultTitle: 'Nouvel article',
  },
  project: {
    context: 'project',
    fallbackTemplates: PROJECT_BLOCK_TEMPLATES,
    label: 'Projet',
    notifyEntity: 'projects',
    defaultTitle: 'Nouveau projet',
  },
  newsletter: {
    context: 'newsletter',
    fallbackTemplates: NEWSLETTER_BLOCK_TEMPLATES,
    label: 'Newsletter',
    notifyEntity: 'newsletter',
    defaultTitle: 'Nouvelle campagne',
  },
  page: {
    context: 'all',
    fallbackTemplates: PAGE_BLOCK_TEMPLATES,
    label: 'Page',
    notifyEntity: 'pages',
    defaultTitle: 'Nouvelle page',
  },
}

const VIEWPORT_MODES = {
  desktop: { label: 'Desktop', width: '100%' },
  tablet: { label: 'Tablet', width: '860px' },
  mobile: { label: 'Mobile', width: '430px' },
}

const MAX_HISTORY_ENTRIES = 100
const SERVER_AUTOSAVE_DEBOUNCE_MS = 3500

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

/**
 * Genere un identifiant local unique pour un bloc.
 * @returns {string} Identifiant genere.
 */
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Clone profond safe.
 * @param {unknown} value Valeur source.
 * @returns {unknown} Copie profonde.
 */
function safeClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

/**
 * Retourne la configuration entity valide.
 * @param {string | null} entity Entite brute query param.
 * @returns {object} Configuration entity.
 */
function resolveEntityConfig(entity) {
  const key = String(entity || '').toLowerCase()
  if (ENTITY_CONFIG[key]) return { key, ...ENTITY_CONFIG[key] }
  return { key: 'article', ...ENTITY_CONFIG.article }
}

/**
 * Cree un bloc vide selon son type.
 * @param {string} type Type de bloc.
 * @returns {object} Bloc instancie.
 */
function createBlockByType(type) {
  switch (type) {
    case 'section':
      return {
        id: genId(),
        type: 'section',
        layout: '2-col',
        variant: 'default',
        spacing: 'md',
        anchor: '',
        columns: [[], []],
      }
    case 'heading':
      return { id: genId(), type: 'heading', level: 2, content: '' }
    case 'image':
      return { id: genId(), type: 'image', url: '', caption: '' }
    case 'code':
      return { id: genId(), type: 'code', language: 'js', content: '' }
    case 'quote':
      return { id: genId(), type: 'quote', content: '', author: '' }
    case 'list':
      return { id: genId(), type: 'list', items: [''] }
    case 'paragraph':
    default:
      return { id: genId(), type: 'paragraph', content: '' }
  }
}

/**
 * Normalise une liste de blocs pour garantir un id par bloc.
 * @param {Array<object>} blocks Blocs source.
 * @returns {Array<object>} Blocs normalises.
 */
function normalizeBlocks(blocks) {
  const source = Array.isArray(blocks) ? blocks : []
  return source.map((block) => ({ ...safeClone(block), id: block?.id || genId() }))
}

/**
 * Retourne un libelle lisible pour le type de bloc.
 * @param {string} type Type bloc.
 * @returns {string} Libelle.
 */
function toBlockLabel(type) {
  switch (type) {
    case 'section':
      return 'Section'
    case 'paragraph':
      return 'Paragraphe'
    case 'heading':
      return 'Titre'
    case 'image':
      return 'Image'
    case 'code':
      return 'Code'
    case 'quote':
      return 'Citation'
    case 'list':
      return 'Liste'
    default:
      return type || 'Bloc'
  }
}

/**
 * Extrait un apercu textuel d'un bloc.
 * @param {object} block Bloc source.
 * @returns {string} Resume court.
 */
function toBlockPreview(block) {
  if (!block || typeof block !== 'object') return ''
  if (block.type === 'section') {
    const columns = Array.isArray(block.columns) ? block.columns : []
    const widgetCount = columns.reduce((acc, column) => {
      if (!Array.isArray(column)) return acc
      return acc + column.length
    }, 0)
    return `${block.layout || '2-col'} • ${widgetCount} widget(s)`
  }
  if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote') {
    return String(block.content || '').slice(0, 70)
  }
  if (block.type === 'image') {
    return block.caption || block.url || 'Image'
  }
  if (block.type === 'code') {
    return `${block.language || 'code'}`
  }
  if (block.type === 'list') {
    const first = Array.isArray(block.items) ? block.items[0] : ''
    return typeof first === 'string' ? first : first?.content || 'Liste'
  }
  return ''
}

/**
 * Retourne une date lisible HH:MM:SS.
 * @param {Date} date Date source.
 * @returns {string} Heure formatee.
 */
function formatClock(date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * Construit une signature stable du brouillon courant.
 * @param {string} title Titre courant.
 * @param {Array<object>} blocks Blocs courants.
 * @returns {string} Signature serialisee.
 */
function buildPersistenceSignature(title, blocks) {
  return JSON.stringify({
    title: String(title || ''),
    blocks: normalizeBlocks(blocks),
  })
}

export default function AdminVisualBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const entityConfig = resolveEntityConfig(searchParams.get('entity'))
  const channel = String(searchParams.get('channel') || `${entityConfig.key}-new`)

  const [title, setTitle] = useState(entityConfig.defaultTitle)
  const [blocks, setBlocks] = useState(() => normalizeBlocks([createBlockByType('paragraph')]))
  const [templates, setTemplates] = useState([])
  const [activeBlockId, setActiveBlockId] = useState(null)
  const [viewportMode, setViewportMode] = useState('desktop')
  const [statusMessage, setStatusMessage] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const [lastServerSaveAt, setLastServerSaveAt] = useState(null)
  const [isPersistingServer, setIsPersistingServer] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')

  const historyStackRef = useRef([normalizeBlocks([createBlockByType('paragraph')])])
  const historyCursorRef = useRef(0)
  const [historyStack, setHistoryStack] = useState(historyStackRef.current)
  const [historyCursor, setHistoryCursor] = useState(historyCursorRef.current)
  const commandInputRef = useRef(null)
  const initializedChannelRef = useRef('')
  const hasBootstrappedRef = useRef(false)
  const lastPersistedSignatureRef = useRef('')

  const { templates: contextTemplates } = useAdminBlockTemplates({
    context: entityConfig.context,
    fallbackTemplates: entityConfig.fallbackTemplates,
  })

  const activeIndex = useMemo(
    () => blocks.findIndex((block) => block.id === activeBlockId),
    [blocks, activeBlockId]
  )

  const activeBlock = activeIndex >= 0 ? blocks[activeIndex] : null

  useEffect(() => {
    if (!activeBlockId && blocks[0]?.id) {
      setActiveBlockId(blocks[0].id)
      return
    }

    if (activeBlockId && !blocks.some((block) => block.id === activeBlockId)) {
      setActiveBlockId(blocks[0]?.id || null)
    }
  }, [blocks, activeBlockId])

  /**
   * Reinitialise la pile undo/redo.
   * @param {Array<object>} seedBlocks Etat de base.
   * @returns {void}
   */
  const resetHistory = useCallback((seedBlocks) => {
    const cloned = normalizeBlocks(seedBlocks)
    historyStackRef.current = [cloned]
    historyCursorRef.current = 0
    setHistoryStack(historyStackRef.current)
    setHistoryCursor(historyCursorRef.current)
  }, [])

  /**
   * Enregistre un nouvel etat dans l'historique.
   * @param {Array<object>} nextBlocks Blocs a historiser.
   * @returns {void}
   */
  const commitHistory = useCallback((nextBlocks) => {
    const normalized = normalizeBlocks(nextBlocks)
    const serialized = JSON.stringify(normalized)
    const currentStack = historyStackRef.current
    const currentCursor = historyCursorRef.current
    const base = currentStack.slice(0, currentCursor + 1)
    const last = base[base.length - 1]

    if (last && JSON.stringify(last) === serialized) {
      return
    }

    base.push(normalized)
    if (base.length > MAX_HISTORY_ENTRIES) {
      base.shift()
    }

    historyStackRef.current = base
    historyCursorRef.current = base.length - 1
    setHistoryStack(base)
    setHistoryCursor(base.length - 1)
  }, [])

  /**
   * Applique une nouvelle liste de blocs.
   * @param {Array<object>} nextBlocks Nouveaux blocs.
   * @param {{recordHistory?: boolean}} [options] Options.
   * @returns {void}
   */
  const applyBlocks = useCallback((nextBlocks, options = {}) => {
    const normalized = normalizeBlocks(nextBlocks)
    setBlocks(normalized)

    if (options.recordHistory !== false) {
      commitHistory(normalized)
    }
  }, [commitHistory])

  /**
   * Hydrate l'etat builder depuis un payload de canal.
   * @param {object | null | undefined} payload Donnees source.
   * @returns {void}
   */
  const hydrateFromPayload = useCallback((payload, options = {}) => {
    const payloadBlocks = normalizeBlocks(payload?.blocks || [])
    const nextBlocks = payloadBlocks.length > 0 ? payloadBlocks : normalizeBlocks([createBlockByType('paragraph')])
    const nextTitle = String(payload?.title || entityConfig.defaultTitle)
    const nextTemplates = Array.isArray(payload?.templates) && payload.templates.length > 0
      ? payload.templates
      : contextTemplates

    setTitle(nextTitle)
    setTemplates(nextTemplates)
    setBlocks(nextBlocks)
    setActiveBlockId(nextBlocks[0]?.id || null)
    resetHistory(nextBlocks)
    if (options.markAsPersisted === true) {
      lastPersistedSignatureRef.current = buildPersistenceSignature(nextTitle, nextBlocks)
    } else {
      lastPersistedSignatureRef.current = ''
    }
    hasBootstrappedRef.current = true
  }, [contextTemplates, entityConfig.defaultTitle, resetHistory])

  useEffect(() => {
    let cancelled = false
    const channelIdentity = `${entityConfig.key}|${channel}`
    if (initializedChannelRef.current === channelIdentity) return
    initializedChannelRef.current = channelIdentity
    hasBootstrappedRef.current = false
    lastPersistedSignatureRef.current = ''
    setStatusMessage('')
    setLastSyncAt(null)
    setLastServerSaveAt(null)

    /**
     * Initialise le builder depuis le snapshot local ou la persistance serveur.
     * @returns {Promise<void>} Promise resolue apres hydratation.
     */
    const bootstrapBuilder = async () => {
      const snapshot = readBuilderChannelSnapshot(channel)
      if (snapshot?.payload) {
        hydrateFromPayload(snapshot.payload, { markAsPersisted: false })
        return
      }

      try {
        const response = await getCurrentVisualBuilderDraft({
          entity: entityConfig.key,
          channel,
        })
        if (cancelled) return

        const draft = response?.data || null
        if (draft) {
          hydrateFromPayload(
            {
              title: draft.title,
              blocks: draft.blocks,
              templates: contextTemplates,
            },
            { markAsPersisted: true }
          )
          if (draft.updatedAt) {
            setLastServerSaveAt(new Date(draft.updatedAt))
          }
          setStatusMessage(`Brouillon serveur charge (v${draft.versionNumber}).`)
          return
        }
      } catch {
        if (!cancelled) {
          setStatusMessage('Mode local actif: brouillon serveur indisponible.')
        }
      }

      if (cancelled) return
      const bootstrapBlocks = normalizeBlocks([createBlockByType('paragraph')])
      setTitle(entityConfig.defaultTitle)
      setTemplates(contextTemplates)
      setBlocks(bootstrapBlocks)
      setActiveBlockId(bootstrapBlocks[0]?.id || null)
      resetHistory(bootstrapBlocks)
      hasBootstrappedRef.current = true
      lastPersistedSignatureRef.current = ''
    }

    void bootstrapBuilder()
    return () => {
      cancelled = true
    }
  }, [channel, entityConfig.key, entityConfig.defaultTitle, contextTemplates, hydrateFromPayload, resetHistory])

  useEffect(() => {
    return subscribeBuilderChannel(channel, (snapshot) => {
      const payload = snapshot?.payload
      if (!payload || payload.type !== 'builder-init') return
      hydrateFromPayload(payload, { markAsPersisted: false })
    })
  }, [channel, hydrateFromPayload])

  useEffect(() => {
    if (templates.length > 0) return
    if (!Array.isArray(contextTemplates) || contextTemplates.length === 0) return
    setTemplates(contextTemplates)
  }, [templates.length, contextTemplates])

  useEffect(() => {
    const timer = setTimeout(() => {
      writeBuilderChannelSnapshot(channel, {
        type: 'builder-draft',
        entity: entityConfig.key,
        title,
        blocks,
        templates,
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [channel, entityConfig.key, title, blocks, templates])

  useEffect(() => {
    if (!hasBootstrappedRef.current) return
    const signature = buildPersistenceSignature(title, blocks)
    if (signature === lastPersistedSignatureRef.current) return

    const timer = setTimeout(async () => {
      setIsPersistingServer(true)
      try {
        await upsertCurrentVisualBuilderDraft({
          entity: entityConfig.key,
          channel,
          title,
          blocks,
        })
        lastPersistedSignatureRef.current = signature
        setLastServerSaveAt(new Date())
      } catch (error) {
        setStatusMessage(error?.message || 'Impossible de persister le brouillon sur le serveur.')
      } finally {
        setIsPersistingServer(false)
      }
    }, SERVER_AUTOSAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [channel, entityConfig.key, title, blocks])

  /**
   * Persiste le brouillon courant immediatement sur le serveur.
   * @returns {Promise<void>} Promise resolue apres tentative de persistance.
   */
  const persistDraftNow = useCallback(async () => {
    if (!hasBootstrappedRef.current) return
    const signature = buildPersistenceSignature(title, blocks)
    if (signature === lastPersistedSignatureRef.current) return

    setIsPersistingServer(true)
    try {
      await upsertCurrentVisualBuilderDraft({
        entity: entityConfig.key,
        channel,
        title,
        blocks,
      })
      lastPersistedSignatureRef.current = signature
      setLastServerSaveAt(new Date())
    } catch (error) {
      setStatusMessage(error?.message || 'Impossible de persister le brouillon sur le serveur.')
    } finally {
      setIsPersistingServer(false)
    }
  }, [blocks, channel, entityConfig.key, title])

  useEffect(() => {
    /**
     * Ouvre/ferme la palette de commandes au clavier.
     * @param {KeyboardEvent} event Evenement clavier global.
     * @returns {void}
     */
    const onKeyDown = (event) => {
      const withMainModifier = event.ctrlKey || event.metaKey
      if (withMainModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((prev) => !prev)
        return
      }
      if (event.key === 'Escape') {
        setCommandOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!commandOpen) return
    setTimeout(() => {
      commandInputRef.current?.focus()
    }, 0)
  }, [commandOpen])

  /**
   * Remonte d'un cran dans l'historique.
   * @returns {void}
   */
  const handleUndo = () => {
    if (historyCursorRef.current <= 0) return
    const nextCursor = historyCursorRef.current - 1
    const nextBlocks = normalizeBlocks(historyStackRef.current[nextCursor] || [])
    historyCursorRef.current = nextCursor
    setHistoryCursor(nextCursor)
    setBlocks(nextBlocks)
    setActiveBlockId(nextBlocks[0]?.id || null)
  }

  /**
   * Avance d'un cran dans l'historique.
   * @returns {void}
   */
  const handleRedo = () => {
    if (historyCursorRef.current >= historyStackRef.current.length - 1) return
    const nextCursor = historyCursorRef.current + 1
    const nextBlocks = normalizeBlocks(historyStackRef.current[nextCursor] || [])
    historyCursorRef.current = nextCursor
    setHistoryCursor(nextCursor)
    setBlocks(nextBlocks)
    setActiveBlockId(nextBlocks[0]?.id || null)
  }

  /**
   * Envoie les modifications vers le formulaire source.
   * @returns {void}
   */
  const handleSaveToForm = useCallback(async () => {
    await persistDraftNow()
    writeBuilderChannelSnapshot(channel, {
      type: 'builder-save',
      entity: entityConfig.key,
      title,
      blocks,
      templates,
    })
    notifyAdminEditorSaved(entityConfig.notifyEntity)
    setLastSyncAt(new Date())
    setStatusMessage('Modifications synchronisees avec le formulaire.')
  }, [persistDraftNow, channel, entityConfig.key, title, blocks, templates, entityConfig.notifyEntity])

  /**
   * Insere un nouveau bloc apres le bloc actif.
   * @param {string} type Type bloc.
   * @returns {void}
   */
  const insertBlockAfterActive = (type) => {
    const created = createBlockByType(type)
    const atIndex = activeIndex >= 0 ? activeIndex + 1 : blocks.length
    const next = [...blocks]
    next.splice(atIndex, 0, created)
    applyBlocks(next)
    setActiveBlockId(created.id)
  }

  /**
   * Supprime un bloc par index.
   * @param {number} index Index cible.
   * @returns {void}
   */
  const removeBlockAt = (index) => {
    if (index < 0 || index >= blocks.length) return
    const next = blocks.filter((_, current) => current !== index)
    const safeNext = next.length > 0 ? next : [createBlockByType('paragraph')]
    applyBlocks(safeNext)
    setActiveBlockId(safeNext[Math.min(index, safeNext.length - 1)]?.id || null)
  }

  /**
   * Deplace un bloc dans la liste.
   * @param {number} index Index courant.
   * @param {number} direction Direction (-1|+1).
   * @returns {void}
   */
  const moveBlock = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const next = [...blocks]
    ;[next[index], next[target]] = [next[target], next[index]]
    applyBlocks(next)
    setActiveBlockId(next[target].id)
  }

  /**
   * Duplique un bloc.
   * @param {number} index Index bloc.
   * @returns {void}
   */
  const duplicateBlock = (index) => {
    const source = blocks[index]
    if (!source) return
    const clone = { ...safeClone(source), id: genId() }
    const next = [...blocks]
    next.splice(index + 1, 0, clone)
    applyBlocks(next)
    setActiveBlockId(clone.id)
  }

  /**
   * Met a jour le bloc actif via l'inspector.
   * @param {object} patch Patch de mise a jour.
   * @returns {void}
   */
  const patchActiveBlock = (patch) => {
    if (activeIndex < 0) return
    const next = [...blocks]
    next[activeIndex] = { ...next[activeIndex], ...patch }
    applyBlocks(next)
  }

  const commandActions = useMemo(
    () => [
      { id: 'save', label: 'Sauvegarder vers le formulaire', run: handleSaveToForm },
      { id: 'undo', label: 'Undo', run: handleUndo },
      { id: 'redo', label: 'Redo', run: handleRedo },
      { id: 'desktop', label: 'Mode desktop', run: () => setViewportMode('desktop') },
      { id: 'tablet', label: 'Mode tablet', run: () => setViewportMode('tablet') },
      { id: 'mobile', label: 'Mode mobile', run: () => setViewportMode('mobile') },
      { id: 'close', label: 'Retour formulaire', run: () => navigate(-1) },
    ],
    [handleRedo, handleUndo, handleSaveToForm, navigate]
  )

  const filteredCommandActions = useMemo(() => {
    const query = commandQuery.trim().toLowerCase()
    if (!query) return commandActions
    return commandActions.filter((action) => action.label.toLowerCase().includes(query))
  }, [commandActions, commandQuery])

  const navigatorInsertTypes = entityConfig.key === 'page'
    ? ['section', 'paragraph', 'heading', 'image', 'quote', 'code', 'list']
    : ['paragraph', 'heading', 'image', 'quote', 'code', 'list']

  return (
    <>
      <Helmet>
        <title>Builder visuel - {entityConfig.label}</title>
      </Helmet>

      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <header
          className="border-b px-4 py-3 flex flex-wrap items-center gap-3 justify-between"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeftIcon className="h-4 w-4" />
              Retour
            </Button>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                Builder visuel {entityConfig.label}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                Canal: {channel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleUndo} disabled={historyCursor <= 0}>
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleRedo}
              disabled={historyCursor >= historyStack.length - 1}
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
            </Button>

            <div className="hidden md:flex items-center gap-1 rounded-lg border px-1 py-1" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className="p-1.5 rounded"
                style={{
                  color: viewportMode === 'desktop' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  backgroundColor: viewportMode === 'desktop' ? 'var(--color-bg-secondary)' : 'transparent',
                }}
                aria-label="Mode desktop"
              >
                <ComputerDesktopIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('tablet')}
                className="p-1.5 rounded"
                style={{
                  color: viewportMode === 'tablet' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  backgroundColor: viewportMode === 'tablet' ? 'var(--color-bg-secondary)' : 'transparent',
                }}
                aria-label="Mode tablet"
              >
                <DeviceTabletIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className="p-1.5 rounded"
                style={{
                  color: viewportMode === 'mobile' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  backgroundColor: viewportMode === 'mobile' ? 'var(--color-bg-secondary)' : 'transparent',
                }}
                aria-label="Mode mobile"
              >
                <DevicePhoneMobileIcon className="h-4 w-4" />
              </button>
            </div>

            <Button type="button" variant="secondary" onClick={() => setCommandOpen(true)}>
              <MagnifyingGlassIcon className="h-4 w-4" />
              Ctrl+K
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveToForm}>
              <CheckCircleIcon className="h-4 w-4" />
              Sauvegarder
            </Button>
          </div>
        </header>

        {(statusMessage || lastSyncAt || lastServerSaveAt || isPersistingServer) && (
          <div
            className="mx-4 mt-3 rounded-xl border px-3 py-2 text-xs flex items-center gap-2"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
          >
            <CheckCircleIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
            <span>
              {isPersistingServer
                ? 'Sauvegarde serveur en cours...'
                : statusMessage || 'Brouillon pret.'}
            </span>
            <span className="ml-auto flex items-center gap-3">
              {lastServerSaveAt && <span>Cloud: {formatClock(lastServerSaveAt)}</span>}
              {lastSyncAt && <span>Formulaire: {formatClock(lastSyncAt)}</span>}
            </span>
          </div>
        )}

        <div className="flex-1 grid gap-4 p-4 xl:grid-cols-[290px_minmax(0,1fr)_320px]">
          <aside
            className="rounded-xl border p-3 space-y-3 overflow-y-auto"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
          >
            <div className="flex items-center gap-2">
              <Bars3Icon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Elements & Structure
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navigatorInsertTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => insertBlockAfterActive(type)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  {toBlockLabel(type)}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {blocks.map((block, index) => {
                const active = block.id === activeBlockId
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setActiveBlockId(block.id)}
                    className="w-full text-left rounded-lg border px-2.5 py-2 space-y-1"
                    style={{
                      borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                      backgroundColor: active ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {index + 1}. {toBlockLabel(block.type)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {block.type}
                      </span>
                    </div>
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {toBlockPreview(block) || 'Sans contenu'}
                    </p>

                    <div className="flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          moveBlock(index, -1)
                        }}
                        className="text-[11px] px-2 py-0.5 rounded border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          moveBlock(index, 1)
                        }}
                        className="text-[11px] px-2 py-0.5 rounded border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          duplicateBlock(index)
                        }}
                        className="text-[11px] px-2 py-0.5 rounded border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        Dupliquer
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          removeBlockAt(index)
                        }}
                        className="text-[11px] px-2 py-0.5 rounded border"
                        style={{ borderColor: '#f87171', color: '#f87171' }}
                      >
                        Suppr
                      </button>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <main
            className="rounded-xl border p-3 min-w-0 overflow-auto"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Squares2X2Icon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Canvas Builder ({VIEWPORT_MODES[viewportMode].label})
              </p>
            </div>

            <div
              className="mx-auto transition-all duration-300"
              style={{ width: VIEWPORT_MODES[viewportMode].width, maxWidth: '100%' }}
            >
              <BlockEditor
                blocks={blocks}
                onChange={applyBlocks}
                templates={templates}
                activeBlockId={activeBlockId}
                onActiveBlockChange={setActiveBlockId}
                allowSections={entityConfig.key === 'page'}
              />
            </div>
          </main>

          <aside
            className="rounded-xl border p-3 space-y-3 overflow-y-auto"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Inspector
            </p>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Titre du contenu
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={inputStyle}
              />
            </div>

            {!activeBlock ? (
              <div
                className="rounded-lg border p-3 text-xs"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
              >
                Selectionne un bloc dans le panneau de structure ou le canvas pour modifier ses proprietes.
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="rounded-lg border p-2 text-xs"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
                >
                  Bloc actif: <strong style={{ color: 'var(--color-text-primary)' }}>{toBlockLabel(activeBlock.type)}</strong>
                </div>

                {activeBlock.type === 'section' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Layout
                      </label>
                      <select
                        value={['1-col', '2-col', '3-col'].includes(activeBlock.layout) ? activeBlock.layout : '2-col'}
                        onChange={(event) => {
                          const nextLayout = event.target.value
                          const nextColumnCount = nextLayout === '1-col' ? 1 : nextLayout === '3-col' ? 3 : 2
                          const sourceColumns = Array.isArray(activeBlock.columns) ? activeBlock.columns : []
                          const nextColumns = Array.from({ length: nextColumnCount }, (_, index) => {
                            return Array.isArray(sourceColumns[index]) ? sourceColumns[index] : []
                          })
                          patchActiveBlock({ layout: nextLayout, columns: nextColumns })
                        }}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                      >
                        <option value="1-col">1-col</option>
                        <option value="2-col">2-col</option>
                        <option value="3-col">3-col</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Variant
                      </label>
                      <select
                        value={['default', 'soft', 'accent'].includes(activeBlock.variant) ? activeBlock.variant : 'default'}
                        onChange={(event) => patchActiveBlock({ variant: event.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                      >
                        <option value="default">default</option>
                        <option value="soft">soft</option>
                        <option value="accent">accent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Spacing
                      </label>
                      <select
                        value={['sm', 'md', 'lg'].includes(activeBlock.spacing) ? activeBlock.spacing : 'md'}
                        onChange={(event) => patchActiveBlock({ spacing: event.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                      >
                        <option value="sm">sm</option>
                        <option value="md">md</option>
                        <option value="lg">lg</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Anchor
                      </label>
                      <input
                        type="text"
                        value={activeBlock.anchor || ''}
                        onChange={(event) => patchActiveBlock({ anchor: event.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                        placeholder="hero, features, contact..."
                      />
                    </div>
                  </>
                )}

                {(activeBlock.type === 'paragraph' || activeBlock.type === 'quote') && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Contenu
                    </label>
                    <textarea
                      value={activeBlock.content || ''}
                      onChange={(event) => patchActiveBlock({ content: event.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-y"
                      style={inputStyle}
                    />
                  </div>
                )}

                {activeBlock.type === 'quote' && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Auteur
                    </label>
                    <input
                      type="text"
                      value={activeBlock.author || ''}
                      onChange={(event) => patchActiveBlock({ author: event.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      style={inputStyle}
                    />
                  </div>
                )}

                {activeBlock.type === 'heading' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Niveau
                      </label>
                      <select
                        value={activeBlock.level === 3 ? 3 : 2}
                        onChange={(event) => patchActiveBlock({ level: Number(event.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                      >
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Texte
                      </label>
                      <input
                        type="text"
                        value={activeBlock.content || ''}
                        onChange={(event) => patchActiveBlock({ content: event.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}

                {activeBlock.type === 'image' && (
                  <>
                    <ImageUploader
                      value={activeBlock.url || ''}
                      onUpload={(url) => patchActiveBlock({ url })}
                      label="Image du bloc"
                    />
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Legende
                      </label>
                      <input
                        type="text"
                        value={activeBlock.caption || ''}
                        onChange={(event) => patchActiveBlock({ caption: event.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}

                {activeBlock.type === 'code' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Langage
                      </label>
                      <input
                        type="text"
                        value={activeBlock.language || 'js'}
                        onChange={(event) => patchActiveBlock({ language: event.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Code
                      </label>
                      <textarea
                        value={activeBlock.content || ''}
                        onChange={(event) => patchActiveBlock({ content: event.target.value })}
                        rows={7}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-y"
                        style={{ ...inputStyle, fontFamily: 'JetBrains Mono Variable, monospace' }}
                      />
                    </div>
                  </>
                )}

                {activeBlock.type === 'list' && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Items (1 ligne = 1 item)
                    </label>
                    <textarea
                      value={(Array.isArray(activeBlock.items) ? activeBlock.items : [])
                        .map((item) => (typeof item === 'string' ? item : item?.content || ''))
                        .join('\n')}
                      onChange={(event) => {
                        const items = event.target.value
                          .split(/\r?\n/)
                          .map((line) => line.trim())
                          .filter(Boolean)
                        patchActiveBlock({ items: items.length > 0 ? items : [''] })
                      }}
                      rows={6}
                      className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-y"
                      style={inputStyle}
                    />
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Tip: pour les listes imbriquees, utilise directement le canvas BlockEditor.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div
              className="rounded-lg border p-2 text-xs"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
            >
              Historique: {historyCursor + 1}/{historyStack.length}
            </div>
          </aside>
        </div>

        {commandOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}>
            <div
              className="w-full max-w-2xl rounded-2xl border p-3 space-y-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
            >
              <div className="flex items-center gap-2">
                <MagnifyingGlassIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                <input
                  ref={commandInputRef}
                  type="text"
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Tape une commande..."
                  className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setCommandOpen(false)}
                  className="p-1.5 rounded"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Fermer la palette"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1">
                {filteredCommandActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.run()
                      setCommandOpen(false)
                      setCommandQuery('')
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
