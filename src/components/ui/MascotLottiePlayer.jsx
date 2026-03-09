import lottie from 'lottie-web/build/player/lottie_light'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isCloudinaryRawAssetUrl, sanitizeAnimationAssetUrl } from '../../utils/animationAsset.js'

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
 * Duplique un payload JSON Lottie pour eviter les mutations internes du player.
 * @param {object} payload Donnees source.
 * @returns {object} Copie profonde.
 */
function cloneLottiePayload(payload) {
  if (typeof structuredClone === 'function') {
    return structuredClone(payload)
  }
  return JSON.parse(JSON.stringify(payload))
}

/**
 * Traduit un fit CSS en preserveAspectRatio SVG.
 * @param {'contain'|'cover'} fit Mode fit.
 * @returns {string} Valeur preserveAspectRatio.
 */
function toPreserveAspectRatio(fit) {
  return fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'
}

/**
 * Rend un asset Lottie JSON dans une boite responsive sans runtime WASM.
 * @param {{ url: string, fit?: 'contain' | 'cover', onError?: () => void }} props Props composant.
 * @returns {JSX.Element | null} Lecteur Lottie ou null en attente.
 */
export default function MascotLottiePlayer({ url, fit = 'contain', onError }) {
  const containerRef = useRef(null)
  const [animationData, setAnimationData] = useState(null)
  const [sourceReady, setSourceReady] = useState(false)

  const safeUrl = useMemo(
    () => sanitizeAnimationAssetUrl(url, { allowBlob: true }),
    [url]
  )

  useEffect(() => {
    setAnimationData(null)
    setSourceReady(false)

    if (!safeUrl) {
      return undefined
    }

    const normalizedUrl = safeUrl.split('?')[0].split('#')[0].toLowerCase()
    const isBlobUrl = safeUrl.startsWith('blob:')
    const isJsonAsset = normalizedUrl.endsWith('.json')
    const isCloudinaryRaw = isCloudinaryRawAssetUrl(safeUrl)

    if (!isBlobUrl && !isJsonAsset && !isCloudinaryRaw) {
      onError?.()
      return undefined
    }

    const controller = new AbortController()
    let isMounted = true

    loadLottieJsonPayload(safeUrl)
      .then((payload) => {
        if (!isMounted || controller.signal.aborted) {
          return
        }

        setAnimationData(payload)
        setSourceReady(true)
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return
        }

        console.error('Erreur chargement Lottie mascotte:', err)
        setSourceReady(false)
        onError?.()
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [safeUrl, onError])

  useEffect(() => {
    if (!sourceReady || !animationData || !containerRef.current) {
      return undefined
    }

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: cloneLottiePayload(animationData),
      rendererSettings: {
        preserveAspectRatio: toPreserveAspectRatio(fit),
      },
    })

    return () => {
      animation.destroy()
    }
  }, [animationData, fit, sourceReady])

  if (!safeUrl) {
    return null
  }

  return <div ref={containerRef} className="w-full h-full" />
}
