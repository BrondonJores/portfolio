import { useMemo } from 'react'
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas'
import { sanitizeAnimationAssetUrl } from '../../utils/animationAsset.js'

/**
 * Rend un asset Rive (.riv) dans une zone responsive.
 * @param {{ url: string, fit?: 'contain' | 'cover', onError?: () => void }} props Props composant.
 * @returns {JSX.Element} Lecteur Rive.
 */
export default function MascotRivePlayer({ url, fit = 'contain', onError }) {
  const safeUrl = useMemo(
    () => sanitizeAnimationAssetUrl(url, { allowBlob: true }),
    [url]
  )

  const layout = useMemo(
    () => new Layout({
      fit: fit === 'cover' ? Fit.Cover : Fit.Contain,
      alignment: Alignment.Center,
    }),
    [fit]
  )

  const { RiveComponent } = useRive({
    src: safeUrl || undefined,
    autoplay: true,
    layout,
    onLoadError: () => {
      onError?.()
    },
  })

  if (!safeUrl) {
    return null
  }

  return <RiveComponent className="w-full h-full" />
}
