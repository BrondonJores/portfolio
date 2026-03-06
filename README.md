# Portfolio Full Stack (React + Express + PostgreSQL)

Application portfolio complete avec site public, blog, formulaire de contact, espace administrateur protege, moteur de theming dynamique et systeme d animations configurable depuis l admin.

## Fonctionnalites

### Site public
- Page d accueil composee de sections: Hero, A propos, Competences, Projets, Blog, Contact.
- Liste + detail des projets (`/projets`, `/projets/:slug`) avec tags, featured, liens GitHub/demo.
- Liste + detail des articles (`/blog`, `/blog/:slug`) avec:
  - rendu par blocs (paragraphes, titres, images, code, citations, listes),
  - table des matieres,
  - commentaires moderes,
  - articles similaires,
  - partage social + copie de lien,
  - inscription newsletter inline.
- Page competences avec regroupement par categorie.
- Page contact avec envoi de message + reseaux.
- Theme clair/sombre.

### Animations et design dynamiques
- Parametrage global du style via `settings` en base:
  - palettes sombre/clair,
  - typographie,
  - radius, glow, transitions.
- Moteur d animations pilotable depuis Admin Settings:
  - profile, easing, reveal sections,
  - hover cartes / pulse CTA / scroll progress,
  - mascottes animees,
  - sprites SVG dynamiques (sprite qui se balade + sprites lateraux apparition/disparition).

### Espace admin
- Auth JWT (access token en memoire, refresh token en cookie HTTP-only).
- Dashboard avec KPI et graphiques.
- CRUD complets:
  - projets,
  - articles,
  - competences,
  - temoignages,
  - commentaires (approbation/suppression),
  - messages (lecture/non-lu),
  - campagnes newsletter,
  - abonnes newsletter,
  - parametres globaux (contenu + apparence + animations + newsletter).
- Upload images (compression client + envoi serveur + Cloudinary).

### Newsletter
- Gestion de campagnes brouillon/envoyee.
- Template HTML newsletter personnalise.
- Envoi aux abonnes confirmes.
- Desabonnement via token.
- Mode d envoi configurable:
  - `smtp` pour dev,
  - `brevo` pour prod.

## Stack technique

### Frontend
- React 19, Vite 6
- Tailwind CSS v4
- React Router DOM v7
- Framer Motion
- Heroicons
- react-helmet-async
- DOMPurify
- Recharts

### Backend
- Node.js, Express 4
- Sequelize 6
- PostgreSQL
- JWT + bcryptjs
- helmet, cors, express-rate-limit, express-validator
- Multer + Cloudinary
- Nodemailer (mode dev SMTP)
- Brevo API (mode prod)

## Architecture

```text
portfolio/
  src/                 # frontend React
  server/
    src/
      controllers/     # logique metier
      routes/          # endpoints API
      models/          # modeles Sequelize
      middleware/      # auth, validation, erreurs
      services/        # mail, etc.
      templates/       # templates newsletter
    migrations/        # schema DB
    seeders/           # donnees initiales
```

## Installation locale

### 1) Prerequis
- Node.js 20+
- npm
- PostgreSQL

### 2) Installer les dependances

```bash
# frontend
npm install

# backend
cd server
npm install
```

### 3) Variables d environnement

```bash
# a la racine (frontend)
cp .env.example .env

# dans server/
cp .env.example .env
```

Renseigner au minimum:
- Frontend: `VITE_API_URL`, `VITE_SERVER_URL` (ou laisser vide en dev).
- Backend: `DB_*`, `JWT_*`, `FRONTEND_URL`.

### 4) Base de donnees

```bash
cd server
npm run migrate
npm run seed
```

### 5) Lancer le projet

```bash
# terminal 1 - backend
cd server
npm run dev

# terminal 2 - frontend
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Admin login: `/admin/login` avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` du seed.

## Configuration mail (dev/prod)

### Mode developpement (SMTP)
Dans `server/.env`:

```env
MAIL_DELIVERY_MODE=smtp
DEV_SMTP_HOST=localhost
DEV_SMTP_PORT=1025
DEV_SMTP_SECURE=false
DEV_SMTP_FROM="Portfolio Dev <noreply@localhost>"
```

### Mode production (Brevo)
Dans `server/.env`:

```env
MAIL_DELIVERY_MODE=brevo
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=noreply@votredomaine.com
```

## Scripts

### Frontend (racine)
- `npm run dev` : demarrage Vite
- `npm run build` : build production
- `npm run preview` : preview build
- `npm run lint` : lint backend (syntax check)
- `npm run test` : tests backend
- `npm run test:smoke` : smoke tests API backend (integration)

### Backend (`server/`)
- `npm run dev` : demarrage avec nodemon
- `npm start` : demarrage production
- `npm run lint` : verifie la syntaxe JS (`src`, `scripts`, `tests`)
- `npm run test` : lance les tests unitaires backend (scripts Node)
- `npm run test:smoke` : lance les smoke tests API (skip auto des checks DB si DB indisponible)
- `npm run migrate` : migrations Sequelize
- `npm run seed` : seeders Sequelize

Option smoke strict (CI):
- `SMOKE_REQUIRE_DB=true npm run test:smoke` force l echec si PostgreSQL n est pas joignable.

## Securite
- Access token JWT jamais persiste en localStorage.
- Refresh token en cookie HTTP-only.
- Rate limiting global + route login.
- Validation serveur avec express-validator.
- Sanitisation frontend pour rendu HTML.
- Helmet + CORS restreint.

## API (resume)
- Public:
  - `GET /api/projects`, `GET /api/projects/:slug`
  - `GET /api/articles`, `GET /api/articles/:slug`
  - `GET /api/skills`
  - `POST /api/messages`
  - `GET /api/testimonials`
  - `GET /api/comments/:articleId`, `POST /api/comments`
  - `GET /api/settings`
  - `POST /api/subscribe`, `GET /api/unsubscribe/:token`
- Auth:
  - `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- Admin (JWT requis):
  - `GET /api/admin/stats`
  - CRUD projets, articles, skills, testimonials
  - messages, commentaires, settings
  - newsletter + subscribers
- Upload:
  - `POST /api/upload`

## Notes
- Le projet est configure pour PostgreSQL (pas MySQL).
- Le SSL DB est configurable via:
  - `DB_SSL=true|false`
  - `DB_SSL_REJECT_UNAUTHORIZED=true|false`


