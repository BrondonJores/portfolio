/* Seeder pour les parametres par defaut du portfolio */
'use strict'

module.exports = {
  async up(queryInterface) {
    const now = new Date()

    const settings = [
      /* ── Identité ─────────────────────────────────────────── */
      { key: 'hero_name',   value: 'Brondon Jores' },
      { key: 'hero_title',  value: 'Developpeur Full Stack' },
      { key: 'bio',         value: "Developpeur Full Stack passionne par la creation d'applications web modernes et performantes. Je me specialise dans l'ecosysteme JavaScript avec React pour le frontend et Node.js pour le backend." },
      { key: 'avatar_url',  value: '' },
      { key: 'logo_url',    value: '' },

      /* Statistiques About */
      { key: 'stat_1_value', value: '3+' },
      { key: 'stat_1_label', value: "ans d'experience" },
      { key: 'stat_2_value', value: '20+' },
      { key: 'stat_2_label', value: 'projets realises' },
      { key: 'stat_3_value', value: '10+' },
      { key: 'stat_3_label', value: 'clients satisfaits' },

      /* ── Réseaux sociaux ───────────────────────────────────── */
      { key: 'github_url',    value: 'https://github.com/BrondonJores' },
      { key: 'linkedin_url',  value: 'https://linkedin.com/in/brondonjores' },
      { key: 'twitter_url',   value: '' },
      { key: 'youtube_url',   value: '' },
      { key: 'instagram_url', value: '' },

      /* ── Contact ───────────────────────────────────────────── */
      { key: 'contact_email',        value: 'contact@brondonjores.dev' },
      { key: 'contact_location',     value: 'France' },
      { key: 'contact_availability', value: 'Disponible pour des projets' },

      /* ── SEO ───────────────────────────────────────────────── */
      { key: 'seo_title',       value: 'BrondonJores - Developpeur Full Stack' },
      { key: 'seo_description', value: 'Portfolio de BrondonJores, developpeur Full Stack specialise React et Node.js. Applications web modernes, performantes et securisees.' },
      { key: 'seo_keywords',    value: 'developpeur, full stack, react, node.js, javascript, portfolio' },
      { key: 'og_image_url',    value: '' },

      /* ── Apparence ─────────────────────────────────────────── */
      { key: 'footer_text',      value: 'Tous droits reserves.' },
      { key: 'footer_credits',   value: 'Construit avec React, Tailwind CSS et Heroicons' },
      { key: 'maintenance_mode', value: 'false' },
    ].map((s) => ({ ...s, updated_at: now }))

    await queryInterface.bulkInsert('settings', settings, {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('settings', null, {})
  },
}