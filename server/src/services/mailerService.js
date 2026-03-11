/* Service d'envoi d'emails (Brevo en prod, SMTP optionnel en dev). */
const nodemailerLib = require('nodemailer')
const { generateNewsletterHtml } = require('../templates/newsletterTemplate')

/**
 * Parse une variable booleenne type env (`true`, `1`, `yes`, `on`).
 * @param {unknown} value Valeur brute a interpreter.
 * @param {boolean} [fallback=false] Valeur de repli si absente.
 * @returns {boolean} Booleen calcule.
 */
function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

/**
 * Parse une valeur entiere strictement positive.
 * @param {unknown} value Valeur brute.
 * @param {number} fallback Valeur de repli.
 * @returns {number} Entier normalise.
 */
function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Verifie qu'une variable requise existe dans l'objet env.
 * @param {object} env Objet des variables d'environnement.
 * @param {string} name Nom de la variable a verifier.
 * @returns {string} Valeur de la variable.
 * @throws {Error} Erreur explicite si la variable est manquante.
 */
function requireEnv(env, name) {
  const value = env[name]
  if (!value) {
    throw new Error(`${name} manquant`)
  }
  return value
}

/**
 * Parse une valeur expediteur au format `Nom <email@domaine>`.
 * @param {string|undefined|null} fromValue Valeur brute expediteur.
 * @returns {{name:string,email:string}} Objet expediteur normalise.
 */
function parseFromValue(fromValue) {
  const raw = String(fromValue || '').trim()
  if (!raw) {
    return { name: '', email: '' }
  }

  const match = /"?(.*?)"?\s*<([^>]+)>/.exec(raw)
  if (match) {
    return {
      name: (match[1] || '').trim(),
      email: (match[2] || '').trim(),
    }
  }

  if (raw.includes('@')) {
    return { name: '', email: raw }
  }

  return { name: raw, email: '' }
}

/**
 * Construit le service mailer avec dependances injectables.
 * Permet de tester le service sans dependre directement des providers reels.
 * @param {object} [deps={}] Dependances externes optionnelles.
 * @param {object} [deps.env] Variables d'environnement cible.
 * @param {object} [deps.nodemailer] Implementation nodemailer.
 * @param {Function} [deps.fetch] Implementation fetch.
 * @param {Function} [deps.generateNewsletterHtml] Fonction de rendu template.
 * @returns {{sendMail: Function, sendNewsletter: Function, resolveDeliveryMode: Function}} API publique du mailer.
 */
