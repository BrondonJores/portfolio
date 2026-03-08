/* Editeur d'articles par blocs (version modernisee). */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  Bars3BottomLeftIcon,
  PhotoIcon,
  CodeBracketIcon,
  ChatBubbleLeftIcon,
  ListBulletIcon,
  DocumentDuplicateIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import ImageUploader from '../ui/ImageUploader.jsx'

/* Style commun des champs de formulaire de l'editeur. */
const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all'

/* Genere un identifiant unique pour chaque bloc. */
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/* Clone un objet/tableau en profondeur (fallback si structuredClone absent). */
function safeClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

/* Derive une liste d'elements depuis le contenu d'un bloc. */
function deriveListItems(block) {
  if (Array.isArray(block.items) && block.items.length > 0) {
    return safeClone(block.items)
  }

  const seed = block.content || block.caption || ''
  const lines = String(seed)
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.length > 0 ? lines : ['']
}

/* Transforme un bloc existant vers un nouveau type en conservant un minimum de contenu. */
function transformBlockToType(currentBlock, typeDef) {
  const base = typeDef.defaultData()
  const text = currentBlock.content || currentBlock.caption || ''

  switch (typeDef.type) {
    case 'paragraph':
      base.content = text
      break
    case 'heading':
      base.content = text
      base.level = currentBlock.level === 3 ? 3 : 2
      break
    case 'image':
      base.url = currentBlock.url || ''
      base.caption = text
      break
    case 'code':
      base.content = currentBlock.content || ''
      base.language = currentBlock.language || 'js'
      break
    case 'quote':
      base.content = text
      base.author = currentBlock.author || ''
      break
    case 'list':
      base.items = deriveListItems(currentBlock)
      break
    default:
      break
  }

  return { ...base, id: currentBlock.id }
}

/**
 * Normalise un bloc de template vers un format compatible editeur.
 * @param {object} block Bloc source.
 * @returns {object} Bloc normalise sans identifiant.
 */
function normalizeTemplateBlock(block) {
  const type = block?.type || 'paragraph'

  switch (type) {
    case 'heading':
      return {
        type: 'heading',
        level: block?.level === 3 ? 3 : 2,
        content: String(block?.content || ''),
      }
    case 'image':
      return {
        type: 'image',
        url: String(block?.url || ''),
        caption: String(block?.caption || ''),
      }
    case 'code':
      return {
        type: 'code',
        language: String(block?.language || 'js'),
        content: String(block?.content || ''),
      }
    case 'quote':
      return {
        type: 'quote',
        content: String(block?.content || ''),
        author: String(block?.author || ''),
      }
    case 'list':
      return {
        type: 'list',
        items: Array.isArray(block?.items) && block.items.length > 0 ? safeClone(block.items) : [''],
      }
    case 'paragraph':
    default:
      return {
        type: 'paragraph',
        content: String(block?.content || ''),
      }
  }
}

/**
 * Instancie les blocs d'un template avec des ids uniques.
 * @param {Array<object>} blocksFromTemplate Blocs du template.
 * @returns {Array<object>} Blocs prets a inserer.
 */
function instantiateTemplateBlocks(blocksFromTemplate) {
  return (Array.isArray(blocksFromTemplate) ? blocksFromTemplate : [])
    .map((block) => ({ ...normalizeTemplateBlock(block), id: genId() }))
}

/**
 * Indique si la cible de l'evenement est un champ de saisie texte.
 * @param {EventTarget | null} target Cible de l'evenement clavier.
 * @returns {boolean} true si la cible est editable.
 */
function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea') return true
  return target.isContentEditable
}

/* --- Sous-composants de blocs --- */

function ParagraphBlock({ block, onChange }) {
  return (
    <div className="space-y-2">
      <textarea
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        rows={6}
        placeholder="Contenu du paragraphe..."
        className={`${inputClass} resize-y`}
        style={inputStyle}
      />
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {String(block.content || '').length} caracteres
      </p>
    </div>
  )
}

function HeadingBlock({ block, onChange }) {
  return (
    <div className="flex gap-2">
      <select
        value={block.level}
        onChange={(e) => onChange({ ...block, level: Number(e.target.value) })}
        className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
        style={inputStyle}
      >
        <option value={2}>H2</option>
        <option value={3}>H3</option>
      </select>
      <input
        type="text"
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="Titre..."
        className={`${inputClass} flex-1`}
        style={inputStyle}
      />
    </div>
  )
}

