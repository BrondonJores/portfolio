/* Seeder pour les temoignages clients */
'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('testimonials', [
      {
        author_name: 'Marie Dupont',
        author_role: 'Chef de projet',
        content:     'Brondon a realise notre application de gestion en un temps record. Code propre, livraison dans les delais et communication excellente tout au long du projet.',
        visible:     true,
        created_at:  new Date(),
      },
      {
        author_name: 'Thomas Martin',
        author_role: 'Fondateur de startup',
        content:     'Un developpeur serieux et professionnel. Il a su comprendre nos besoins et proposer des solutions techniques pertinentes et bien documentees.',
        visible:     true,
        created_at:  new Date(),
      },
    ], {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('testimonials', null, {})
  },
}
