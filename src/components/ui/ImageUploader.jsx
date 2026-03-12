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
const MAX_SIZE_MB = 12
const BYTES_PER_MB = 1024 * 1024
const COMPRESSION_THRESHOLD_MB = 2.5
const TARGET_COMPRESSED_SIZE_MB = 1.8
const TARGET_COMPRESSED_SIZE_MB_LARGE = 2.4
const MAX_OUTPUT_DIMENSION_PX = 2200
const LOSSLESS_TYPES = new Set(['image/gif'])

/* Options de compression */
const COMPRESSION_OPTIONS = {
  maxWidthOrHeight: MAX_OUTPUT_DIMENSION_PX,
  initialQuality: 0.92,
  useWebWorker: true,
}

/**
 * Lit les dimensions réelles d'une image côté navigateur.
 * @param {File} file Fichier source.
 * @returns {Promise<{width:number,height:number}>} Dimensions détectées.
 */
function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      resolve({
        width: image.naturalWidth || 0,
        height: image.naturalHeight || 0,
      })
      URL.revokeObjectURL(objectUrl)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Impossible d'analyser l'image sélectionnée."))
    }

    image.src = objectUrl
  })
}

/**
 * Allège une image uniquement quand elle est réellement lourde pour l'affichage.
 * Les GIF sont conservés tels quels pour éviter de casser l'animation.
 * @param {File} file Fichier source.
 * @returns {Promise<File|Blob>} Fichier à uploader.
 */
async function prepareFileForUpload(file) {
  if (LOSSLESS_TYPES.has(file.type)) {
    return file
  }

  const { width, height } = await readImageDimensions(file)
  const largestSide = Math.max(width, height)
  const shouldCompress =
    file.size > COMPRESSION_THRESHOLD_MB * BYTES_PER_MB
    || largestSide > MAX_OUTPUT_DIMENSION_PX

  if (!shouldCompress) {
    return file
  }

  const compressed = await imageCompression(file, {
    ...COMPRESSION_OPTIONS,
    maxSizeMB:
      file.size > 6 * BYTES_PER_MB
        ? TARGET_COMPRESSED_SIZE_MB_LARGE
        : TARGET_COMPRESSED_SIZE_MB,
  })

  return compressed.size < file.size ? compressed : file
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

  /* Upload du fichier après optimisation */
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
      /* Compression douce uniquement si nécessaire */
      const preparedFile = await prepareFileForUpload(file)

      /* Préparation du FormData */
      const formData = new FormData()
      formData.append('image', preparedFile, file.name)

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
                jpg, png, webp, gif — max 12 Mo
              </span>
              <span className="text-[11px] text-center px-6" style={{ color: 'var(--color-text-secondary)' }}>
                Pour un rendu net, privilégie une image de 1600 px ou plus. Compression légère seulement si besoin.
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
