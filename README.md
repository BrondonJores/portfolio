# BrondonJores - Portfolio Full Stack

Portfolio professionnel full stack avec frontend React 19 et backend Node.js + Express + MySQL, incluant un dashboard administrateur protege par JWT.

## Stack technique

### Frontend
- React 19 + Vite 6
- Tailwind CSS v4 avec @tailwindcss/vite
- React Router DOM v7
- Framer Motion v11
- Heroicons v2.2.0
- DOMPurify (sanitisation des entrees)
- react-helmet-async (CSP meta tags)
- Fontsource Inter Variable + JetBrains Mono Variable

### Backend
- Node.js + Express 4
- MySQL 8 + Sequelize 6
- JWT (access token en memoire, refresh token HTTP-only cookie)
- bcryptjs (hachage des mots de passe, saltRounds: 12)
- helmet (en-tetes de securite HTTP)
- express-rate-limit
- express-validator
- morgan (logs HTTP)
- cors


## Securite

- JWT access token stocke uniquement en memoire React (jamais en localStorage)
- Refresh token en cookie HTTP-only avec `sameSite: strict`
- Mots de passe haches avec bcrypt (saltRounds: 12)
- Rate limiting : 100 req/15min global, 5 req/15min sur /api/auth/login
- Helmet pour les en-tetes HTTP de securite
- CORS configure uniquement pour l'origine frontend
- DOMPurify sur tous les contenus HTML affiches
- Validation des inputs avec express-validator cote serveur
