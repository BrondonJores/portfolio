/* Composant de rendu public des blocs (JSON moderne + fallback HTML legacy). */
import { useState } from 'react'
import { ClipboardIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import DOMPurify from 'dompurify'

const SECTION_LAYOUT_COLUMNS = {
  '1-col': 1,
  '2-col': 2,
  '3-col': 3,
}

const SECTION_LAYOUT_CLASSES = {
  '1-col': 'grid-cols-1',
  '2-col': 'grid-cols-1 md:grid-cols-2',
  '3-col': 'grid-cols-1 md:grid-cols-3',
}

const SECTION_SPACING_CLASSES = {
  sm: 'py-4',
  md: 'py-8',
  lg: 'py-12',
}

/**
 * Deserialise le contenu JSON moderne.
 * Retourne un tableau de blocs ou `null` si c'est du HTML legacy.
 * @param {string} content Contenu stocke.
 * @returns {Array<object>|null} Blocs JSON ou null.
 */
function parseContent(content) {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      return parsed.blocks
    }
  } catch {
    /* Contenu HTML legacy */
  }
  return null
}

/**
 * Nettoie une URL image pour limiter les schemas abusifs.
 * @param {unknown} value URL brute.
 * @returns {string} URL autorisee ou chaine vide.
 */
function toSafeImageUrl(value) {
  const url = String(value || '').trim()
  if (!url) return ''
  if (url.startsWith('/')) return url
  if (/^https?:\/\//i.test(url)) return url
  if (/^data:image\//i.test(url)) return url
  return ''
}

/**
 * Genere un id ancre a partir d'un titre.
 * @param {string} text Texte de titre.
 * @returns {string|undefined} Id slugifie.
 */
function slugifyHeading(text) {
  if (!text) return undefined
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Normalise le layout section.
 * @param {unknown} value Layout brut.
 * @returns {'1-col'|'2-col'|'3-col'} Layout section.
 */
function normalizeSectionLayout(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(SECTION_LAYOUT_COLUMNS, normalized)) {
    return normalized
  }
  return '2-col'
}

/**
 * Normalise le variant section.
 * @param {unknown} value Variant brut.
 * @returns {'default'|'soft'|'accent'} Variant section.
 */
function normalizeSectionVariant(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'soft' || normalized === 'accent') {
    return normalized
  }
  return 'default'
}

/**
 * Normalise l'espacement section.
 * @param {unknown} value Spacing brut.
 * @returns {'sm'|'md'|'lg'} Spacing section.
 */
function normalizeSectionSpacing(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'sm' || normalized === 'lg') {
    return normalized
  }
  return 'md'
}

/* Rendu d'un bloc paragraphe. */
function ParagraphBlock({ block }) {
  return (
    <p className="mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
      {block.content}
    </p>
  )
}

/* Rendu d'un bloc titre. */
function HeadingBlock({ block }) {
  const Tag = `h${block.level ?? 2}`
  const id = (block.level === 2 || block.level === 3) ? slugifyHeading(block.content) : undefined
  return (
    <Tag
      id={id}
      className="font-bold mb-3 mt-6 leading-snug"
      style={{
        color: 'var(--color-text-primary)',
        fontSize: block.level === 2 ? '1.5rem' : '1.25rem',
      }}
    >
      {block.content}
    </Tag>
  )
}

