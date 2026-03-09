/* Composant de selection et upload de PDF vers le backend. */
import { useRef, useState } from 'react'
import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Spinner from './Spinner.jsx'
import { useAuthContext } from '../../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL || ''
const ALLOWED_TYPES = ['application/pdf']
const MAX_SIZE_MB = 15

/**
 * Uploader PDF reutilisable pour certificats/justificatifs.
 * @param {{value?: string, onUpload?: (url: string) => void, label?: string, className?: string}} props Props composant.
 * @returns {JSX.Element} Uploader document.
 */
export default function DocumentUploader({ value = '', onUpload, label, className = '' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const { accessToken } = useAuthContext()

  /**
   * Verifie qu'un fichier ressemble a un PDF.
   * @param {File} file Fichier selectionne.
   * @returns {boolean} True si le fichier est acceptable.
   */
  function isPdfFile(file) {
    const mimeOk = ALLOWED_TYPES.includes(String(file?.type || '').toLowerCase())
    const extensionOk = String(file?.name || '').toLowerCase().endsWith('.pdf')
    return mimeOk || extensionOk
  }

  /**
   * Upload un PDF vers l'endpoint document.
   * @param {File} file Fichier a uploader.
   * @returns {Promise<void>} Promise resolue apres upload.
   */
  const handleFile = async (file) => {
    setError('')

    if (!isPdfFile(file)) {
      setError('Type non autorise. Utilisez uniquement un PDF.')
      return
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Taille max ${MAX_SIZE_MB} Mo depassee.`)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('document', file, file.name)

      const headers = {}
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(`${API_BASE}/api/upload/document`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        let message = `Erreur ${response.status}`
        try {
          const payload = await response.json()
          message = payload.error || message
        } catch {
          /* noop */
        }
        throw new Error(message)
      }

      const payload = await response.json()
      onUpload?.(payload.url || '')
    } catch (err) {
      setError(err.message || "Erreur lors de l'upload du document.")
    } finally {
      setUploading(false)
    }
  }

  /**
   * Gestion input file.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event Evenement input.
   * @returns {void}
   */
  const handleInputChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      void handleFile(file)
    }
    event.target.value = ''
  }

  /**
   * Gestion drag and drop.
   * @param {import('react').DragEvent<HTMLDivElement>} event Evenement drag.
   * @returns {void}
   */
  const handleDrop = (event) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      void handleFile(file)
    }
  }

  const handleDragOver = (event) => event.preventDefault()
  const handleRemove = () => {
    setError('')
    onUpload?.('')
  }

  return (
    <div className={className}>
      {label && (
        <p className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </p>
      )}

      {value ? (
        <div
          className="rounded-lg border px-3 py-2 flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
        >
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm truncate"
            style={{ color: 'var(--color-accent)' }}
            title={value}
          >
            Ouvrir le PDF
          </a>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1 rounded-full"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Supprimer le PDF"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-primary)',
          }}
        >
          {uploading ? (
            <Spinner size="md" />
          ) : (
            <>
              <DocumentTextIcon className="h-8 w-8" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Glisser-deposer ou cliquer pour selectionner un PDF
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                PDF uniquement - max 15 Mo
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
      />

      {uploading && value && (
        <div className="mt-2 flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Upload en cours...
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs mt-1" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}
    </div>
  )
}
