/* Uploader d'assets mascottes (image/video/lottie/rive) avec preview. */
import { useEffect, useRef, useState } from 'react'
import { FilmIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Spinner from './Spinner.jsx'
import MascotLottiePlayer from './MascotLottiePlayer.jsx'
import MascotRivePlayer from './MascotRivePlayer.jsx'
import { useAuthContext } from '../../context/AuthContext.jsx'
import { detectAnimationAssetMode } from '../../utils/animationAsset.js'

const API_BASE = import.meta.env.VITE_API_URL || ''
const MAX_SIZE_MB = 12
const ACCEPTED_EXTENSIONS = ['gif', 'webp', 'png', 'jpg', 'jpeg', 'webm', 'mp4', 'json', 'lottie', 'riv']
const ACCEPT_INPUT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')
const ALLOWED_EXTENSIONS = new Set(ACCEPTED_EXTENSIONS)

/**
 * Deduit le mode d'affichage d'un media depuis son extension.
 * @param {string} value URL/nom de fichier.
 * @returns {'image'|'video'|'lottie'|'rive'|'unknown'} Mode de preview.
 */
function detectModeFromValue(value) {
  const mode = detectAnimationAssetMode(value)
  return mode === 'unsupported' ? 'unknown' : mode
}

/**
 * Extrait l'extension normalisee d'un nom de fichier.
 * @param {string} filename Nom original.
 * @returns {string} Extension en minuscule sans point.
 */
function getFileExtension(filename) {
  const raw = String(filename || '')
  const chunks = raw.split('.')
  if (chunks.length < 2) {
    return ''
  }
  return chunks[chunks.length - 1].toLowerCase()
}

/**
 * Uploader admin pour mascottes animees, avec upload securise vers l'API.
 * @param {{label:string, value?:string, onUpload?:(url:string)=>void}} props Props composant.
 * @returns {JSX.Element} Bloc upload + preview.
 */
export default function MascotAssetUploader({ label, value = '', onUpload }) {
  const inputRef = useRef(null)
  const { accessToken } = useAuthContext()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [localPreview, setLocalPreview] = useState(null)

  const previewUrl = localPreview?.url || value
  const previewMode = localPreview?.mode || detectModeFromValue(previewUrl)

  useEffect(() => {
    return () => {
      if (localPreview?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview.url)
      }
    }
  }, [localPreview])

  /**
   * Upload un fichier mascotte vers l'API.
   * @param {File} file Fichier utilisateur.
   * @returns {Promise<void>} Promise resolue apres upload.
   */
  async function uploadFile(file) {
    const formData = new FormData()
    formData.append('asset', file, file.name)

    const headers = {}
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    const response = await fetch(`${API_BASE}/api/upload/mascot`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      let message = `Erreur ${response.status}`
      try {
        const payload = await response.json()
        message = payload?.error || message
      } catch {}
      throw new Error(message)
    }

    const payload = await response.json()
    const uploadedUrl = String(payload?.url || '')
    if (!uploadedUrl) {
      throw new Error("L'upload n'a retourne aucune URL.")
    }

    onUpload?.(uploadedUrl)
    setLocalPreview(null)
  }

  /**
   * Valide puis upload le fichier choisi.
   * @param {File} file Fichier source.
   * @returns {Promise<void>} Promise resolue apres traitement.
   */
  async function handleFile(file) {
    setError('')
    if (!file) {
      return
    }

    const extension = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      setError('Format non autorise. Utilise gif, webp, png, jpg, webm, mp4, json, lottie ou riv.')
      return
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Taille max depassee (${MAX_SIZE_MB} Mo).`)
      return
    }

    const nextPreview = {
      url: URL.createObjectURL(file),
      mode: detectModeFromValue(file.name),
      name: file.name,
    }
    setLocalPreview((prev) => {
      if (prev?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.url)
      }
      return nextPreview
    })

    setUploading(true)
    try {
      await uploadFile(file)
    } catch (err) {
      setError(err?.message || "Erreur pendant l'upload de la mascotte.")
    } finally {
      setUploading(false)
    }
  }

  /**
   * Supprime la valeur courante.
   * @returns {void}
   */
  function handleRemove() {
    setError('')
    setLocalPreview((prev) => {
      if (prev?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.url)
      }
      return null
    })
    onUpload?.('')
  }

  return (
    <div className="space-y-2">
      <p className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>

      {previewUrl ? (
        <div
          className="relative rounded-xl border overflow-hidden"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-card)',
            minHeight: '220px',
          }}
        >
          <div className={`w-full h-56 ${uploading ? 'opacity-55' : ''}`}>
            {previewMode === 'image' && (
              <img
                src={previewUrl}
                alt="Preview mascotte"
                className="w-full h-full object-contain"
                loading="lazy"
                decoding="async"
              />
            )}
            {previewMode === 'video' && (
              <video
                src={previewUrl}
                className="w-full h-full object-contain"
                muted
                loop
                autoPlay
                playsInline
                controls
              />
            )}
            {previewMode === 'lottie' && (
              <MascotLottiePlayer url={previewUrl} fit="contain" onError={() => setError('Impossible de lire ce fichier Lottie.')} />
            )}
            {previewMode === 'rive' && (
              <MascotRivePlayer url={previewUrl} fit="contain" onError={() => setError('Impossible de lire ce fichier Rive.')} />
            )}
            {previewMode === 'unknown' && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <FilmIcon className="h-8 w-8" style={{ color: 'var(--color-text-secondary)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Apercu non disponible
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {localPreview?.name || previewUrl}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-md text-xs border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                disabled={uploading}
              >
                Remplacer
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1 rounded-md border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                aria-label="Supprimer la mascotte"
                disabled={uploading}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-primary)',
          }}
          disabled={uploading}
        >
          <div className="flex flex-col items-center gap-2">
            {uploading ? <Spinner size="md" /> : <SparklesIcon className="h-7 w-7" />}
            <span className="text-sm font-medium">
              Cliquer pour importer une mascotte
            </span>
            <span className="text-xs">
              {`Formats: ${ACCEPTED_EXTENSIONS.join(', ')} - max ${MAX_SIZE_MB} Mo`}
            </span>
          </div>
        </button>
      )}

      {uploading && (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Upload en cours...
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPT_INPUT}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleFile(file)
          }
          event.target.value = ''
        }}
      />
    </div>
  )
}
