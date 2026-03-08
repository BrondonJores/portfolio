import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react'
import dotLottieWasmUrl from '@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm?url'
import { useEffect, useMemo, useState } from 'react'
import { sanitizeAnimationAssetUrl } from '../../utils/animationAsset.js'

setWasmUrl(dotLottieWasmUrl)
const LOTTIE_JSON_CACHE = new Map()
const LOTTIE_JSON_IN_FLIGHT = new Map()

/**
 * Charge un JSON Lottie avec deduplication des requetes concurrentes.
 * @param {string} url URL absolue du JSON.
 * @returns {Promise<object>} Payload Lottie valide.
 */
async function loadLottieJsonPayload(url) {
  if (LOTTIE_JSON_CACHE.has(url)) {
    return LOTTIE_JSON_CACHE.get(url)
  }

  const pendingRequest = LOTTIE_JSON_IN_FLIGHT.get(url)
  if (pendingRequest) {
    return pendingRequest
  }

  const requestPromise = fetch(url, { credentials: 'omit' })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Lottie HTTP ${response.status}`)
      }

      const payload = await response.json()
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Payload Lottie invalide')
      }

      LOTTIE_JSON_CACHE.set(url, payload)
      return payload
    })
    .finally(() => {
      LOTTIE_JSON_IN_FLIGHT.delete(url)
    })

  LOTTIE_JSON_IN_FLIGHT.set(url, requestPromise)
  return requestPromise
}

/**
 * Rend un asset Lottie (.json ou .lottie) dans une boite responsive.
 * @param {{ url: string, fit?: 'contain' | 'cover', onError?: () => void }} props Props composant.
 * @returns {JSX.Element | null} Lecteur Lottie ou null en attente.
 */
export default function MascotLottiePlayer({ url, fit = 'contain', onError }) {
  const [animationData, setAnimationData] = useState(null)
  const [useSourcePlayback, setUseSourcePlayback] = useState(false)

  const safeUrl = useMemo(
    () => sanitizeAnimationAssetUrl(url, { allowBlob: true }),
    [url]
  )

  const canvasStyle = useMemo(
    () => ({
      width: '100%',
      height: '100%',
      objectFit: fit,
    }),
    [fit]
  )

  useEffect(() => {
    if (!safeUrl) {
      setAnimationData(null)
      setUseSourcePlayback(false)
      return undefined
    }

    const controller = new AbortController()
    let isMounted = true
    const normalizedUrl = safeUrl.split('?')[0].split('#')[0].toLowerCase()
    const shouldUseDotLottieSource = normalizedUrl.endsWith('.lottie')

    setAnimationData(null)
    setUseSourcePlayback(shouldUseDotLottieSource)

    if (shouldUseDotLottieSource) {
      return () => {
        isMounted = false
        controller.abort()
      }
    }

    loadLottieJsonPayload(safeUrl)
      .then((payload) => {
        if (!isMounted || controller.signal.aborted) {
          return
        }
        setUseSourcePlayback(false)
        setAnimationData(payload)
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return
        }

        if (!normalizedUrl.endsWith('.json') && isMounted) {
          setUseSourcePlayback(true)
          return
        }

        console.error('Erreur chargement Lottie mascotte:', err)
        onError?.()
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [safeUrl, onError])

  if (!safeUrl) {
    return null
  }

  if (useSourcePlayback) {
    return (
      <DotLottieReact
        src={safeUrl}
        loop
        autoplay
        renderConfig={{ autoResize: true }}
        className="w-full h-full"
        style={canvasStyle}
      />
    )
  }

  if (!animationData) {
    return null
  }

  return (
    <DotLottieReact
      data={animationData}
      loop
      autoplay
      renderConfig={{ autoResize: true }}
      className="w-full h-full"
      style={canvasStyle}
    />
  )
}
