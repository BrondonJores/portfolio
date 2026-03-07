/* Service frontend reCAPTCHA v3: chargement script + generation de token. */

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-v3-script'
const RECAPTCHA_API_BASE_URL = 'https://www.google.com/recaptcha/api.js'

let scriptLoadingPromise = null

/**
 * Lit la cle publique reCAPTCHA depuis l'environnement Vite.
 * @returns {string} Cle site reCAPTCHA.
 */
function getSiteKey() {
  return String(import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim()
}

/**
 * Construit l'URL de chargement du script Google reCAPTCHA v3.
 * @param {string} siteKey Cle publique reCAPTCHA.
 * @returns {string} URL complete du script.
 */
function buildScriptUrl(siteKey) {
  return `${RECAPTCHA_API_BASE_URL}?render=${encodeURIComponent(siteKey)}`
}

/**
 * Verifie que l'API `grecaptcha` est deja chargee.
 * @returns {boolean} true si l'API est disponible.
 */
function isGrecaptchaReady() {
  return Boolean(window.grecaptcha && typeof window.grecaptcha.ready === 'function')
}

/**
 * Charge le script Google reCAPTCHA v3 une seule fois.
 * @returns {Promise<void>} Promise resolue une fois le script pret.
 */
function loadRecaptchaScript() {
  if (isGrecaptchaReady()) {
    return Promise.resolve()
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  const siteKey = getSiteKey()
  if (!siteKey) {
    return Promise.reject(new Error('reCAPTCHA non configure (VITE_RECAPTCHA_SITE_KEY manquante).'))
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Impossible de charger le script reCAPTCHA.')),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.id = RECAPTCHA_SCRIPT_ID
    script.src = buildScriptUrl(siteKey)
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Impossible de charger le script reCAPTCHA.'))

    document.head.appendChild(script)
  })

  return scriptLoadingPromise
}

/**
 * Precharge reCAPTCHA v3 pour afficher le badge le plus tot possible.
 * En absence de cle, la fonction reste silencieuse.
 * @returns {Promise<void>} Promise de prechargement.
 */
export async function preloadRecaptcha() {
  const siteKey = getSiteKey()
  if (!siteKey) {
    return
  }

  await loadRecaptchaScript()
}

/**
 * Execute reCAPTCHA v3 et retourne un token signe pour une action donnee.
 * @param {string} action Action metier (`contact_message`, `comment_create`, ...).
 * @returns {Promise<string>} Token reCAPTCHA a envoyer au backend.
 */
export async function executeRecaptcha(action) {
  const siteKey = getSiteKey()
  if (!siteKey) {
    throw new Error('Protection anti-bot non configuree sur ce client.')
  }

  const cleanAction = String(action || '').trim()
  if (!cleanAction) {
    throw new Error('Action reCAPTCHA manquante.')
  }

  await loadRecaptchaScript()

  if (!isGrecaptchaReady()) {
    throw new Error('API reCAPTCHA indisponible.')
  }

  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(siteKey, { action: cleanAction })
        if (!token) {
          reject(new Error('Token reCAPTCHA vide.'))
          return
        }
        resolve(token)
      } catch (err) {
        reject(new Error(err?.message || 'Execution reCAPTCHA impossible.'))
      }
    })
  })
}
