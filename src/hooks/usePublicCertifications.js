import { useEffect, useMemo, useState } from 'react'
import { getCertifications } from '../services/certificationService.js'
import {
  extractCertificationBadgeImages,
  normalizeCertifications,
} from '../utils/certificationDisplay.js'

/**
 * Charge les certifications publiques et leurs derives d'affichage.
 * @returns {{certifications:Array<object>, badgeImages:Array<object>, loading:boolean}} Etat de chargement.
 */
export function usePublicCertifications() {
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true
    setLoading(true)

    getCertifications()
      .then((response) => {
        if (!isActive) {
          return
        }

        setCertifications(normalizeCertifications(response?.data))
      })
      .catch(() => {
        if (isActive) {
          setCertifications([])
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const badgeImages = useMemo(
    () => extractCertificationBadgeImages(certifications),
    [certifications]
  )

  return {
    certifications,
    badgeImages,
    loading,
  }
}
