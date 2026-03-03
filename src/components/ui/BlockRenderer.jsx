/* Composant de rendu public des blocs d'article */
import { useState } from 'react'
import { ClipboardIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import DOMPurify from 'dompurify'

/**
 * Désérialise le contenu d'un article.
 * Retourne un tableau de blocs ou null si c'est du HTML legacy.
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

/* Rendu d'un bloc paragraphe */
function ParagraphBlock({ block }) {
  return (
    <p className="mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
      {block.content}
    </p>
  )
}

/* Génère un id ancre depuis un texte de titre */
function slugifyHeading(text) {
  if (!text) return undefined
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/* Rendu d'un bloc titre */
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

/* Rendu d'un bloc image */
function ImageBlock({ block }) {
  if (!block.url) return null
  return (
    <figure className="mb-6">
      <img
        src={block.url}
        alt={block.caption || ''}
        className="rounded-lg w-full object-cover"
        style={{ borderColor: 'var(--color-border)' }}
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

/* Rendu d'un bloc code avec bouton copier */
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
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded text-xs transition-colors focus:outline-none"
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        }}
        title={copied ? 'Copié !' : 'Copier le code'}
        aria-label={copied ? 'Code copié' : 'Copier le code'}
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

/* Rendu d'un bloc citation */
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
          — {block.author}
        </cite>
      )}
    </blockquote>
  )
}

/* Rendu d'un bloc selon son type */
function Block({ block }) {
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
    default:
      return null
  }
}

/**
 * Rendu public du contenu d'un article (JSON blocks ou HTML legacy).
 *
 * Props :
 *   content — chaîne JSON avec { blocks: [...] } ou HTML legacy
 */
export default function BlockRenderer({ content }) {
  const blocks = parseContent(content)

  /* Rendu des blocs JSON */
  if (blocks) {
    return (
      <div className="prose max-w-none">
        {blocks.map((block) => (
          <Block key={block.id} block={block} />
        ))}
      </div>
    )
  }

  /* Fallback HTML legacy : sanitisation DOMPurify */
  const safeHtml = DOMPurify.sanitize(content || '')
  return (
    <div
      className="prose max-w-none leading-relaxed"
      style={{ color: 'var(--color-text-secondary)' }}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