function createMailerService(deps = {}) {
  const env = deps.env || process.env
  const nodemailer = deps.nodemailer || nodemailerLib
  const fetchFn = deps.fetch || global.fetch
  const renderNewsletterHtml = deps.generateNewsletterHtml || generateNewsletterHtml

  /**
   * Determine le mode de livraison effectif.
   * @returns {'brevo'|'smtp'|'mock'} Mode de livraison retenu.
   */
  function resolveDeliveryMode() {
    const explicitMode = String(env.MAIL_DELIVERY_MODE || '').trim().toLowerCase()
    if (explicitMode === 'dev') {
      return 'mock'
    }

    if (explicitMode === 'brevo' || explicitMode === 'smtp' || explicitMode === 'mock') {
      return explicitMode
    }

    const hasBrevo = Boolean(env.BREVO_API_KEY) && Boolean(env.BREVO_SENDER_EMAIL)
    if (hasBrevo) {
      return 'brevo'
    }

    if (env.DEV_SMTP_HOST || env.SMTP_HOST) {
      return 'smtp'
    }

    return 'brevo'
  }

  /**
   * Construit l'expediteur par defaut selon le mode.
   * @param {'brevo'|'smtp'|'mock'} mode Mode de livraison retenu.
   * @returns {{name:string,email:string}} Informations expediteur.
   */
  function resolveDefaultSender(mode) {
    if (mode === 'mock') {
      return {
        name: 'Mock Sender',
        email: 'mock@example.test',
      }
    }

    if (mode === 'smtp') {
      const parsed = parseFromValue(env.DEV_SMTP_FROM || env.SMTP_FROM)
      return {
        name: parsed.name || 'Portfolio Dev',
        email: parsed.email || env.DEV_SMTP_USER || env.SMTP_USER || 'noreply@localhost',
      }
    }

    return {
      name: 'Newsletter',
      email: requireEnv(env, 'BREVO_SENDER_EMAIL'),
    }
  }

  /**
   * Envoie un email via l'API Brevo.
   * @param {{fromName:string,fromEmail:string,toEmail:string,subject:string,html:string}} params Donnees email.
   * @returns {Promise<object>} Reponse provider parsee.
   */
  async function brevoSendEmail({ fromName, fromEmail, toEmail, subject, html }) {
    if (typeof fetchFn !== 'function') {
      throw new Error('fetch indisponible pour le provider Brevo')
    }

    const apiKey = requireEnv(env, 'BREVO_API_KEY')

    const payload = {
      sender: { name: fromName || 'Newsletter', email: fromEmail },
      to: [{ email: toEmail }],
      subject,
      htmlContent: html,
    }

    const response = await fetchFn('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Brevo API error: ${response.status} ${text}`)
    }

    return response.json().catch(() => ({}))
  }

  /**
   * Envoie un email via SMTP (mailpit/mailhog/local ou relay SMTP).
   * @param {{fromName:string,fromEmail:string,toEmail:string,subject:string,html:string}} params Donnees email.
   * @returns {Promise<object>} Resultat de `nodemailer.sendMail`.
   */
  async function smtpSendEmail({ fromName, fromEmail, toEmail, subject, html }) {
    const host = env.DEV_SMTP_HOST || env.SMTP_HOST
    const port = Number(env.DEV_SMTP_PORT || env.SMTP_PORT || 1025)
    const secure = parseBooleanEnv(
      env.DEV_SMTP_SECURE !== undefined ? env.DEV_SMTP_SECURE : env.SMTP_SECURE,
      false
    )
    const user = env.DEV_SMTP_USER || env.SMTP_USER || ''
    const pass = env.DEV_SMTP_PASS || env.SMTP_PASS || ''

    if (!host) {
      throw new Error('DEV_SMTP_HOST/SMTP_HOST manquant')
    }

    if (!Number.isFinite(port)) {
      throw new Error('DEV_SMTP_PORT/SMTP_PORT invalide')
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user ? { auth: { user, pass } } : {}),
    })

    const from = `"${fromName || 'Portfolio Dev'}" <${fromEmail}>`
    return transporter.sendMail({
      from,
      to: toEmail,
      subject,
      html,
    })
  }

  /**
   * Route un envoi vers le provider adapte (`mock`, `smtp`, `brevo`).
   * @param {{mode:string,fromName:string,fromEmail:string,toEmail:string,subject:string,html:string}} params Donnees normalisees.
   * @returns {Promise<object>} Reponse provider.
   */
  async function sendWithProvider({ mode, fromName, fromEmail, toEmail, subject, html }) {
    if (mode === 'mock') {
      return {
        mocked: true,
        accepted: [toEmail],
        envelope: { from: fromEmail, to: [toEmail] },
        message: `Mock send: ${subject}`,
        fromName,
        htmlLength: typeof html === 'string' ? html.length : 0,
      }
    }

    if (mode === 'smtp') {
      return smtpSendEmail({ fromName, fromEmail, toEmail, subject, html })
    }

    return brevoSendEmail({ fromName, fromEmail, toEmail, subject, html })
  }

  /**
   * Envoie un email unitaire (hors campagne).
   * @param {{from?:string,to:string,subject:string,html:string}} params Parametres d'envoi.
   * @returns {Promise<object>} Reponse provider.
   */
  async function sendMail({ from, to, subject, html }) {
    const mode = resolveDeliveryMode()
    const fromParsed = parseFromValue(from)
    const defaultSender = resolveDefaultSender(mode)

    return sendWithProvider({
      mode,
      fromName: fromParsed.name || defaultSender.name,
      fromEmail: fromParsed.email || defaultSender.email,
      toEmail: to,
      subject,
      html,
    })
  }

  /**
   * Envoie une campagne newsletter a une liste d'abonnes.
   * Continue l'envoi meme si certains destinataires echouent, puis retourne un bilan.
   * @param {object} params Parametres campagne.
   * @param {object} params.campaign Campagne newsletter.
   * @param {Array<{email:string,unsubscribe_token:string}>} params.subscribers Liste abonnes confirmes.
   * @param {string} [params.fromName] Nom expediteur force.
   * @param {string} [params.fromEmail] Email expediteur force.
   * @param {object} [params.settings={}] Parametres globaux.
   * @returns {Promise<{success:number,failed:number,failedEmails:string[],mode:string}>} Bilan d'envoi.
   */
  async function sendNewsletter({ campaign, subscribers, fromName, fromEmail, settings = {} }) {
    const mode = resolveDeliveryMode()
    const appUrl = settings.site_url || env.APP_URL || ''
    const defaultSender = resolveDefaultSender(mode)

    const senderName = fromName || settings.newsletter_from_name || defaultSender.name
    const senderEmail = fromEmail || settings.newsletter_from_email || defaultSender.email

    if (!senderEmail) {
      throw new Error('Email expediteur manquant')
    }

    const failures = []
    const safeSubscribers = Array.isArray(subscribers) ? subscribers : []
    const configuredConcurrency = parsePositiveInteger(
      env.NEWSLETTER_SEND_CONCURRENCY,
      mode === 'mock' ? 40 : 8
    )
    const concurrency = Math.min(
      safeSubscribers.length || 1,
      Math.max(1, Math.min(configuredConcurrency, 50))
    )

    let cursor = 0
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < safeSubscribers.length) {
        const index = cursor
        cursor += 1
        const subscriber = safeSubscribers[index]
        const unsubscribeLink = `${appUrl}/api/unsubscribe/${subscriber.unsubscribe_token}`

        const templatePayload = {
          subject: campaign.subject,
          preheader: campaign.preheader,
          body_html: campaign.body_html,
          cta_label: campaign.cta_label,
          cta_url: campaign.cta_url,
          articles: campaign.articles,
          unsubscribe_url: unsubscribeLink,
        }

        const html = renderNewsletterHtml(settings, templatePayload)

        try {
          await sendWithProvider({
            mode,
            fromName: senderName,
            fromEmail: senderEmail,
            toEmail: subscriber.email,
            subject: campaign.subject,
            html,
          })
        } catch {
          failures.push(subscriber.email)
        }
      }
    })

    await Promise.all(workers)

    return {
      success: safeSubscribers.length - failures.length,
      failed: failures.length,
      failedEmails: failures,
      attempted: safeSubscribers.length,
      concurrency,
      mode,
    }
  }

  return {
    sendMail,
    sendNewsletter,
    resolveDeliveryMode,
  }
}

module.exports = {
  createMailerService,
  ...createMailerService(),
}
