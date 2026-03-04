/* Éditeur d'articles par blocs */
import { useState } from 'react'
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
} from '@heroicons/react/24/outline'
import ImageUploader from '../ui/ImageUploader.jsx'

/* Style commun des inputs/textareas */
const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all'

/* Génère un identifiant unique de bloc */
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/* --- Sous-composants de blocs --- */

function ParagraphBlock({ block, onChange }) {
  return (
    <textarea
      value={block.content}
      onChange={(e) => onChange({ ...block, content: e.target.value })}
      rows={6}
      placeholder="Contenu du paragraphe…"
      className={`${inputClass} resize-y`}
      style={inputStyle}
    />
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
        placeholder="Titre…"
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
        placeholder="Légende (optionnelle)…"
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
        placeholder="Code…"
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
        placeholder="Citation…"
        className={`${inputClass} resize-y`}
        style={inputStyle}
      />
      <input
        type="text"
        value={block.author}
        onChange={(e) => onChange({ ...block, author: e.target.value })}
        placeholder="Auteur (optionnel)…"
        className={inputClass}
        style={inputStyle}
      />
    </div>
  )
}

/* --- Nouveau bloc Liste --- */
function ListBlock({ block, onChange }) {
  const updateItem = (path, val) => {
    const newItems = JSON.parse(JSON.stringify(block.items)) // clone profond
    let ref = newItems
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]].items
    ref[path[path.length - 1]] = val
    onChange({ ...block, items: newItems })
  }

  const addItem = (path) => {
    const newItems = JSON.parse(JSON.stringify(block.items))
    let ref = newItems
    for (let i = 0; i < path.length; i++) {
      if (typeof ref[path[i]] === 'string') {
        // si c'est une string, transforme en objet avec content et items
        ref[path[i]] = { content: ref[path[i]], items: [] }
      } else if (!ref[path[i]].items) {
        ref[path[i]].items = []
      }
      ref = ref[path[i]].items
    }
    ref.push('') // ajoute un nouvel item vide
    onChange({ ...block, items: newItems })
  }

  const removeItem = (path) => {
    const newItems = JSON.parse(JSON.stringify(block.items))
    let ref = newItems
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]].items
    ref.splice(path[path.length - 1], 1)
    onChange({ ...block, items: newItems })
  }

  const moveItem = (path, dir) => {
    const newItems = JSON.parse(JSON.stringify(block.items))
    let ref = newItems
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]].items
    const t = path[path.length - 1] + dir
    if (t < 0 || t >= ref.length) return
    ;[ref[path[path.length - 1]], ref[t]] = [ref[t], ref[path[path.length - 1]]]
    onChange({ ...block, items: newItems })
  }

  const renderItem = (item, path = []) => {
    const currentPath = [...path]
    return (
      <div key={currentPath.join('-')} className="ml-0 space-y-1">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={typeof item === 'string' ? item : item.content}
            onChange={(e) => {
              if (typeof item === 'string') updateItem(currentPath, e.target.value)
              else updateItem(currentPath, { ...item, content: e.target.value })
            }}
            placeholder={`Élément…`}
            className={`${inputClass} flex-1`}
            style={inputStyle}
          />
          <div className="flex gap-1">
            <button type="button" onClick={() => moveItem(currentPath, -1)} disabled={currentPath[currentPath.length-1]===0} className="p-1 rounded disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
              <ChevronUpIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => moveItem(currentPath, 1)} className="p-1 rounded disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]">
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => removeItem(currentPath)} className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] text-red-400">
              <TrashIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => addItem(currentPath)} className="p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] text-green-400">
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Sous-items */}
        {item.items && item.items.length > 0 && (
          <div className="ml-6 border-l border-dashed border-gray-400 pl-2">
            {item.items.map((sub, i) => renderItem(sub, [...currentPath, i]))}
          </div>
        )}
      </div>
    )
  }

  return <div className="space-y-2">{block.items.map((item, i) => renderItem(item, [i]))}</div>
}

/* Définition des types de blocs disponibles */
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

/* Rendu du bon sous-composant selon le type de bloc */
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
 * Éditeur modulaire par blocs.
 *
 * Props :
 *   blocks    — tableau de blocs
 *   onChange  — callback(blocks) appelé à chaque modification
 */
export default function BlockEditor({ blocks = [], onChange }) {
  const updateBlock = (index, updated) => {
    const next = [...blocks]
    next[index] = updated
    onChange(next)
  }

  const removeBlock = (index) => {
    onChange(blocks.filter((_, i) => i !== index))
  }

  const moveBlock = (index, direction) => {
    const next = [...blocks]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const addBlock = (typeDef) => {
    onChange([...blocks, typeDef.defaultData()])
  }

  return (
    <div className="space-y-3">
      {/* Liste des blocs */}
      {blocks.map((block, index) => {
        const typeDef = BLOCK_TYPES.find((t) => t.type === block.type)
        return (
          <div
            key={block.id}
            className="rounded-lg border p-3 space-y-2"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            {/* En-tête du bloc */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {typeDef?.Icon && (
                  <typeDef.Icon className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
                )}
                {typeDef?.label ?? block.type}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  className="p-1 rounded disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Déplacer vers le haut"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                  className="p-1 rounded disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Déplacer vers le bas"
                >
                  <ChevronDownIcon className="h-4 w-4" />
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

            {/* Contenu du bloc */}
            <BlockContent block={block} onChange={(updated) => updateBlock(index, updated)} />
          </div>
        )
      })}

      {/* Barre d'ajout de bloc */}
      <div
        className="flex flex-wrap gap-2 pt-1"
        role="group"
        aria-label="Ajouter un bloc"
      >
        {BLOCK_TYPES.map((typeDef) => (
          <button
            key={typeDef.type}
            type="button"
            onClick={() => addBlock(typeDef)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
  )
}