/* Hook pour suivre la position de defilement de la page */
import { useState, useEffect } from 'react'

/**
 * Retourne la valeur scrollY courante avec throttling via requestAnimationFrame.
 * Nettoie le listener au demontage du composant.
 */
export function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let rafId = null

    const handleScroll = () => {
      /* Throttling via requestAnimationFrame pour eviter les performances degradees */
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        setScrollY(window.scrollY)
        rafId = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    /* Nettoyage du listener et de la frame au demontage */
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return scrollY
}
