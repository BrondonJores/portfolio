/* Overlay de transition de page pilote par asset Lottie JSON/Rive/video/image. */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { detectAnimationAssetMode, sanitizeAnimationAssetUrl } from '../../utils/animationAsset.js'
import LoaderAssetPlayer from './LoaderAssetPlayer.jsx'
import Spinner from './Spinner.jsx'

/**
 * Overlay de transition page avec rendu asset anime (fallback spinner).
 * @param {{
 *   visible: boolean,
 *   assetUrl?: string,
 *   overlayOpacity?: number,
 *   durationMs?: number
 * }} props Props overlay.
 * @returns {JSX.Element} Overlay conditionnel.
 */
export default function PageTransitionOverlay({
  visible,
  assetUrl = '',
  overlayOpacity = 0.86,
  durationMs = 850,
}) {
  const [assetFailed, setAssetFailed] = useState(false)
  const safeUrl = useMemo(
    () => sanitizeAnimationAssetUrl(assetUrl),
    [assetUrl]
  )
  const isLottieAsset = useMemo(
    () => detectAnimationAssetMode(safeUrl) === 'lottie',
    [safeUrl]
  )
  const safeDurationSec = Math.max(0.2, (Number(durationMs) || 850) / 1000)

  useEffect(() => {
    setAssetFailed(false)
  }, [safeUrl, visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="page-transition-overlay"
          className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: Math.min(0.45, safeDurationSec * 0.28), ease: 'easeOut' }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              opacity: Math.min(1, Math.max(0.2, overlayOpacity)),
            }}
          />

          <motion.div
            className="relative z-[1] w-56 h-56"
            initial={{ scale: 0.94, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: Math.min(0.6, safeDurationSec * 0.36), ease: 'easeOut' }}
          >
            {isLottieAsset && !assetFailed ? (
              <LoaderAssetPlayer
                url={safeUrl}
                fit="contain"
                alt="Transition de page"
                onError={() => setAssetFailed(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="lg" variant="spinner" />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
