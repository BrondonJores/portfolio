/* Templates predefinis pour inserer rapidement des structures de contenu. */

/**
 * Templates pour les articles de blog.
 * Chaque bloc est volontairement sans id: BlockEditor genere les ids a l'insertion.
 */
export const ARTICLE_BLOCK_TEMPLATES = [
  {
    id: 'article-story',
    label: 'Storytelling',
    description: 'Introduction, probleme, solution, conclusion.',
    blocks: [
      { type: 'heading', level: 2, content: 'Introduction' },
      { type: 'paragraph', content: 'Pose le contexte en 3 a 5 lignes.' },
      { type: 'heading', level: 2, content: 'Le probleme' },
      { type: 'paragraph', content: 'Explique clairement le point de douleur.' },
      { type: 'heading', level: 2, content: 'La solution' },
      { type: 'list', items: ['Action 1', 'Action 2', 'Action 3'] },
      { type: 'quote', content: 'Citation ou retour d experience fort.', author: '' },
      { type: 'heading', level: 2, content: 'Conclusion' },
      { type: 'paragraph', content: 'Resume les enseignements et ouvre sur la suite.' },
    ],
  },
  {
    id: 'article-tutorial',
    label: 'Tutoriel',
    description: 'Structure pas a pas pour un guide technique.',
    blocks: [
      { type: 'heading', level: 2, content: 'Objectif du tutoriel' },
      { type: 'paragraph', content: 'Precise ce que le lecteur saura faire a la fin.' },
      { type: 'heading', level: 2, content: 'Prerequis' },
      { type: 'list', items: ['Prerequis 1', 'Prerequis 2'] },
      { type: 'heading', level: 2, content: 'Etape 1' },
      { type: 'paragraph', content: 'Decris la premiere action.' },
      { type: 'code', language: 'js', content: '// Exemple de code a executer' },
      { type: 'heading', level: 2, content: 'Resultat attendu' },
      { type: 'paragraph', content: 'Montre le resultat final et les verifications.' },
    ],
  },
]

/**
 * Templates pour les pages projets/case studies.
 */
export const PROJECT_BLOCK_TEMPLATES = [
  {
    id: 'project-case-study',
    label: 'Case Study',
    description: 'Contexte, approche, resultat, lessons learned.',
    blocks: [
      { type: 'heading', level: 2, content: 'Contexte' },
      { type: 'paragraph', content: 'Presente le contexte business/produit du projet.' },
      { type: 'heading', level: 2, content: 'Defi principal' },
      { type: 'paragraph', content: 'Quel etait le probleme critique a resoudre ?' },
      { type: 'heading', level: 2, content: 'Approche technique' },
      { type: 'list', items: ['Decision technique 1', 'Decision technique 2'] },
      { type: 'heading', level: 2, content: 'Resultats' },
      { type: 'list', items: ['KPI 1', 'KPI 2', 'KPI 3'] },
      { type: 'quote', content: 'Retour client ou equipe.', author: '' },
    ],
  },
  {
    id: 'project-launch',
    label: 'Produit lance',
    description: 'Narratif de lancement et highlights du produit.',
    blocks: [
      { type: 'heading', level: 2, content: 'Vision produit' },
      { type: 'paragraph', content: 'Explique la proposition de valeur principale.' },
      { type: 'heading', level: 2, content: 'Fonctionnalites cles' },
      { type: 'list', items: ['Feature 1', 'Feature 2', 'Feature 3'] },
      { type: 'image', url: '', caption: 'Capture principale du produit' },
      { type: 'heading', level: 2, content: 'Roadmap' },
      { type: 'paragraph', content: 'Quelles evolutions sont prevues ensuite ?' },
    ],
  },
]

/**
 * Templates pour les campagnes newsletter.
 */
export const NEWSLETTER_BLOCK_TEMPLATES = [
  {
    id: 'newsletter-weekly',
    label: 'Hebdo',
    description: 'Format newsletter hebdomadaire clair et compact.',
    blocks: [
      { type: 'heading', level: 2, content: 'Les actus de la semaine' },
      { type: 'paragraph', content: 'Petit mot d intro (2 a 4 lignes).' },
      { type: 'heading', level: 2, content: 'A retenir' },
      { type: 'list', items: ['Point cle 1', 'Point cle 2', 'Point cle 3'] },
      { type: 'heading', level: 2, content: 'Focus de la semaine' },
      { type: 'paragraph', content: 'Developpe un sujet plus en profondeur.' },
      { type: 'quote', content: 'Phrase forte ou insight.', author: '' },
      { type: 'heading', level: 2, content: 'A lire ensuite' },
      { type: 'paragraph', content: 'Lien/CTA vers tes ressources.' },
    ],
  },
  {
    id: 'newsletter-launch',
    label: 'Annonce',
    description: 'Template pour lancement de produit ou nouveaute.',
    blocks: [
      { type: 'heading', level: 2, content: 'Grande annonce' },
      { type: 'paragraph', content: 'Annonce la nouveaute en une phrase forte.' },
      { type: 'image', url: '', caption: 'Visuel de la nouveaute' },
      { type: 'heading', level: 2, content: 'Pourquoi c est important' },
      { type: 'paragraph', content: 'Explique le benefice utilisateur concret.' },
      { type: 'heading', level: 2, content: 'Ce que tu peux faire maintenant' },
      { type: 'list', items: ['Action 1', 'Action 2'] },
    ],
  },
]