/* Rendu d'un bloc image. */
function ImageBlock({ block }) {
  const safeUrl = toSafeImageUrl(block.url)
  if (!safeUrl) return null
  return (
    <figure className="mb-6">
      <img
        src={safeUrl}
        alt={block.caption || ''}
        className="rounded-lg w-full object-cover"
        style={{ borderColor: 'var(--color-border)' }}
        loading="lazy"
      />
      {block.caption && (
        <figcaption
          className="text-sm text-center mt-2 italic"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}

/* Rendu d'un bloc code avec bouton copier. */
function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(block.content || '')
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <pre
      className={`relative mb-4 p-4 rounded-lg overflow-x-auto text-sm language-${block.language ?? 'text'}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-primary)',
        fontFamily: 'JetBrains Mono Variable, monospace',
        border: '1px solid var(--color-border)',
      }}
    >
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded text-xs transition-colors focus:outline-none"
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        }}
        title={copied ? 'Copie' : 'Copier le code'}
        aria-label={copied ? 'Code copie' : 'Copier le code'}
      >
        {copied
          ? <ClipboardDocumentCheckIcon className="h-4 w-4" aria-hidden="true" />
          : <ClipboardIcon className="h-4 w-4" aria-hidden="true" />
        }
      </button>
      <code className={`language-${block.language ?? 'text'}`}>{block.content}</code>
    </pre>
  )
}

/* Rendu d'un bloc citation. */
function QuoteBlock({ block }) {
  return (
    <blockquote
      className="mb-4 pl-4 border-l-4 italic"
      style={{
        borderColor: 'var(--color-accent)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <p className="mb-1">{block.content}</p>
      {block.author && (
        <cite
          className="text-sm not-italic font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          - {block.author}
        </cite>
      )}
    </blockquote>
  )
}

/* Rendu d'un bloc liste avec sous-listes. */
function ListBlock({ block }) {
  if (!block.items || !block.items.length) return null

  const renderItems = (items, level = 0) => (
    <ul
      className="mb-4 list-disc list-inside"
      style={{ paddingLeft: `${level * 1.25}rem` }}
    >
      {items.map((item, index) => {
        if (typeof item === 'string') {
          return (
            <li
              key={`item-${level}-${index}`}
              style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}
            >
              {item}
            </li>
          )
        }

        if (typeof item === 'object' && item.content) {
          return (
            <li
              key={`item-${level}-${index}`}
              style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}
            >
              {item.content}
              {item.items && item.items.length > 0 && renderItems(item.items, level + 1)}
            </li>
          )
        }

        return null
      })}
    </ul>
  )

  return renderItems(block.items)
}

/**
 * Rend une section avec colonnes et widgets.
 * @param {object} props Props React.
 * @param {object} props.block Bloc section.
 * @param {number} props.depth Profondeur courante.
 * @returns {JSX.Element|null} Section rendue.
 */
function SectionBlock({ block, depth }) {
  if (depth >= 2) return null

  const layout = normalizeSectionLayout(block.layout)
  const variant = normalizeSectionVariant(block.variant)
  const spacing = normalizeSectionSpacing(block.spacing)
  const anchor = String(block.anchor || '').trim() || undefined
  const columnCount = SECTION_LAYOUT_COLUMNS[layout] || 2
  const sourceColumns = Array.isArray(block.columns) ? block.columns : []
  const columns = Array.from({ length: columnCount }, (_, index) => {
    return Array.isArray(sourceColumns[index]) ? sourceColumns[index] : []
  })

  const sectionStyle =
    variant === 'accent'
      ? {
        borderColor: 'color-mix(in srgb, var(--color-accent) 35%, var(--color-border))',
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
      }
      : variant === 'soft'
        ? {
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }
        : {
          borderColor: 'transparent',
          backgroundColor: 'transparent',
        }

  return (
    <section id={anchor} className={`mb-8 rounded-2xl border px-4 ${SECTION_SPACING_CLASSES[spacing] || SECTION_SPACING_CLASSES.md}`} style={sectionStyle}>
      <div className={`grid gap-6 ${SECTION_LAYOUT_CLASSES[layout] || SECTION_LAYOUT_CLASSES['2-col']}`}>
        {columns.map((widgets, columnIndex) => (
          <div key={`col-${columnIndex}`} className="min-w-0">
            {widgets.map((widget, widgetIndex) => (
              <Block key={widget?.id || `widget-${columnIndex}-${widgetIndex}`} block={widget} depth={depth + 1} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Rend un bloc en fonction de son type.
 * @param {object} props Props React.
 * @param {object} props.block Bloc a rendre.
 * @param {number} [props.depth=0] Profondeur courante (anti-recursion).
 * @returns {JSX.Element|null} Bloc rendu.
 */
function Block({ block, depth = 0 }) {
  if (!block || typeof block !== 'object') return null

  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock block={block} />
    case 'heading':
      return <HeadingBlock block={block} />
    case 'image':
      return <ImageBlock block={block} />
    case 'code':
      return <CodeBlock block={block} />
    case 'quote':
      return <QuoteBlock block={block} />
    case 'list':
      return <ListBlock block={block} />
    case 'section':
      return <SectionBlock block={block} depth={depth} />
    default:
      return null
  }
}

/**
 * Rendu public du contenu (JSON blocks ou HTML legacy).
 * @param {object} props Props composant.
 * @param {string} props.content Chaine JSON `{ blocks: [...] }` ou HTML legacy.
 * @returns {JSX.Element} Contenu rendu.
 */
export default function BlockRenderer({ content }) {
  const blocks = parseContent(content)

  if (blocks) {
    return (
      <div className="prose max-w-none">
        {blocks.map((block, index) => (
          <Block key={block?.id || `block-${index}`} block={block} />
        ))}
      </div>
    )
  }

  const safeHtml = DOMPurify.sanitize(content || '')
  return (
    <div
      className="prose max-w-none leading-relaxed"
      style={{ color: 'var(--color-text-secondary)' }}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
