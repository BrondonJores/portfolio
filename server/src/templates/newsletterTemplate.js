/* Template HTML d'email newsletter */

/**
 * Echappe les caracteres HTML speciaux pour eviter les injections XSS
 * dans les attributs et contenus texte issus des settings.
 * @param {*} str
 * @returns {string}
 */
function esc(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Formate une date en français (ex: "3 mars 2024")
 * @param {string|Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * Génère le HTML complet d'un email newsletter.
 *
 * @param {object} settings   - Objet { key: value } issu de Setting.findAll()
 * @param {object} payload    - Contenu dynamique fourni par l'admin
 * @param {string} payload.subject       - Objet de l'email (réutilisé dans le pre-header)
 * @param {string} payload.preheader     - Texte pre-header (optionnel)
 * @param {string} payload.body_html     - Contenu HTML principal de la newsletter (bloc central libre)
 * @param {Array}  [payload.articles]    - Articles en vedette à afficher (optionnel)
 *   Chaque article: { title, slug, excerpt, cover_image, published_at, tags }
 * @param {string} [payload.cta_label]   - Texte du bouton CTA principal (optionnel)
 * @param {string} [payload.cta_url]     - URL du bouton CTA principal (optionnel)
 * @param {string} [payload.unsubscribe_url] - URL de désabonnement (optionnel, default '#')
 *
 * @returns {string} HTML complet de l'email
 */
function generateNewsletterHtml(settings, payload) {
  const s = settings || {}
  const p = payload || {}

  const heroName = esc(s.hero_name || 'Brondon Jores')
  const heroTitle = esc(s.hero_title || '')
  const logoUrl = esc(s.logo_url || '')
  const avatarUrl = esc(s.avatar_url || '')
  const contactEmail = esc(s.contact_email || '')
  const unsubscribeUrl = esc(p.unsubscribe_url || '#')
  const preheaderText = esc(p.preheader || p.subject || '')
  const currentYear = new Date().getFullYear()

  /* Initiales extraites dynamiquement depuis le nom (ex: "Brondon Jores" → "BJ") */
  const rawName = s.hero_name || ''
  const initials = rawName
    ? rawName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 3)
    : 'BJ'

  /* --- Bloc logo / avatar / initiales dans le header --- */
  let logoBlock
  if (logoUrl) {
    logoBlock = `<img src="${logoUrl}" alt="${heroName}" style="max-height:48px;display:block;margin:0 auto 12px;" />`
  } else if (avatarUrl) {
    logoBlock = `<img src="${avatarUrl}" alt="${heroName}" width="48" height="48" style="width:48px;height:48px;border-radius:50%;display:block;margin:0 auto 12px;object-fit:cover;" />`
  } else {
    logoBlock = `<div style="display:inline-block;font-size:20px;font-weight:700;color:#6366f1;margin-bottom:12px;">${esc(initials)}</div>`
  }

  /* --- Bloc réseaux sociaux dans le footer --- */
  const socialLinks = [
    { key: 'github_url', label: 'GitHub' },
    { key: 'linkedin_url', label: 'LinkedIn' },
    { key: 'twitter_url', label: 'Twitter' },
    { key: 'youtube_url', label: 'YouTube' },
    { key: 'instagram_url', label: 'Instagram' },
  ]
  const presentSocialLinks = socialLinks.filter((l) => s[l.key])
  const socialHtml = presentSocialLinks.length > 0
    ? presentSocialLinks
        .map((l) => `<a href="${esc(s[l.key])}" style="color:#a5b4fc;text-decoration:none;font-size:13px;">${l.label}</a>`)
        .join(' &nbsp;·&nbsp; ')
    : ''

  const siteUrl = (s.site_url || 'https://brondonjores.dev').replace(/\/$/, '')
  let articlesHtml = ''
  if (Array.isArray(p.articles) && p.articles.length > 0) {
    const articleCards = p.articles.map((article) => {
      const title = esc(article.title || '')
      const slug = esc(article.slug || '')
      const excerpt = esc(article.excerpt || '')
      const coverImage = esc(article.cover_image || '')
      const articleUrl = `${siteUrl}/blog/${slug}`

      /* Image de couverture */
      const coverHtml = coverImage
        ? `<img src="${coverImage}" alt="${title}" style="width:100%;max-height:180px;object-fit:cover;display:block;border-radius:8px 8px 0 0;margin-bottom:12px;" />`
        : ''

      /* Date de publication */
      const dateHtml = article.published_at
        ? `<div style="color:#6366f1;font-size:12px;margin-top:8px;">${esc(formatDate(article.published_at))}</div>`
        : ''

      /* Tags */
      let tagsHtml = ''
      const tags = Array.isArray(article.tags) ? article.tags : []
      if (tags.length > 0) {
        const tagBadges = tags
          .map((tag) => `<span style="display:inline-block;background:rgba(99,102,241,0.12);color:#a5b4fc;border:1px solid #6366f1;border-radius:999px;padding:2px 8px;font-size:11px;margin-right:4px;">${esc(tag)}</span>`)
          .join('')
        tagsHtml = `<div style="margin-top:8px;">${tagBadges}</div>`
      }

      return `
        <div style="background:#16161e;border:1px solid #1e1e2e;border-radius:12px;padding:16px;margin-bottom:12px;">
          ${coverHtml}
          <a href="${articleUrl}" style="color:#f1f5f9;font-weight:600;font-size:16px;text-decoration:none;">${title}</a>
          ${excerpt ? `<div style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:6px;">${excerpt}</div>` : ''}
          ${dateHtml}
          ${tagsHtml}
        </div>`
    }).join('')

    articlesHtml = `
      <div style="background:#111118;padding:0 24px 32px;">
        <div style="font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:16px;"> Articles récents</div>
        ${articleCards}
      </div>`
  }

  /* --- Bloc CTA --- */
  let ctaHtml = ''
  if (p.cta_label && p.cta_url) {
    const ctaLabel = esc(p.cta_label)
    const ctaUrl = esc(p.cta_url)
    ctaHtml = `
      <div style="background:#111118;text-align:center;padding:24px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
          href="${ctaUrl}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%"
          strokecolor="#6366f1" fillcolor="#6366f1">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${ctaLabel}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${ctaUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;">
          ${ctaLabel}
        </a>
        <!--<![endif]-->
      </div>`
  }

  /* --- Email de contact dans le footer --- */
  const contactHtml = contactEmail
    ? `<div style="margin-top:8px;"><a href="mailto:${contactEmail}" style="color:#6366f1;font-size:12px;text-decoration:none;">${contactEmail}</a></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(p.subject || heroName)}</title>
  <style>
    /* Styles globaux pour les elements generes par body_html */
    body { margin: 0; padding: 0; background-color: #0a0a0f; }
    a { color: #a5b4fc; text-decoration: underline; }
    h2, h3 { color: #f1f5f9; }
    p { color: #94a3b8; line-height: 1.7; margin: 0 0 12px; }
    ul, ol { color: #94a3b8; padding-left: 20px; }
    li { margin-bottom: 6px; }

    /* Mode sombre — les clients compatibles conservent les bons fonds */
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background-color: #0a0a0f !important; }
      .email-wrapper { background-color: #0a0a0f !important; }
      .email-header { background-color: #0a0a0f !important; }
      .email-body { background-color: #111118 !important; }
      .email-footer { background-color: #0a0a0f !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- Pre-header invisible -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheaderText}</span>

  <!-- Wrapper centré max 600px -->
  <table class="email-wrapper" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0f;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin:0 auto;">

          <!-- HEADER : logo/avatar + nom + titre -->
          <tr>
            <td class="email-header" style="background-color:#0a0a0f;padding:32px 24px;text-align:center;">
              ${logoBlock}
              <div style="font-size:22px;font-weight:700;color:#f1f5f9;margin-bottom:4px;">${heroName}</div>
              ${heroTitle ? `<div style="font-size:13px;color:#94a3b8;">${heroTitle}</div>` : ''}
            </td>
          </tr>

          <!-- DIVIDER accent indigo -->
          <tr>
            <td style="background-color:#0a0a0f;padding-bottom:24px;text-align:center;">
              <div style="width:48px;height:2px;background-color:#6366f1;margin:0 auto;"></div>
            </td>
          </tr>

          <!-- BODY : contenu libre (body_html) -->
          <tr>
            <td class="email-body" style="background-color:#111118;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.7;color:#94a3b8;">
              ${p.body_html || ''}
            </td>
          </tr>

          <!-- ARTICLES EN VEDETTE (si payload.articles) -->
          ${articlesHtml ? `<tr><td style="padding:0;">${articlesHtml}</td></tr>` : ''}

          <!-- CTA BUTTON (si payload.cta_label + cta_url) -->
          ${ctaHtml ? `<tr><td style="padding:0;">${ctaHtml}</td></tr>` : ''}

          <!-- FOOTER : réseaux sociaux + contact + désabonnement -->
          <tr>
            <td class="email-footer" style="background-color:#0a0a0f;border-top:1px solid #1e1e2e;padding:24px;text-align:center;">
              ${socialHtml ? `<div style="margin-bottom:12px;">${socialHtml}</div>` : ''}
              ${contactHtml}
              <div style="margin-top:12px;color:#94a3b8;font-size:11px;">
                &copy; ${currentYear} ${heroName}. Tous droits réservés.
              </div>
              <div style="margin-top:8px;">
                <a href="${unsubscribeUrl}" style="color:#475569;font-size:11px;text-decoration:underline;">Se désabonner</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

module.exports = { generateNewsletterHtml }
