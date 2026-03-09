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
 * Construit une liste de variantes d'URL pour limiter les 404 Cloudinary raw.
 * @param {string} url URL initiale.
 * @returns {string[]} URL candidates dans l'ordre de tentative.
 */
function buildLottieFetchCandidates(url) {
  const initial = String(url || '').trim()
  if (!initial) {
    return []
  }

  const candidates = [initial]
  const cloudinaryRaw = isCloudinaryRawAssetUrl(initial)

  if (!cloudinaryRaw) {
    return candidates
  }

  const hashIndex = initial.indexOf('#')
  const queryIndex = initial.indexOf('?')
  let splitIndex = -1
  if (hashIndex >= 0 && queryIndex >= 0) {
    splitIndex = Math.min(hashIndex, queryIndex)
  } else {
    splitIndex = Math.max(hashIndex, queryIndex)
  }

  const base = splitIndex >= 0 ? initial.slice(0, splitIndex) : initial
  const suffix = splitIndex >= 0 ? initial.slice(splitIndex) : ''

  const withoutJsonExtension = base.replace(/\.json$/i, '')
  const withJsonExtension = withoutJsonExtension.endsWith('.json')
    ? withoutJsonExtension
    : `${withoutJsonExtension}.json`

  const cloudinaryImageVariant = base.replace('/raw/upload/', '/image/upload/')

  const pushUnique = (candidate) => {
    const normalized = String(candidate || '').trim()
    if (!normalized || candidates.includes(normalized)) {
      return
    }
    candidates.push(normalized)
  }

  pushUnique(`${withoutJsonExtension}${suffix}`)
  pushUnique(`${withJsonExtension}${suffix}`)
  if (cloudinaryImageVariant !== base) {
    pushUnique(`${cloudinaryImageVariant}${suffix}`)
    pushUnique(`${cloudinaryImageVariant.replace(/\.json$/i, '')}.json${suffix}`)
  }

  return candidates
}

/**
 * Charge un JSON Lottie en testant des variantes d'URL en cas de 404 Cloudinary.
 * @param {string} url URL principale.
 * @returns {Promise<object>} Payload Lottie.
 */
async function loadLottieJsonWithFallback(url) {
  const candidates = buildLottieFetchCandidates(url)
  let lastError = null

  for (const candidate of candidates) {
    try {
      const payload = await loadLottieJsonPayload(candidate)
      if (candidate !== url && payload) {
        LOTTIE_JSON_CACHE.set(url, payload)
      }
      return payload
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('Impossible de charger le JSON Lottie.')
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

    loadLottieJsonWithFallback(safeUrl)
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
