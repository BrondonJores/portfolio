/**
 * Normalise une liste de badges texte.
 * @param {unknown} value Valeur brute.
 * @returns {string[]} Liste nettoyee.
 */
export function normalizeCertificationBadges(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 24)
}

/**
 * Applique la normalisation des badges a une liste de certifications.
 * @param {unknown} value Liste brute.
 * @returns {Array<object>} Certifications normalisees.
 */
export function normalizeCertifications(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => ({
    ...item,
    badges: normalizeCertificationBadges(item?.badges),
  }))
}

/**
 * Extrait les badges images exploitables depuis les certifications publiques.
 * @param {Array<object>} certifications Liste brute API.
 * @returns {Array<{id:number|string,url:string,title:string}>} Badges images normalises.
 */
export function extractCertificationBadgeImages(certifications) {
  if (!Array.isArray(certifications)) {
    return []
  }

  const unique = new Set()
  const items = []

  certifications.forEach((item) => {
    const url = String(item?.badge_image_url || '').trim()
    if (!url) {
      return
    }

    const title = String(item?.title || 'Certification').trim()
    const dedupeKey = `${url}::${title}`
    if (unique.has(dedupeKey)) {
      return
    }

    unique.add(dedupeKey)
    items.push({
      id: item?.id ?? dedupeKey,
      url,
      title,
    })
  })

  return items
}
