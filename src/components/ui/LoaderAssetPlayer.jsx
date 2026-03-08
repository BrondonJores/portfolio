import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import {
  detectAnimationAssetMode,
  normalizeAnimationAssetFit,
  sanitizeAnimationAssetUrl,
} from '../../utils/animationAsset.js'

const MascotLottiePlayer = lazy(() => import('./MascotLottiePlayer.jsx'))
const MascotRivePlayer = lazy(() => import('./MascotRivePlayer.jsx'))

/**
 * Rend une animation de loader selon le type d'asset (image/video/lottie/rive).
 * Le composant est tolerant aux erreurs et remonte un callback en cas d'echec.
 * @param {{
 *   url?: string,
 *   fit?: 'contain' | 'cover',
 *   alt?: string,
 *   className?: string,
 *   onError?: () => void
 * }} props Props du lecteur d'asset.
 * @returns {JSX.Element | null} Media rendu ou null si URL invalide/non supportee.
 */
export default function LoaderAssetPlayer({
  url = '',
  fit = 'contain',
  alt = 'Animation de chargement',
  className = '',
  onError,
}) {
  const [failed, setFailed] = useState(false)
  const safeUrl = useMemo(
    () => sanitizeAnimationAssetUrl(url, { allowBlob: true }),
    [url]
  )
  const mode = useMemo(
    () => detectAnimationAssetMode(safeUrl),
    [safeUrl]
  )
  const resolvedFit = useMemo(
    () => normalizeAnimationAssetFit(fit),
    [fit]
  )

  /**
   * Marque l'asset comme invalide et notifie le parent.
   * @returns {void}
   */
  const handleAssetError = useCallback(() => {
    setFailed(true)
    onError?.()
  }, [onError])

  useEffect(() => {
    setFailed(false)
  }, [safeUrl])

  if (!safeUrl || failed || mode === 'unsupported') {
    return null
  }

  if (mode === 'video') {
    return (
      <video
        src={safeUrl}
        className={`w-full h-full ${className}`}
        style={{ objectFit: resolvedFit }}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        onError={handleAssetError}
      />
    )
  }

  if (mode === 'image') {
    return (
      <img
        src={safeUrl}
        alt={alt}
        className={`w-full h-full ${className}`}
        style={{ objectFit: resolvedFit }}
        loading="eager"
        decoding="async"
        onError={handleAssetError}
      />
    )
  }

  if (mode === 'lottie') {
    return (
      <Suspense fallback={null}>
        <div className={`w-full h-full ${className}`}>
          <MascotLottiePlayer url={safeUrl} fit={resolvedFit} onError={handleAssetError} />
        </div>
      </Suspense>
    )
  }

  if (mode === 'rive') {
    return (
      <Suspense fallback={null}>
        <div className={`w-full h-full ${className}`}>
          <MascotRivePlayer url={safeUrl} fit={resolvedFit} onError={handleAssetError} />
        </div>
      </Suspense>
    )
  }

  return null
}
