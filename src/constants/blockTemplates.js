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
 * Templates pour les pages CMS generiques.
 */
export const PAGE_BLOCK_TEMPLATES = [
  {
    id: 'page-landing',
    label: 'Landing simple',
    description: 'Hero, preuves et CTA, organise en sections multi-colonnes.',
    blocks: [
      {
        type: 'section',
        layout: '2-col',
        variant: 'accent',
        spacing: 'lg',
        anchor: 'hero',
        columns: [
          [
            { type: 'heading', level: 2, content: 'Titre principal de la page' },
            { type: 'paragraph', content: 'Sous-titre qui explique rapidement la proposition de valeur.' },
            { type: 'list', items: ['Promesse 1', 'Promesse 2', 'Promesse 3'] },
          ],
          [{ type: 'image', url: '', caption: 'Visuel principal' }],
        ],
      },
      {
        type: 'section',
        layout: '3-col',
        variant: 'soft',
        spacing: 'md',
        anchor: 'benefices',
        columns: [
          [{ type: 'heading', level: 3, content: 'Argument 1' }, { type: 'paragraph', content: 'Detail argument 1.' }],
          [{ type: 'heading', level: 3, content: 'Argument 2' }, { type: 'paragraph', content: 'Detail argument 2.' }],
          [{ type: 'heading', level: 3, content: 'Argument 3' }, { type: 'paragraph', content: 'Detail argument 3.' }],
        ],
      },
      {
        type: 'section',
        layout: '1-col',
        variant: 'default',
        spacing: 'md',
        anchor: 'cta',
        columns: [[
          { type: 'quote', content: 'Preuve sociale ou citation marquante.', author: '' },
          { type: 'heading', level: 2, content: 'Appel a l action' },
          { type: 'paragraph', content: 'Invite clairement le visiteur a passer a l action.' },
        ]],
      },
    ],
  },
  {
    id: 'page-about',
    label: 'Page About',
    description: 'Template About moderne en sections editoriales.',
    blocks: [
      {
        type: 'section',
        layout: '2-col',
        variant: 'default',
        spacing: 'md',
        anchor: 'about',
        columns: [
          [
            { type: 'heading', level: 2, content: 'Qui je suis' },
            { type: 'paragraph', content: 'Presente ton parcours et ta mission.' },
          ],
          [{ type: 'image', url: '', caption: 'Portrait / image de contexte' }],
        ],
      },
      {
        type: 'section',
        layout: '2-col',
        variant: 'soft',
        spacing: 'md',
        anchor: 'valeurs',
        columns: [
          [{ type: 'heading', level: 2, content: 'Mes valeurs' }, { type: 'list', items: ['Valeur 1', 'Valeur 2', 'Valeur 3'] }],
          [{ type: 'heading', level: 2, content: 'Mon expertise' }, { type: 'paragraph', content: 'Explique ce que tu sais faire concretement.' }],
        ],
      },
      {
        type: 'section',
        layout: '1-col',
        variant: 'accent',
        spacing: 'sm',
        anchor: 'suite',
        columns: [[
          { type: 'heading', level: 2, content: 'Et maintenant' },
          { type: 'paragraph', content: 'Conclue avec un message clair et humain.' },
        ]],
      },
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
