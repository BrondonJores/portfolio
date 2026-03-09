/* Compteur anime pour valeurs de stats (ex: 12+, 98%, 4.5/5). */
import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Extrait la partie numerique d'une valeur texte pour l'animer.
 * @param {unknown} rawValue Valeur brute de compteur.
 * @returns {{prefix:string,suffix:string,target:number,decimals:number}|null} Meta compteur ou null.
 */
function extractCounterParts(rawValue) {
  const text = String(rawValue ?? '').trim()
  if (!text) {
    return null
  }

  const match = text.match(/-?\d+(?:[.,]\d+)?/)
  if (!match || typeof match.index !== 'number') {
    return null
  }

  const numericToken = match[0]
  const target = Number.parseFloat(numericToken.replace(',', '.'))
  if (!Number.isFinite(target)) {
    return null
  }

  const decimalChunk = numericToken.split(/[.,]/)[1] || ''

  return {
    prefix: text.slice(0, match.index),
    suffix: text.slice(match.index + numericToken.length),
    target,
    decimals: decimalChunk.length,
  }
}

/**
 * Formate une valeur numerique avec le nombre de decimales souhaite.
 * @param {number} value Valeur a afficher.
 * @param {number} decimals Nombre de decimales.
 * @returns {string} Valeur formatee.
 */
function formatAnimatedValue(value, decimals) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  if (decimals > 0) {
    return value.toFixed(decimals)
  }

  return String(Math.round(value))
}

/**
 * Compteur anime au scroll avec fallback texte si valeur non numerique.
 * @param {{
 *   value: string | number,
 *   enabled?: boolean,
 *   durationMs?: number,
 *   className?: string,
 *   style?: import('react').CSSProperties
 * }} props Props du composant.
 * @returns {JSX.Element} Compteur anime ou texte brut.
 */
export default function AnimatedCounter({
  value,
  enabled = true,
  durationMs = 1200,
  className = '',
  style,
}) {
  const rootRef = useRef(null)
  const rafRef = useRef(0)
  const [isInView, setIsInView] = useState(false)
  const [displayValue, setDisplayValue] = useState(null)
  const parts = useMemo(() => extractCounterParts(value), [value])

  useEffect(() => {
    setDisplayValue(null)
  }, [value])

  useEffect(() => {
    const element = rootRef.current
    if (!element || typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      setIsInView(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!enabled || !isInView || !parts) {
      return undefined
    }

    const safeDurationMs = Math.max(300, Number(durationMs) || 1200)
    const startedAt = performance.now()

    const tick = (timestamp) => {
      const elapsed = timestamp - startedAt
      const progress = Math.min(1, elapsed / safeDurationMs)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const nextValue = parts.target * easedProgress
      setDisplayValue(nextValue)

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick)
      }
    }

    rafRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
      }
    }
  }, [enabled, isInView, parts, durationMs])

  if (!parts || !enabled) {
    return (
      <span ref={rootRef} className={className} style={style}>
        {String(value ?? '')}
      </span>
    )
  }

  const resolvedNumeric = displayValue === null ? parts.target : displayValue

  return (
    <span
      ref={rootRef}
      className={className}
      style={style}
      aria-label={String(value ?? '')}
    >
      {parts.prefix}{formatAnimatedValue(resolvedNumeric, parts.decimals)}{parts.suffix}
    </span>
  )
}