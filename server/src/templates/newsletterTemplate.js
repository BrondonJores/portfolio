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
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * Génère le HTML complet d'un email newsletter.
 *
 * @param {object} settings   - Objet { key: value } issu de Setting.findAll()
 * @param {object} payload    - Contenu dynamique fourni par l'admin
 * @param {string} payload.subject       - Objet de l'email
 * @param {string} payload.preheader     - Texte pre-header (optionnel)
 * @param {string} payload.body_html     - Contenu HTML principal de la newsletter
 * @param {Array}  [payload.articles]    - Articles en vedette à afficher (optionnel)
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
  const siteUrl = esc((s.site_url || 'https://brondonjores.me').replace(/\/$/, ''))

  /* Initiales extraites dynamiquement depuis le nom */
  const rawName = s.hero_name || ''
  const initials = rawName
    ? rawName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 3)
    : 'BJ'

  /* --- Bloc logo / avatar / initiales dans le header --- */
  let logoBlock
  if (logoUrl) {
    logoBlock = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
        <tr>
          <td align="center">
            <img
              src="${logoUrl}"
              alt="${heroName}"
              width="160"
              style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;width:160px;max-width:160px;height:auto;"
            />
          </td>
        </tr>
      </table>`
  } else if (avatarUrl) {
    logoBlock = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
        <tr>
          <td align="center">
            <img
              src="${avatarUrl}"
              alt="${heroName}"
              width="60"
              height="60"
              style="display:block;border:0;outline:none;text-decoration:none;width:60px;height:60px;border-radius:50%;object-fit:cover;"
            />
          </td>
        </tr>
      </table>`
  } else {
    logoBlock = `
      <div style="display:inline-block;margin-bottom:16px;padding:12px 14px;border-radius:999px;background:rgba(255,255,255,0.08);color:#ffffff;font-size:18px;font-weight:800;letter-spacing:0.08em;">
        ${esc(initials)}
      </div>`
  }

  /* --- Bloc reseaux sociaux dans le footer --- */
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
        .map(
          (l) => `<a href="${esc(s[l.key])}" style="color:#c7d2fe;text-decoration:none;font-size:13px;font-weight:600;">${l.label}</a>`
        )
        .join(`<span style="color:#6366f1;padding:0 8px;">•</span>`)
    : ''

  /* --- Bloc hero / introduction --- */
  const heroLabel = p.cta_label ? 'Nouveau contenu' : 'Newsletter'
  const heroIntroHtml = `
    <tr>
      <td style="background:#111118;padding:0 30px 32px 30px;text-align:center;">
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(99,102,241,0.12);border:1px solid rgba(129,140,248,0.28);color:#c7d2fe;font-size:12px;font-weight:700;letter-spacing:0.02em;margin-bottom:16px;">
          ${esc(heroLabel)}
        </div>
        ${p.subject ? `<div class="hero-title" style="font-size:30px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:#f8fafc;margin:0 0 12px;">${esc(p.subject)}</div>` : ''}
        ${p.preheader ? `<div style="max-width:500px;margin:0 auto;font-size:15px;line-height:1.8;color:#cbd5e1;">${esc(p.preheader)}</div>` : ''}
      </td>
    </tr>`

  /* --- Bloc articles en vedette --- */
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
        ? `<img
            src="${coverImage}"
            alt="${title}"
            width="540"
            style="display:block;width:100%;height:auto;max-height:230px;object-fit:cover;border-radius:14px 14px 0 0;margin:0 0 16px 0;border:0;outline:none;text-decoration:none;"
          />`
        : ''

      /* Date de publication */
      const dateHtml = article.published_at
        ? `<div style="margin-top:10px;color:#818cf8;font-size:12px;font-weight:700;">${esc(formatDate(article.published_at))}</div>`
        : ''

      /* Tags */
      let tagsHtml = ''
      const tags = Array.isArray(article.tags) ? article.tags : []
      if (tags.length > 0) {
        const tagBadges = tags
          .map(
            (tag) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 10px;border-radius:999px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.35);color:#c7d2fe;font-size:11px;font-weight:600;">${esc(tag)}</span>`
          )
          .join('')
        tagsHtml = `<div style="margin-top:12px;">${tagBadges}</div>`
      }

      return `
        <div style="background:#151520;border:1px solid #232336;border-radius:18px;padding:16px;margin-bottom:18px;box-shadow:0 10px 30px rgba(0,0,0,0.22);">
          ${coverHtml}
          <a href="${articleUrl}" style="display:block;color:#f8fafc;font-size:19px;font-weight:800;line-height:1.35;text-decoration:none;">${title}</a>
          ${excerpt ? `<div style="margin-top:8px;color:#94a3b8;font-size:14px;line-height:1.8;">${excerpt}</div>` : ''}
          ${dateHtml}
          ${tagsHtml}
        </div>`
    }).join('')

    articlesHtml = `
      <tr>
        <td style="background:#111118;padding:4px 24px 28px 24px;">
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#f8fafc;margin:0 0 16px;">À lire ensuite</div>
          ${articleCards}
        </td>
      </tr>`
  }

  /* --- Bloc CTA --- */
  let ctaHtml = ''
  if (p.cta_label && p.cta_url) {
    const ctaLabel = esc(p.cta_label)
    const ctaUrl = esc(p.cta_url)

    ctaHtml = `
      <tr>
        <td style="background:#111118;padding:6px 24px 36px 24px;text-align:center;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
            href="${ctaUrl}" style="height:50px;v-text-anchor:middle;width:250px;" arcsize="16%"
            strokecolor="#6366f1" fillcolor="#4f46e5">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${ctaLabel}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a
            href="${ctaUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;padding:14px 28px;border-radius:12px;font-weight:800;font-size:15px;letter-spacing:0.01em;text-decoration:none;box-shadow:0 10px 24px rgba(99,102,241,0.35);"
          >
            ${ctaLabel}
          </a>
          <!--<![endif]-->
        </td>
      </tr>`
  }

  /* --- Bloc email de contact dans le footer --- */
  const contactHtml = contactEmail
    ? `<div style="margin-top:10px;"><a href="mailto:${contactEmail}" style="color:#818cf8;font-size:12px;text-decoration:none;">${contactEmail}</a></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${esc(p.subject || heroName)}</title>
  <style>
    /* Styles globaux pour les elements generes par body_html */
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #09090f;
    }

    a {
      color: #a5b4fc;
      text-decoration: underline;
    }

    h1, h2, h3 {
      color: #f8fafc;
      margin: 0 0 12px 0;
    }

    p {
      color: #cbd5e1;
      line-height: 1.85;
      margin: 0 0 14px 0;
    }

    ul, ol {
      color: #cbd5e1;
      padding-left: 22px;
      margin: 0 0 14px 0;
    }

    li {
      margin-bottom: 8px;
      line-height: 1.75;
    }

    blockquote {
      margin: 18px 0;
      padding: 16px 18px;
      border-left: 3px solid #6366f1;
      background: #151520;
      color: #cbd5e1;
      border-radius: 0 12px 12px 0;
    }

    pre {
      margin: 18px 0;
      padding: 16px;
      border-radius: 14px;
      overflow-x: auto;
      background: #0b1220;
      color: #e2e8f0;
      font-size: 13px;
      line-height: 1.7;
      border: 1px solid #1e293b;
    }

    code {
      font-family: Consolas, Monaco, monospace;
    }

    img {
      max-width: 100%;
    }

    /* Mode sombre */
    @media (prefers-color-scheme: dark) {
      body, .email-bg, .email-wrapper, .email-footer {
        background-color: #09090f !important;
      }

      .email-main, .email-section {
        background-color: #111118 !important;
      }
    }

    /* Responsive mobile */
    @media screen and (max-width: 600px) {
      .mobile-pad {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }

      .hero-title {
        font-size: 24px !important;
      }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

  <!-- Pre-header invisible -->
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheaderText}</span>

  <!-- Wrapper centré -->
  <table class="email-wrapper" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090f;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;margin:0 auto;">

          <!-- Carte principale -->
          <tr>
            <td style="padding:0;">
              <table class="email-main" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111118;border:1px solid #232336;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.35);">

                <!-- HEADER : logo/avatar + nom + titre -->
                <tr>
                  <td class="mobile-pad" style="background:
                    radial-gradient(circle at top left, rgba(129,140,248,0.24), transparent 35%),
                    linear-gradient(135deg, #141427 0%, #10101a 100%);
                    padding:34px 30px 22px 30px;
                    text-align:center;
                    border-bottom:1px solid #232336;">
                    ${logoBlock}
                    <div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1.2;margin-bottom:4px;">${heroName}</div>
                    ${heroTitle ? `<div style="font-size:13px;line-height:1.6;color:#c7d2fe;">${heroTitle}</div>` : ''}
                  </td>
                </tr>

                <!-- DIVIDER accent indigo -->
                <tr>
                  <td style="background:#111118;padding:0 30px 18px 30px;text-align:center;">
                    <div style="width:68px;height:3px;background:linear-gradient(90deg,#6366f1,#c7d2fe);margin:0 auto;border-radius:999px;"></div>
                  </td>
                </tr>

                <!-- HERO -->
                ${heroIntroHtml}

                <!-- BODY : contenu libre -->
                <tr>
                  <td class="email-section mobile-pad" style="background:#111118;padding:28px 30px 18px 30px;font-size:15px;line-height:1.85;color:#cbd5e1;">
                    ${p.body_html || ''}
                  </td>
                </tr>

                <!-- ARTICLES EN VEDETTE -->
                ${articlesHtml}

                <!-- CTA BUTTON -->
                ${ctaHtml}

              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="email-footer mobile-pad" style="padding:22px 24px 8px 24px;text-align:center;">
              <div style="font-size:14px;font-weight:700;color:#f8fafc;">${heroName}</div>
              <div style="margin-top:6px;font-size:12px;color:#94a3b8;">${heroTitle}</div>
              ${socialHtml ? `<div style="margin-top:16px;">${socialHtml}</div>` : ''}
              ${contactHtml}
              <div style="margin-top:14px;color:#64748b;font-size:11px;line-height:1.6;">&copy; ${currentYear} ${heroName}. Tous droits réservés.</div>
              <div style="margin-top:8px;">
                <a href="${unsubscribeUrl}" style="color:#64748b;font-size:11px;text-decoration:underline;">Se désabonner</a>
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