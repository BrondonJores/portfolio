import { useMemo } from 'react'
import { motion } from 'framer-motion'

/**
 * Build a marquee track long enough for wide screens.
 * @param {Array<{id:number|string,url:string,title:string}>} badges Source list.
 * @param {boolean} shouldAnimate Animation state.
 * @param {number} minVisibleItems Target minimum number of visible items.
 * @returns {Array<{id:number|string,url:string,title:string}>} Ribbon items.
 */
function buildRibbonItems(badges, shouldAnimate, minVisibleItems) {
  if (!Array.isArray(badges) || badges.length === 0) {
    return []
  }

  const source = badges.filter((badge) => String(badge?.url || '').trim().length > 0)
  if (source.length === 0) {
    return []
  }

  const minCount = Math.max(source.length, minVisibleItems)
  const base = []
  while (base.length < minCount) {
    base.push(...source)
  }

  const normalized = base.slice(0, minCount)
  return shouldAnimate ? [...normalized, ...normalized] : normalized
}

/**
 * Infinite horizontal ribbon in a sponsor-logo style.
 * @param {{
 *   badges: Array<{id:number|string,url:string,title:string}>,
 *   shouldAnimate?: boolean,
 *   durationSeconds?: number,
 *   minVisibleItems?: number
 * }} props Component props.
 * @returns {JSX.Element|null} Ribbon.
 */
export default function SponsorBadgeRibbon({
  badges,
  shouldAnimate = true,
  durationSeconds = 24,
  minVisibleItems = 22,
}) {
  const marqueeItems = useMemo(
    () => buildRibbonItems(badges, shouldAnimate, minVisibleItems),
    [badges, shouldAnimate, minVisibleItems]
  )

  if (marqueeItems.length === 0) {
    return null
  }

  return (
    <div
      className="relative overflow-hidden py-1"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
    >
      <motion.div
        className="flex items-center gap-3 sm:gap-4 w-max"
        animate={shouldAnimate ? { x: ['0%', '-50%'] } : { x: '0%' }}
        transition={
          shouldAnimate
            ? {
              duration: durationSeconds,
              ease: 'linear',
              repeat: Infinity,
            }
            : undefined
        }
      >
        {marqueeItems.map((badge, index) => (
          <div
            key={`${badge.id}-${index}`}
            className="w-[46px] h-[46px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] shrink-0 flex items-center justify-center"
          >
            <img
              src={badge.url}
              alt={`Badge ${badge.title}`}
              className="max-h-full max-w-full object-contain opacity-90 hover:opacity-100 transition-opacity duration-200"
              loading="lazy"
            />
          </div>
        ))}
      </motion.div>
    </div>
  )
}
