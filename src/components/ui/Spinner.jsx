/* Composant spinner de chargement */
import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { detectAnimationAssetMode, sanitizeAnimationAssetUrl } from '../../utils/animationAsset.js'
import LoaderAssetPlayer from './LoaderAssetPlayer.jsx'

/* Dimensions par taille */
const SIZE_MAP = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
}

const LOADER_SETTING_KEY_BY_VARIANT = {
  spinner: 'anim_loader_spinner_asset_url',
  page: 'anim_loader_page_asset_url',
  site: 'anim_loader_site_asset_url',
}

/**
 * Retourne l'URL du loader correspondant a une variante d'usage.
 * @param {Record<string, unknown>} settings Parametres globaux.
 * @param {'spinner'|'page'|'site'} variant Variante du loader.
 * @returns {string} URL nettoyee ou chaine vide.
 */
function resolveLoaderAssetUrl(settings, variant) {
  const key = LOADER_SETTING_KEY_BY_VARIANT[variant] || LOADER_SETTING_KEY_BY_VARIANT.spinner
  return sanitizeAnimationAssetUrl(settings?.[key])
}

/**
 * Spinner SVG avec fallback asset (Lottie JSON/Rive/video/image) configurable depuis AdminSettings.
 * @param {{size?:'sm'|'md'|'lg', className?:string, variant?:'spinner'|'page'|'site'}} props Props composant.
 * @returns {JSX.Element} Spinner rendu.
 */
export default function Spinner({ size = 'md', className = '', variant = 'spinner' }) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md
  const { settings } = useSettings()
  const [assetFailed, setAssetFailed] = useState(false)
  const assetUrl = useMemo(
    () => resolveLoaderAssetUrl(settings || {}, variant),
    [settings, variant]
  )
  const assetMode = useMemo(
    () => detectAnimationAssetMode(assetUrl),
    [assetUrl]
  )

  useEffect(() => {
    setAssetFailed(false)
  }, [assetUrl])

  const canRenderAsset = Boolean(assetUrl) && assetMode !== 'unsupported' && !assetFailed

  if (canRenderAsset) {
    return (
      <div
        className={`${sizeClass} ${className}`}
        aria-label="Chargement en cours"
        role="status"
      >
        <LoaderAssetPlayer
          url={assetUrl}
          fit="contain"
          alt="Animation de chargement"
          onError={() => setAssetFailed(true)}
        />
      </div>
    )
  }

  return (
    <svg
      className={`animate-spin ${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Chargement en cours"
      role="status"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="var(--color-accent)"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="var(--color-accent)"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