function ImageBlock({ block, onChange }) {
  return (
    <div className="space-y-2">
      <ImageUploader
        value={block.url}
        onUpload={(url) => onChange({ ...block, url })}
        label="Image du bloc"
      />
      <input
        type="text"
        value={block.caption}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Legende (optionnelle)..."
        className={inputClass}
        style={inputStyle}
      />
    </div>
  )
}

function CodeBlock({ block, onChange }) {
  return (
    <div className="space-y-2">
      <select
        value={block.language}
        onChange={(e) => onChange({ ...block, language: e.target.value })}
        className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
        style={inputStyle}
      >
        {['js', 'ts', 'python', 'php', 'java', 'c', 'cpp', 'html', 'css', 'sql', 'bash', 'json', 'yaml'].map(
          (lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          )
        )}
      </select>
      <textarea
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        rows={8}
        placeholder="Code..."
        className={`${inputClass} resize-y font-mono`}
        style={{ ...inputStyle, fontFamily: 'JetBrains Mono Variable, monospace' }}
        spellCheck={false}
      />
    </div>
  )
}

function QuoteBlock({ block, onChange }) {
  return (
    <div className="space-y-2">
      <textarea
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        rows={3}
        placeholder="Citation..."
        className={`${inputClass} resize-y`}
        style={inputStyle}
      />
      <input
        type="text"
        value={block.author}
        onChange={(e) => onChange({ ...block, author: e.target.value })}
        placeholder="Auteur (optionnel)..."
        className={inputClass}
        style={inputStyle}
      />
    </div>
  )
}

/* Normalise un item de liste vers la forme objet. */
function toListNode(item) {
  if (typeof item === 'string') {
    return { content: item, items: [] }
  }
  return { content: item?.content || '', items: Array.isArray(item?.items) ? item.items : [] }
}

function ListBlock({ block, onChange }) {
  const items = Array.isArray(block.items) ? block.items : ['']

  const updateItems = (nextItems) => {
    onChange({ ...block, items: nextItems })
  }

  const updateItemContent = (path, content) => {
    const nextItems = safeClone(items)
    let cursor = nextItems

    for (let i = 0; i < path.length - 1; i++) {
      const idx = path[i]
      cursor[idx] = toListNode(cursor[idx])
      cursor = cursor[idx].items
    }

    const target = path[path.length - 1]
    if (typeof cursor[target] === 'string') {
      cursor[target] = content
    } else {
      cursor[target] = { ...cursor[target], content }
    }

    updateItems(nextItems)
  }

  const addSibling = (path) => {
    const nextItems = safeClone(items)
    let cursor = nextItems

    for (let i = 0; i < path.length - 1; i++) {
      const idx = path[i]
      cursor[idx] = toListNode(cursor[idx])
      cursor = cursor[idx].items
    }

    const at = path[path.length - 1]
    cursor.splice(at + 1, 0, '')
    updateItems(nextItems)
  }

  const addChild = (path) => {
    const nextItems = safeClone(items)
    let cursor = nextItems

    for (let i = 0; i < path.length - 1; i++) {
      const idx = path[i]
      cursor[idx] = toListNode(cursor[idx])
      cursor = cursor[idx].items
    }

    const at = path[path.length - 1]
    cursor[at] = toListNode(cursor[at])
    cursor[at].items.push('')
    updateItems(nextItems)
  }

  const removeItem = (path) => {
    const nextItems = safeClone(items)
    let cursor = nextItems

    for (let i = 0; i < path.length - 1; i++) {
      const idx = path[i]
      cursor[idx] = toListNode(cursor[idx])
      cursor = cursor[idx].items
    }

    const at = path[path.length - 1]
    cursor.splice(at, 1)

    if (nextItems.length === 0) {
      updateItems([''])
      return
    }

    updateItems(nextItems)
  }

  const moveItem = (path, direction) => {
    const nextItems = safeClone(items)
    let cursor = nextItems

    for (let i = 0; i < path.length - 1; i++) {
      const idx = path[i]
      cursor[idx] = toListNode(cursor[idx])
      cursor = cursor[idx].items
    }

    const at = path[path.length - 1]
    const target = at + direction
    if (target < 0 || target >= cursor.length) return

    ;[cursor[at], cursor[target]] = [cursor[target], cursor[at]]
    updateItems(nextItems)
  }

  const renderItem = (item, path = [], depth = 0) => {
    const currentValue = typeof item === 'string' ? item : item.content
    const hasChildren = typeof item !== 'string' && Array.isArray(item.items) && item.items.length > 0
    const indexInLevel = path[path.length - 1]

    return (
      <div key={path.join('-')} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={currentValue}
            onChange={(e) => updateItemContent(path, e.target.value)}
            placeholder="Element de liste..."
            className={`${inputClass} flex-1`}
            style={inputStyle}
          />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => moveItem(path, -1)}
              disabled={indexInLevel === 0}
              className="p-1 rounded disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              aria-label="Monter l'element"
            >
              <ChevronUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => moveItem(path, 1)}
              className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              aria-label="Descendre l'element"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => addSibling(path)}
              className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              aria-label="Ajouter un element au meme niveau"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => addChild(path)}
              disabled={depth >= 3}
              className="p-1 rounded disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              aria-label="Ajouter un sous-element"
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => removeItem(path)}
              className="p-1 rounded text-red-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              aria-label="Supprimer l'element"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {hasChildren && (
          <div className="ml-6 border-l border-dashed pl-3" style={{ borderColor: 'var(--color-border)' }}>
            {item.items.map((subItem, i) => renderItem(subItem, [...path, i], depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => renderItem(item, [i], 0))}
    </div>
  )
}

