/* Composant de sélection, compression et upload d'image vers Cloudinary */
import { useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Spinner from './Spinner.jsx'
import { useAuthContext } from '../../context/AuthContext.jsx'

/* Base URL du backend pour l'upload */
const API_BASE = import.meta.env.VITE_API_URL || ''

/* Types autorisés et taille max */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

/* Options de compression */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 800,
  initialQuality: 0.8,
  useWebWorker: true,
}

/**
 * Composant réutilisable pour sélectionner, compresser et uploader une image.
 *
 * Props :
 *   value      — URL actuelle de l'image (string)
 *   onUpload   — callback(url) appelé après upload réussi
 *   label      — libellé affiché au-dessus de la zone
 *   className  — classes CSS supplémentaires
 */
export default function ImageUploader({ value = '', onUpload, label, className = '' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const { accessToken } = useAuthContext()

  /* Upload du fichier après compression */
  const handleFile = async (file) => {
    setError('')

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Type non autorisé. Utilisez jpg, png, webp ou gif.')
      return
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Taille max ${MAX_SIZE_MB} Mo dépassée.`)
      return
    }

    setUploading(true)
    try {
      /* Compression côté client */
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS)

      /* Préparation du FormData */
      const formData = new FormData()
      formData.append('image', compressed, file.name)

      /* Headers avec token si connecté */
      const headers = {}
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

      /* Upload vers ton backend qui redirige vers Cloudinary */
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        let msg = `Erreur ${response.status}`
        try {
          const data = await response.json()
          msg = data.error || msg
        } catch {}
        throw new Error(msg)
      }

      const data = await response.json()
      if (onUpload) onUpload(data.url) // URL Cloudinary complète
    } catch (err) {
      setError(err.message || "Erreur lors de l'upload.")
    } finally {
      setUploading(false)
    }
  }

  /* Gestion input file */
  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = '' // reset pour pouvoir re-sélectionner le même fichier
  }

  /* Drag & drop */
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e) => e.preventDefault()

  /* Suppression image */
  const handleRemove = () => {
    setError('')
    if (onUpload) onUpload('')
  }

  return (
    <div className={className}>
      {label && (
        <p className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </p>
      )}

      {/* Preview si image présente */}
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Aperçu"
            className={`max-h-48 rounded-lg border object-cover ${uploading ? 'opacity-50 animate-pulse' : ''}`}
            style={{ borderColor: 'var(--color-border)' }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1 right-1 p-1 rounded-full"
            style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}
            aria-label="Supprimer l'image"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Zone drag & drop */
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
          className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-primary)',
          }}
        >
          {uploading ? (
            <Spinner size="md" />
          ) : (
            <>
              <PhotoIcon className="h-8 w-8" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Glisser-déposer ou cliquer pour parcourir
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                jpg, png, webp, gif — max 5 Mo
              </span>
            </>
          )}
        </div>
      )}

      {/* Input caché */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
      />

      {/* Spinner pendant re-upload */}
      {uploading && value && (
        <div className="mt-2 flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Upload en cours…</span>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <p className="text-xs mt-1" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}
    </div>
  )
}