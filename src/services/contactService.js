/**
 * Service d'envoi de messages de contact via l'API Resend.
 * Ne lance jamais d'exception - retourne toujours un objet resultat.
 * La cle API n'est jamais exposee dans les messages d'erreur.
 */
export async function sendContactMessage({ name, email, message }) {
  /* Lecture de la cle API depuis les variables d'environnement Vite */
  const apiKey = import.meta.env.VITE_RESEND_API_KEY
  const toEmail = import.meta.env.VITE_CONTACT_EMAIL

  if (!apiKey || !toEmail) {
    return { success: false, error: 'Configuration du service de contact manquante.' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Portfolio Contact <onboarding@resend.dev>',
        to: [toEmail],
        subject: `Nouveau message de ${name}`,
        text: `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      }),
    })

    if (!response.ok) {
      /* Ne pas exposer les details de l'erreur API dans le message retourne */
      return { success: false, error: 'Echec de l\'envoi du message. Veuillez reessayer.' }
    }

    return { success: true }
  } catch {
    /* Ne jamais propager l'exception - retourner un objet resultat */
    return { success: false, error: 'Une erreur reseau est survenue. Veuillez reessayer.' }
  }
}
