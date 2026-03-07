/* Mention legale reCAPTCHA (v3) a afficher sur les formulaires proteges. */

/**
 * Affiche la mention Google reCAPTCHA (privacy + terms).
 * @returns {JSX.Element} Bloc de conformite legal.
 */
export default function RecaptchaNotice() {
  return (
    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
      Ce site est protege par reCAPTCHA et la
      {' '}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
        style={{ color: 'var(--color-accent)' }}
      >
        Politique de confidentialite
      </a>
      {' '}
      et les
      {' '}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
        style={{ color: 'var(--color-accent)' }}
      >
        Conditions d&apos;utilisation
      </a>
      {' '}
      de Google s&apos;appliquent.
    </p>
  )
}