/* Definition des types de blocs disponibles. */
const BLOCK_TYPES = [
  {
    type: 'paragraph',
    label: 'Paragraphe',
    Icon: DocumentTextIcon,
    defaultData: () => ({ id: genId(), type: 'paragraph', content: '' }),
  },
  {
    type: 'heading',
    label: 'Titre',
    Icon: Bars3BottomLeftIcon,
    defaultData: () => ({ id: genId(), type: 'heading', level: 2, content: '' }),
  },
  {
    type: 'image',
    label: 'Image',
    Icon: PhotoIcon,
    defaultData: () => ({ id: genId(), type: 'image', url: '', caption: '' }),
  },
  {
    type: 'code',
    label: 'Code',
    Icon: CodeBracketIcon,
    defaultData: () => ({ id: genId(), type: 'code', language: 'js', content: '' }),
  },
  {
    type: 'quote',
    label: 'Citation',
    Icon: ChatBubbleLeftIcon,
    defaultData: () => ({ id: genId(), type: 'quote', content: '', author: '' }),
  },
  {
    type: 'list',
    label: 'Liste',
    Icon: ListBulletIcon,
    defaultData: () => ({ id: genId(), type: 'list', items: [''] }),
  },
]

/* Rend le sous-composant correspondant au type du bloc. */
function BlockContent({ block, onChange }) {
  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock block={block} onChange={onChange} />
    case 'heading':
      return <HeadingBlock block={block} onChange={onChange} />
    case 'image':
      return <ImageBlock block={block} onChange={onChange} />
    case 'code':
      return <CodeBlock block={block} onChange={onChange} />
    case 'quote':
      return <QuoteBlock block={block} onChange={onChange} />
    case 'list':
      return <ListBlock block={block} onChange={onChange} />
    default:
      return null
  }
}

/**
 * Editeur modulaire par blocs.
 * @param {object} props Propriete du composant.
 * @param {Array<object>} props.blocks Tableau des blocs.
 * @param {Function} props.onChange Callback appele avec la nouvelle liste.
 * @param {Array<{id: string, label: string, description?: string, blocks: Array<object>}>} [props.templates] Templates predefinis optionnels.
 * @param {string | null} [props.activeBlockId] Bloc actif force depuis le parent.
 * @param {(blockId: string | null) => void} [props.onActiveBlockChange] Callback changement de bloc actif.
 * @returns {JSX.Element} Interface de gestion des blocs.
 */
