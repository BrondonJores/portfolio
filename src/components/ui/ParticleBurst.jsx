/* Effet particules burst pour likes/commentaires. */
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * Pseudo-random deterministe (0..1) pour un seed donne.
 * @param {number} seed Graine.
 * @returns {number} Valeur pseudo-aleatoire.
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/**
 * Construit les particules d'un burst.
 * @param {number} count Nombre de particules.
 * @param {number} spreadPx Rayon max.
 * @param {number} seedBase Graine globale.
 * @returns {Array<{id:string,x:number,y:number,size:number,delay:number,shape:'circle'|'square'}>} Particules.
 */
function buildParticles(count, spreadPx, seedBase) {
  const safeCount = Math.max(1, Math.round(count))

  return Array.from({ length: safeCount }, (_, index) => {
    const angle = seededRandom(seedBase * 31 + index * 17) * Math.PI * 2
    const distance = (0.35 + seededRandom(seedBase * 53 + index * 29) * 0.65) * spreadPx
    const size = 3 + Math.round(seededRandom(seedBase * 71 + index * 43) * 4)
    const delay = seededRandom(seedBase * 89 + index * 11) * 0.08

    return {
      id: `particle-${seedBase}-${index}`,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size,
      delay,
      shape: index % 4 === 0 ? 'square' : 'circle',
    }
  })
}

/**
 * Affiche une explosion de particules a chaque changement de triggerKey.
 * @param {{
 *   triggerKey: number,
 *   active?: boolean,
 *   count?: number,
 *   spreadPx?: number,
 *   durationMs?: number
 * }} props Props de l'effet.
 * @returns {JSX.Element|null} Burst anime ou null.
 */
export default function ParticleBurst({
  triggerKey,
  active = true,
  count = 16,
  spreadPx = 88,
  durationMs = 700,
}) {
  const particles = useMemo(
    () => buildParticles(count, spreadPx, triggerKey),
    [count, spreadPx, triggerKey]
  )

  if (!active || triggerKey <= 0) {
    return null
  }

  const duration = Math.max(0.25, Number(durationMs) / 1000)

  return (
    <AnimatePresence>
      <div
        key={`burst-${triggerKey}`}
        className="pointer-events-none absolute inset-0 overflow-visible"
        aria-hidden="true"
      >
        {particles.map((particle, index) => (
          <motion.span
            key={particle.id}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: index % 3 === 0 ? 'var(--color-accent)' : 'var(--color-accent-light)',
              borderRadius: particle.shape === 'circle' ? '9999px' : '2px',
            }}
            initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
            animate={{ x: particle.x, y: particle.y, opacity: 0, scale: 0.2, rotate: 180 }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: 'easeOut', delay: particle.delay }}
          />
        ))}
      </div>
    </AnimatePresence>
  )
}