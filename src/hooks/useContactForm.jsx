/* Hook de gestion du formulaire de contact */
import { useState } from 'react'
import { sanitizeInput } from '../utils/sanitize.js'
import { sendMessage } from '../services/messageService.js'

const INITIAL_FIELDS = { name: '', email: '', message: '' }
const INITIAL_STATUS = { loading: false, success: false, error: null }

/**
 * Gere l'etat du formulaire de contact avec sanitisation et soumission.
 * Respecte le principe de responsabilite unique (SRP).
 */
export function useContactForm() {
  const [fields, setFields] = useState(INITIAL_FIELDS)
  const [status, setStatus] = useState(INITIAL_STATUS)

  /* Mise a jour d'un champ du formulaire */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
  }

  /* Soumission du formulaire avec sanitisation des donnees */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ loading: true, success: false, error: null })

    /* Sanitisation de tous les champs avant envoi */
    const sanitizedFields = {
      name: sanitizeInput(fields.name),
      email: sanitizeInput(fields.email),
      message: sanitizeInput(fields.message),
    }

    try {
      await sendMessage(sanitizedFields)
      setStatus({ loading: false, success: true, error: null })
      setFields(INITIAL_FIELDS)
    } catch (err) {
      setStatus({
        loading: false,
        success: false,
        error: err.message || 'Echec de l\'envoi du message. Veuillez reessayer.',
      })
    }
  }

  return { fields, handleChange, handleSubmit, status }
}
