/* Hook utilitaire pour retarder le rendu d'un bloc jusqu'a son approche viewport. */
import { useEffect, useRef, useState } from 'react'

/**
 * Normalise la marge d'observation IntersectionObserver.
 * @param {unknown} rawMargin Valeur brute.
 * @returns {string} Valeur rootMargin exploitable.
 */
function normalizeRootMargin(rawMargin) {
  const value = String(rawMargin || '').trim()
  return value || '0px'
}

/**
 * Expose un ref et un etat "visible" base sur IntersectionObserver.
 * Permet de retarder le rendu des composants lourds (Lottie/Rive) hors viewport.
 *
 * @param {{
 *   disabled?: boolean,
 *   once?: boolean,
 *   root?: Element | null,
 *   rootMargin?: string,
 *   threshold?: number
 * }} [options] Configuration d'observation.
 * @returns {{targetRef: import('react').MutableRefObject<HTMLElement | null>, isVisible: boolean}} Ref cible + etat.
 */
export function useVisibilityGate(options = {}) {
  const {
    disabled = false,
    once = true,
    root = null,
    rootMargin = '0px',
    threshold = 0,
  } = options

  const targetRef = useRef(null)
  const [isVisible, setIsVisible] = useState(Boolean(disabled))

  useEffect(() => {
    if (disabled) {
      setIsVisible(true)
      return undefined
    }

    const targetElement = targetRef.current
    if (!targetElement) {
      return undefined
    }

    if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      setIsVisible(true)
      return undefined
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) {
          return
        }

        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          setIsVisible(true)
          if (once) {
            observer.disconnect()
          }
          return
        }

        if (!once) {
          setIsVisible(false)
        }
      },
      {
        root,
        rootMargin: normalizeRootMargin(rootMargin),
        threshold,
      }
    )

    observer.observe(targetElement)
    return () => observer.disconnect()
  }, [disabled, once, root, rootMargin, threshold])

  return { targetRef, isVisible }
}

