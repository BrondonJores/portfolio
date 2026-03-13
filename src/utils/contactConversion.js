export const CONTACT_INTENT_PRESETS = Object.freeze([
  {
    id: 'audit',
    label: 'Audit',
    title: 'Auditer et prioriser',
    description: "Faire un état des lieux utile d’un produit, d’une codebase ou d’un funnel existant.",
    helper: 'Idéal pour repartir avec des priorités claires et des quick wins utiles.',
  },
  {
    id: 'build',
    label: 'Build',
    title: 'Lancer ou refondre',
    description: 'Cadrer un MVP, une refonte ou une nouvelle surface produit avec une exécution propre.',
    helper: 'Le bon point de départ pour transformer une intention en plan de livraison concret.',
  },
  {
    id: 'rescue',
    label: 'Renfort',
    title: 'Débloquer un sprint',
    description: 'Intervenir sur un point critique : livraison bloquée, dette, bugs ou dernier polish.',
    helper: 'Pensé pour les contextes où il faut remettre du mouvement vite, sans bruit inutile.',
  },
])

export const CONTACT_BRIEF_CHECKLIST = Object.freeze([
  'Contexte et produit',
  'Objectif concret',
  'Timing ou deadline',
  'Contrainte majeure',
])

export const CONTACT_REASSURANCE_POINTS = Object.freeze([
  {
    key: 'clarity',
    label: 'Premier cadrage utile',
    detail: 'Un objectif, un timing et une contrainte suffisent pour lancer une conversation claire.',
  },
  {
    key: 'next-step',
    label: 'Pas de tunnel commercial',
    detail: 'Je reviens avec un angle, une priorisation et le meilleur prochain pas concret.',
  },
  {
    key: 'format',
    label: 'Format flexible',
    detail: 'Audit, renfort, sprint ciblé ou build complet selon le contexte réel.',
  },
])

/**
 * Resolve un intent vers un preset connu.
 * @param {unknown} value Intent brut.
 * @returns {{id:string,label:string,title:string,description:string,helper:string}|null} Preset.
 */
export function resolveContactIntentPreset(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return CONTACT_INTENT_PRESETS.find((preset) => preset.id === normalized) || null
}

/**
 * Construit un message guide à injecter dans le formulaire.
 * @param {{title:string}|null} preset Preset cible.
 * @returns {string} Message pré-rempli.
 */
export function buildContactIntentMessage(preset) {
  if (!preset) {
    return ''
  }

  return [
    'Bonjour,',
    '',
    `Je vous contacte pour ${preset.title.toLowerCase()}.`,
    '',
    'Contexte :',
    '- ',
    '',
    'Objectif :',
    '- ',
    '',
    'Timing / deadline :',
    '- ',
    '',
    'Contrainte principale :',
    '- ',
  ].join('\n')
}

/**
 * Retourne l’URL de contact pré-qualifiée.
 * @param {string} intentId Identifiant intent.
 * @returns {string} Href vers /contact.
 */
export function getContactIntentHref(intentId) {
  const normalized = String(intentId || '').trim().toLowerCase()
  if (!normalized) {
    return '/contact'
  }
  return `/contact?intent=${encodeURIComponent(normalized)}`
}
