/* Seeder pour les projets du portfolio */
'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('projects', [
      {
        title:       'Portfolio BrondonJores',
        slug:        'portfolio-brondonjores',
        description: 'Mon portfolio personnel construit avec React 19, Node.js, Express et MySQL. Design moderne dark techy avec mode nuit/jour, dashboard admin securise et donnees dynamiques.',
        tags:        JSON.stringify(['React', 'Node.js', 'MySQL', 'Tailwind CSS']),
        github_url:  'https://github.com/BrondonJores/portfolio',
        demo_url:    null,
        featured:    true,
        published:   true,
        created_at:  new Date(),
        updated_at:  new Date(),
      },
      {
        title:       'Application de gestion de taches',
        slug:        'application-gestion-taches',
        description: 'Application web complete de gestion de taches avec authentification JWT, tableau de bord interactif et gestion des priorites.',
        tags:        JSON.stringify(['React', 'Express', 'PostgreSQL', 'JWT']),
        github_url:  'https://github.com/BrondonJores',
        demo_url:    null,
        featured:    true,
        published:   true,
        created_at:  new Date(),
        updated_at:  new Date(),
      },
      {
        title:       'API REST securisee',
        slug:        'api-rest-securisee',
        description: 'API REST construite avec Node.js et Express, avec authentification JWT, validation des donnees, rate limiting et documentation Swagger.',
        tags:        JSON.stringify(['Node.js', 'Express', 'JWT', 'MySQL']),
        github_url:  'https://github.com/BrondonJores',
        demo_url:    null,
        featured:    false,
        published:   true,
        created_at:  new Date(),
        updated_at:  new Date(),
      },
    ], {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('projects', null, {})
  },
}
