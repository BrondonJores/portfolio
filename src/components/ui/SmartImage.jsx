import { useEffect, useMemo, useState } from 'react'
import { buildResponsiveImageSet } from '../../utils/mediaImage.js'

function normalizeAspectRatio(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (Number.isFinite(value) && value > 0) {
    return String(value)
  }

  return undefined
}

export default function SmartImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  style,
  imgStyle,
  width,
  height,
  sizes,
  widths,
  maxWidth,
  loading = 'lazy',
  fetchPriority,
  decoding = 'async',
  fit = 'limit',
  quality = 'auto:good',
  format = 'auto',
  dpr = 'auto',
  aspectRatio,
  fallback = null,
  overlay = null,
  children = null,
  onLoad,
}) {
  const normalizedSrc = typeof src === 'string' ? src.trim() : ''
  const resolvedLoading = fetchPriority === 'high' ? 'eager' : loading
  const [status, setStatus] = useState(normalizedSrc ? 'loading' : 'empty')

  const sourceSet = useMemo(
    () => buildResponsiveImageSet(normalizedSrc, {
      widths,
      maxWidth,
      fit,
      quality,
      format,
      dpr,
    }),
    [normalizedSrc, widths, maxWidth, fit, quality, format, dpr]
  )

  useEffect(() => {
    setStatus(normalizedSrc ? 'loading' : 'empty')
  }, [normalizedSrc, sourceSet.src])

  const resolvedAspectRatio = normalizeAspectRatio(aspectRatio)
  const wrapperStyle = {
    ...style,
    ...(resolvedAspectRatio ? { aspectRatio: resolvedAspectRatio } : {}),
  }

  const hasSource = Boolean(sourceSet.src)
  const showPlaceholder = status === 'loading' && hasSource
  const showFallback = !hasSource || status === 'error'
  const effectiveSizes = sourceSet.srcSet ? sizes : undefined

  return (
    <div className={`media-shell ${className}`.trim()} style={wrapperStyle}>
      <span
        className={`media-skeleton ${showPlaceholder ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />

      {showFallback ? (
        <div
          className="relative z-[1] flex h-full w-full items-center justify-center"
          aria-label={alt}
          role="img"
        >
          {fallback}
        </div>
      ) : (
        <img
          src={sourceSet.src}
          srcSet={sourceSet.srcSet || undefined}
          sizes={effectiveSizes}
          alt={alt}
          width={width}
          height={height}
          loading={resolvedLoading}
          fetchPriority={fetchPriority}
          decoding={decoding}
          className={`relative z-[1] block ${imgClassName}`.trim()}
          style={{
            display: 'block',
            opacity: status === 'loaded' ? 1 : 0,
            transition: 'opacity 260ms ease, transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'opacity',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            ...imgStyle,
          }}
          onLoad={(event) => {
            setStatus('loaded')
            onLoad?.(event)
          }}
          onError={() => {
            setStatus('error')
          }}
        />
      )}

      {overlay}
      {children}
    </div>
  )
}
