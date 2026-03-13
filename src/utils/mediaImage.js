const CLOUDINARY_HOST_PATTERN = /^https?:\/\/res\.cloudinary\.com\//i
const CLOUDINARY_UPLOAD_MARKER = '/image/upload/'

function normalizeImageSource(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildTransformationString({
  width,
  height,
  fit = 'limit',
  quality = 'auto:good',
  format = 'auto',
  dpr = 'auto',
}) {
  const transforms = []

  if (format) transforms.push(`f_${format}`)
  if (quality) transforms.push(`q_${quality}`)
  if (dpr) transforms.push(`dpr_${dpr}`)
  if (fit) transforms.push(`c_${fit}`)

  if (Number.isFinite(width) && width > 0) {
    transforms.push(`w_${Math.round(width)}`)
  }

  if (Number.isFinite(height) && height > 0) {
    transforms.push(`h_${Math.round(height)}`)
  }

  return transforms.join(',')
}

export function isCloudinaryImageUrl(value) {
  const source = normalizeImageSource(value)
  return Boolean(source) && CLOUDINARY_HOST_PATTERN.test(source) && source.includes(CLOUDINARY_UPLOAD_MARKER)
}

export function buildCloudinaryImageUrl(value, options = {}) {
  const source = normalizeImageSource(value)
  if (!isCloudinaryImageUrl(source)) {
    return source
  }

  const [baseUrl, queryString] = source.split('?')
  const markerIndex = baseUrl.indexOf(CLOUDINARY_UPLOAD_MARKER)

  if (markerIndex === -1) {
    return source
  }

  const prefix = baseUrl.slice(0, markerIndex + CLOUDINARY_UPLOAD_MARKER.length)
  const suffix = baseUrl.slice(markerIndex + CLOUDINARY_UPLOAD_MARKER.length).replace(/^\/+/, '')
  const transformation = buildTransformationString(options)

  if (!transformation) {
    return source
  }

  const transformedUrl = `${prefix}${transformation}/${suffix}`
  return queryString ? `${transformedUrl}?${queryString}` : transformedUrl
}

export function buildResponsiveImageSet(
  value,
  {
    widths = [480, 768, 1024, 1440],
    maxWidth,
    fit = 'limit',
    quality = 'auto:good',
    format = 'auto',
    dpr = 'auto',
  } = {}
) {
  const source = normalizeImageSource(value)

  if (!source) {
    return {
      src: '',
      srcSet: '',
      cloudinary: false,
    }
  }

  if (!isCloudinaryImageUrl(source)) {
    return {
      src: source,
      srcSet: '',
      cloudinary: false,
    }
  }

  const normalizedWidths = Array.from(
    new Set(
      widths
        .map((entry) => Number.parseInt(String(entry), 10))
        .filter((entry) => Number.isFinite(entry) && entry > 0)
    )
  ).sort((a, b) => a - b)

  const effectiveWidths = maxWidth && Number.isFinite(Number(maxWidth))
    ? normalizedWidths.filter((entry) => entry < Number(maxWidth)).concat(Number(maxWidth))
    : normalizedWidths

  const finalWidths = effectiveWidths.length > 0 ? effectiveWidths : [Number(maxWidth) || 1440]
  const largestWidth = finalWidths[finalWidths.length - 1]

  return {
    src: buildCloudinaryImageUrl(source, {
      width: largestWidth,
      fit,
      quality,
      format,
      dpr,
    }),
    srcSet: finalWidths
      .map((width) => {
        const transformed = buildCloudinaryImageUrl(source, {
          width,
          fit,
          quality,
          format,
          dpr,
        })
        return `${transformed} ${width}w`
      })
      .join(', '),
    cloudinary: true,
  }
}
