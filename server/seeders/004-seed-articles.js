/* Seeder pour les articles du blog */
'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('articles', [
      {
        title:        'Les bonnes pratiques SOLID en React',
        slug:         'bonnes-pratiques-solid-react',
        excerpt:      'Decouvrez comment appliquer les principes SOLID dans vos composants React pour un code plus maintenable, testable et evolutif.',
        content:      'Les principes SOLID constituent un ensemble de bonnes pratiques de conception logicielle applicables aux composants React. Le principe de responsabilite unique invite a creer des composants concentres sur une seule tache, tandis que le principe ouvert/ferme encourage l\'extension des comportements sans modifier l\'existant. En appliquant l\'inversion de dependances via les props et le principe de segregation des interfaces avec des hooks specifiques, vous obtenez une architecture React modulaire, facile a tester et a faire evoluer sans effets de bord.',
        likes:        0,
        tags:         JSON.stringify(['React', 'SOLID', 'Architecture', 'JavaScript']),
        published:    true,
        published_at: new Date(),
        created_at:   new Date(),
        updated_at:   new Date(),
      },
      {
        title:        'Securiser une API REST avec JWT',
        slug:         'securiser-api-rest-jwt',
        excerpt:      'Guide complet pour implementer une authentification JWT robuste dans une API Node.js/Express avec refresh tokens et HTTP-only cookies.',
        content:      'L\'authentification par JSON Web Token (JWT) est un standard largement adopte pour securiser les API REST. Cote Node.js/Express, on genere un access token de courte duree et un refresh token stocke dans un cookie HTTP-only pour eviter les attaques XSS. La validation du token est effectuee par un middleware dedie qui verifie la signature et l\'expiration avant d\'autoriser l\'acces aux routes protegees. En combinant rotation des refresh tokens, revocation et HTTPS, on obtient une architecture d\'authentification robuste et conforme aux meilleures pratiques de securite.',
        tags:         JSON.stringify(['Node.js', 'JWT', 'Securite', 'Express']),
        likes:        0,
        published:    true,
        published_at: new Date(),
        created_at:   new Date(),
        updated_at:   new Date(),
      },
    ], {})
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('articles', null, {})
  },
}
