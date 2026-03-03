/* Seeder pour les competences techniques */
'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('skills', [
      /* Frontend */
      { name: 'React',        category: 'Frontend', level: 95, sort_order: 1, created_at: new Date(), updated_at: new Date() },
      { name: 'JavaScript',   category: 'Frontend', level: 90, sort_order: 2, created_at: new Date(), updated_at: new Date() },
      { name: 'HTML5',        category: 'Frontend', level: 95, sort_order: 3, created_at: new Date(), updated_at: new Date() },
      { name: 'CSS3',         category: 'Frontend', level: 90, sort_order: 4, created_at: new Date(), updated_at: new Date() },
      { name: 'Tailwind CSS', category: 'Frontend', level: 88, sort_order: 5, created_at: new Date(), updated_at: new Date() },
      /* Backend */
      { name: 'Node.js',    category: 'Backend', level: 85, sort_order: 1, created_at: new Date(), updated_at: new Date() },
      { name: 'Express',    category: 'Backend', level: 85, sort_order: 2, created_at: new Date(), updated_at: new Date() },
      { name: 'PostgreSQL', category: 'Backend', level: 80, sort_order: 3, created_at: new Date(), updated_at: new Date() },
      { name: 'MySQL',      category: 'Backend', level: 80, sort_order: 4, created_at: new Date(), updated_at: new Date() },
      { name: 'REST API',   category: 'Backend', level: 90, sort_order: 5, created_at: new Date(), updated_at: new Date() },
      /* Outils */
      { name: 'Git',     category: 'Outils', level: 90, sort_order: 1, created_at: new Date(), updated_at: new Date() },
      { name: 'Docker',  category: 'Outils', level: 75, sort_order: 2, created_at: new Date(), updated_at: new Date() },
      { name: 'Vite',    category: 'Outils', level: 85, sort_order: 3, created_at: new Date(), updated_at: new Date() },
      { name: 'VS Code', category: 'Outils', level: 95, sort_order: 4, created_at: new Date(), updated_at: new Date() },
      { name: 'Figma',   category: 'Outils', level: 70, sort_order: 5, created_at: new Date(), updated_at: new Date() },
    ], {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('skills', null, {})
  },
}