export default function BlockEditor({
  blocks = [],
  onChange,
  templates = [],
  activeBlockId: externalActiveBlockId = null,
  onActiveBlockChange,
}) {
  const [paletteQuery, setPaletteQuery] = useState('')
  const [insertionIndex, setInsertionIndex] = useState(null)
  const [collapsedMap, setCollapsedMap] = useState({})
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [activeBlockId, setActiveBlockId] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const rootRef = useRef(null)

  const availableTemplates = useMemo(() => {
    if (!Array.isArray(templates)) return []

    return templates.filter(
      (template) => template?.id && template?.label && Array.isArray(template?.blocks) && template.blocks.length > 0
    )
  }, [templates])

  const filteredTypes = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase()
    if (!q) return BLOCK_TYPES
    return BLOCK_TYPES.filter((typeDef) => typeDef.label.toLowerCase().includes(q))
  }, [paletteQuery])

  const activeIndex = useMemo(
    () => blocks.findIndex((block) => block.id === activeBlockId),
    [blocks, activeBlockId]
  )

  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === selectedTemplateId) || null,
    [availableTemplates, selectedTemplateId]
  )

  useEffect(() => {
    if (blocks.length === 0) {
      setActiveBlockId(null)
      return
    }

    if (!activeBlockId || !blocks.some((block) => block.id === activeBlockId)) {
      setActiveBlockId(blocks[0].id)
    }
  }, [blocks, activeBlockId])

  useEffect(() => {
    if (!externalActiveBlockId) return
    if (!blocks.some((block) => block.id === externalActiveBlockId)) return
    if (externalActiveBlockId === activeBlockId) return
    setActiveBlockId(externalActiveBlockId)
  }, [externalActiveBlockId, blocks, activeBlockId])

  useEffect(() => {
    if (typeof onActiveBlockChange !== 'function') return
    onActiveBlockChange(activeBlockId || null)
  }, [activeBlockId, onActiveBlockChange])

  useEffect(() => {
    if (availableTemplates.length === 0) {
      setSelectedTemplateId('')
      return
    }

    if (!selectedTemplateId || !availableTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(availableTemplates[0].id)
    }
  }, [availableTemplates, selectedTemplateId])

  /**
   * Donne le focus a la carte d'un bloc specifique.
   * @param {string | null} blockId Identifiant du bloc.
   * @returns {void}
   */
  const focusBlockCard = (blockId) => {
    if (!blockId || !rootRef.current) return
    const target = rootRef.current.querySelector(`[data-block-card-id="${blockId}"]`)
    if (target instanceof HTMLElement) {
      target.focus()
    }
  }

  const updateBlock = (index, updated) => {
    const next = [...blocks]
    next[index] = updated
    onChange(next)
  }

  const removeBlock = (index) => {
    const target = blocks[index]
    const next = blocks.filter((_, i) => i !== index)
    onChange(next)

    if (target?.id !== activeBlockId) return
    const nextActive = next[Math.min(index, next.length - 1)]?.id || null
    setActiveBlockId(nextActive)
    setTimeout(() => focusBlockCard(nextActive), 0)
  }

  const moveBlock = (index, direction) => {
    const next = [...blocks]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    setTimeout(() => focusBlockCard(next[target]?.id || null), 0)
  }

  const duplicateBlock = (index) => {
    const source = blocks[index]
    if (!source) return
    const clone = safeClone(source)
    clone.id = genId()

    const next = [...blocks]
    next.splice(index + 1, 0, clone)
    onChange(next)
    setActiveBlockId(clone.id)
    setTimeout(() => focusBlockCard(clone.id), 0)
  }

  const changeBlockType = (index, nextType) => {
    const typeDef = BLOCK_TYPES.find((entry) => entry.type === nextType)
    if (!typeDef) return

    const current = blocks[index]
    if (!current || current.type === nextType) return

    const transformed = transformBlockToType(current, typeDef)
    updateBlock(index, transformed)
  }

  const addBlockAt = (typeDef, atIndex = blocks.length) => {
    const next = [...blocks]
    const created = typeDef.defaultData()
    next.splice(atIndex, 0, created)
    onChange(next)
    setActiveBlockId(created.id)
    setTimeout(() => focusBlockCard(created.id), 0)
    setInsertionIndex(null)
  }

  /**
   * Insere les blocs du template selectionne apres le bloc actif.
   * @returns {void}
   */
  const insertSelectedTemplate = () => {
    if (!selectedTemplate) return

    const createdBlocks = instantiateTemplateBlocks(selectedTemplate.blocks)
    if (createdBlocks.length === 0) return

    const at = activeIndex >= 0 ? activeIndex + 1 : blocks.length
    const next = [...blocks]
    next.splice(at, 0, ...createdBlocks)
    onChange(next)

    setActiveBlockId(createdBlocks[0].id)
    setTimeout(() => focusBlockCard(createdBlocks[0].id), 0)
  }

  /**
   * Remplace le contenu actuel par le template selectionne.
   * @returns {void}
   */
  const replaceWithSelectedTemplate = () => {
    if (!selectedTemplate) return

    if (blocks.length > 0 && typeof window !== 'undefined') {
      const confirmed = window.confirm('Remplacer tout le contenu actuel par ce template ?')
      if (!confirmed) return
    }

    const createdBlocks = instantiateTemplateBlocks(selectedTemplate.blocks)
    onChange(createdBlocks)
    setCollapsedMap({})
    setInsertionIndex(null)

    const firstBlockId = createdBlocks[0]?.id || null
    setActiveBlockId(firstBlockId)
    setTimeout(() => focusBlockCard(firstBlockId), 0)
  }

  const toggleCollapsed = (blockId) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }))
  }

  const handleDragStart = (event, index) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (event, index) => {
    event.preventDefault()
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (event, index) => {
    event.preventDefault()

    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const next = [...blocks]
    const [moved] = next.splice(dragIndex, 1)
    const target = dragIndex < index ? index - 1 : index
    next.splice(target, 0, moved)

    onChange(next)
    const keptActive = activeBlockId && next.some((entry) => entry.id === activeBlockId) ? activeBlockId : next[target]?.id
    setActiveBlockId(keptActive || null)
    setTimeout(() => focusBlockCard(keptActive || null), 0)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  /**
   * Gere les raccourcis clavier de productivite de l'editeur.
   * @param {React.KeyboardEvent<HTMLDivElement>} event Evenement clavier.
   * @returns {void}
   */
  const handleEditorKeyDown = (event) => {
    const key = event.key.toLowerCase()
    const withMainModifier = event.ctrlKey || event.metaKey
    const typingTarget = isTypingTarget(event.target)

    if (withMainModifier && event.shiftKey) {
      const shortcutMap = {
        p: 'paragraph',
        h: 'heading',
        i: 'image',
        c: 'code',
        q: 'quote',
        l: 'list',
      }
      const type = shortcutMap[key]
      if (!type) return

      const typeDef = BLOCK_TYPES.find((entry) => entry.type === type)
      if (!typeDef) return

      event.preventDefault()
      const at = activeIndex >= 0 ? activeIndex + 1 : blocks.length
      addBlockAt(typeDef, at)
      return
    }

    if (!event.altKey || withMainModifier || event.shiftKey) return
    if (activeIndex < 0) return

    if (key === 'arrowup') {
      event.preventDefault()
      moveBlock(activeIndex, -1)
      return
    }

    if (key === 'arrowdown') {
      event.preventDefault()
      moveBlock(activeIndex, 1)
      return
    }

    if (key === 'd' && !typingTarget) {
      event.preventDefault()
      duplicateBlock(activeIndex)
      return
    }

    if (key === 'backspace' || key === 'delete') {
      event.preventDefault()
      removeBlock(activeIndex)
    }
  }

  const renderInsertControl = (position) => {
    const isOpen = insertionIndex === position

    if (!isOpen) {
      return (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setInsertionIndex(position)}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-primary)',
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Inserer ici
          </button>
        </div>
      )
    }

    return (
      <div
        className="rounded-xl border p-3 space-y-3"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Inserer un bloc a la position {position + 1}
          </p>
          <button
            type="button"
            onClick={() => setInsertionIndex(null)}
            className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Fermer le menu d'insertion"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BLOCK_TYPES.map((typeDef) => (
            <button
              key={`${position}-${typeDef.type}`}
              type="button"
              onClick={() => addBlockAt(typeDef, position)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-primary)',
              }}
            >
              <typeDef.Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {typeDef.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="space-y-4" onKeyDown={handleEditorKeyDown}>
      <div
        className="rounded-xl border p-3 space-y-3"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Composer en blocs
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Raccourcis: Ctrl+Shift+P/H/I/C/Q/L (ajouter), Alt+haut/bas (deplacer), Alt+D
            (dupliquer), Alt+Suppr (supprimer).
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={paletteQuery}
            onChange={(e) => setPaletteQuery(e.target.value)}
            placeholder="Rechercher un type de bloc..."
            className={`${inputClass} sm:max-w-xs`}
            style={inputStyle}
          />

          <div className="flex flex-wrap gap-2">
            {filteredTypes.map((typeDef) => (
              <button
                key={`quick-${typeDef.type}`}
                type="button"
                onClick={() => addBlockAt(typeDef)}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              >
                <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <typeDef.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {typeDef.label}
              </button>
            ))}
          </div>
        </div>

        {availableTemplates.length > 0 && (
          <div
            className="rounded-lg border p-3 space-y-2"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-primary)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              Templates rapides
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all sm:min-w-56"
                style={inputStyle}
                aria-label="Choisir un template"
              >
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={insertSelectedTemplate}
                  disabled={!selectedTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}
                >
                  <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Inserer template
                </button>

                <button
                  type="button"
                  onClick={replaceWithSelectedTemplate}
                  disabled={!selectedTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}
                >
                  <DocumentDuplicateIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Remplacer tout
                </button>
              </div>
            </div>

            {selectedTemplate?.description && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedTemplate.description}
              </p>
            )}
          </div>
        )}
      </div>

      {blocks.length === 0 && (
        <div
          className="rounded-xl border border-dashed p-6 text-center"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Aucun bloc pour le moment. Ajoute ton premier bloc avec les boutons ci-dessus.
          </p>
        </div>
      )}

      {blocks.map((block, index) => {
        const typeDef = BLOCK_TYPES.find((entry) => entry.type === block.type)
        const isCollapsed = Boolean(collapsedMap[block.id])
        const isDropTarget = dragOverIndex === index
        const isActive = activeBlockId === block.id

        return (
          <div key={block.id} className="space-y-2">
            {renderInsertControl(index)}

            <article
              data-block-card-id={block.id}
              tabIndex={0}
              className="rounded-xl border p-3 space-y-3"
              style={{
                borderColor: isDropTarget || isActive ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                boxShadow: isDropTarget || isActive ? '0 0 0 1px var(--color-accent)' : 'none',
              }}
              onClick={() => setActiveBlockId(block.id)}
              onFocusCapture={() => setActiveBlockId(block.id)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={(event) => handleDrop(event, index)}
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => handleDragStart(event, index)}
                    onDragEnd={handleDragEnd}
                    className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-label="Glisser pour reordonner"
                    title="Glisser pour reordonner"
                  >
                    <ArrowsUpDownIcon className="h-4 w-4" />
                  </button>

                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    Bloc {index + 1}
                  </span>

                  <span className="text-xs inline-flex items-center gap-1 rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {typeDef?.Icon && <typeDef.Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                    {typeDef?.label || block.type}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <select
                    value={block.type}
                    onChange={(event) => changeBlockType(index, event.target.value)}
                    className="px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={inputStyle}
                    aria-label="Changer le type de bloc"
                  >
                    {BLOCK_TYPES.map((entry) => (
                      <option key={`${block.id}-${entry.type}`} value={entry.type}>
                        {entry.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                    className="p-1 rounded disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-label="Deplacer vers le haut"
                  >
                    <ChevronUpIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                    className="p-1 rounded disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-label="Deplacer vers le bas"
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => duplicateBlock(index)}
                    className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-label="Dupliquer le bloc"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCollapsed(block.id)}
                    className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-label={isCollapsed ? 'Afficher le bloc' : 'Masquer le bloc'}
                  >
                    {isCollapsed ? <ChevronDownIcon className="h-4 w-4" /> : <Bars3BottomLeftIcon className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeBlock(index)}
                    className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    style={{ color: '#f87171' }}
                    aria-label="Supprimer le bloc"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <BlockContent block={block} onChange={(updated) => updateBlock(index, updated)} />
              )}
            </article>
          </div>
        )
      })}

      {renderInsertControl(blocks.length)}
    </div>
  )
}
