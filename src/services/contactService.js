/* Service de compatibilite pour envoi de message via backend API. */
import { sendMessage } from './messageService.js'

/**
 * Envoie un message de contact sans exposer de secret cote client.
 * Ne lance jamais d'exception - retourne toujours un objet resultat.
 */
export async function sendContactMessage({ name, email, message, captcha_token }) {
  try {
    await sendMessage({ name, email, message, captcha_token })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err?.message || "Echec de l'envoi du message. Veuillez reessayer.",
    }
  }
}
