/* Utilitaire de sanitisation des entrees utilisateur avec DOMPurify */
import DOMPurify from 'dompurify'

/**
 * Sanitise une valeur en supprimant toutes les balises HTML.
 * Retourne uniquement du texte brut.
 */
export function sanitizeInput(value) {
  if (typeof value !== 'string') return ''
  /* Suppression de toutes les balises HTML, retour du texte brut uniquement */
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim()
}
