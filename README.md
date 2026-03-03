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

## Pre-requis

- Node.js 20+
- MySQL 8+

## Installation et configuration

### 1. Cloner le repository

```bash
git clone https://github.com/BrondonJores/portfolio.git
cd portfolio
```

### 2. Configuration et demarrage du backend

```bash
cd server
cp .env.example .env
# Editer .env avec vos propres valeurs (DB, JWT secrets, etc.)
npm install
npm run migrate   # Executer les migrations Sequelize
npm run seed      # Creer l'administrateur initial
npm run dev       # Demarrer en mode developpement (port 5000)
```

### 3. Configuration et demarrage du frontend

```bash
cd ..  # Retour a la racine
cp .env.example .env.local
# Editer .env.local si necessaire
npm install
npm run dev       # Demarrer en mode developpement (port 3000)
```

### 4. Acces a l'application

- Portfolio public : http://localhost:3000
- Dashboard admin : http://localhost:3000/admin/login

## Structure du projet

```
portfolio/
├── src/                          (Frontend React 19)
│   ├── components/
│   │   ├── ui/                   (AnimatedSection, Button, Card, Badge, Modal, Toast, Spinner)
│   │   ├── sections/             (Navbar, Hero, About, Skills, Projects, Blog, Contact, Footer)
│   │   └── admin/                (AdminLayout, AdminNavbar, AdminSidebar, ProtectedRoute, ConfirmModal)
│   ├── context/                  (ThemeContext, AuthContext)
│   ├── hooks/                    (useContactForm, useScrollPosition, useAuth, useToast, useApi)
│   ├── pages/                    (Home, ProjectsPage, ProjectDetail, SkillsPage, BlogPage, ArticleDetail, ContactPage, NotFound)
│   ├── pages/admin/              (AdminLogin, AdminDashboard, AdminProjects, AdminArticles, AdminSkills, AdminMessages, AdminTestimonials)
│   ├── services/                 (api, projectService, articleService, skillService, messageService, testimonialService, authService)
│   └── utils/                    (sanitize)
│
└── server/                       (Backend Node.js + Express + MySQL)
    ├── src/
    │   ├── config/               (database.js)
    │   ├── models/               (Admin, Project, Article, Skill, Message, Testimonial)
    │   ├── controllers/          (auth, project, article, skill, message, testimonial)
    │   ├── middleware/           (auth, validate, error)
    │   ├── routes/               (auth, public, admin)
    │   ├── validators/           (auth, project, article, skill, message)
    │   └── app.js
    ├── migrations/               (001 a 006)
    └── seeders/                  (seed-admin.js)
```

## Routes API

### Publiques
| Methode | Route | Description |
|---------|-------|-------------|
| GET | /api/projects | Liste des projets publies (pagination, filtre tag) |
| GET | /api/projects/:slug | Detail d'un projet |
| GET | /api/articles | Liste des articles publies |
| GET | /api/articles/:slug | Detail d'un article |
| GET | /api/skills | Competences groupees par categorie |
| POST | /api/messages | Envoyer un message de contact |
| GET | /api/testimonials | Temoignages visibles |

### Authentification
| Methode | Route | Description |
|---------|-------|-------------|
| POST | /api/auth/login | Connexion administrateur (rate limited : 5/15min) |
| POST | /api/auth/refresh | Rafraichissement du token d'acces |
| POST | /api/auth/logout | Deconnexion |
| GET | /api/auth/me | Informations de l'admin connecte |

### Admin (JWT requis)
| Methode | Route | Description |
|---------|-------|-------------|
| GET/POST | /api/admin/projects | Liste et creation de projets |
| PUT/DELETE | /api/admin/projects/:id | Modification et suppression |
| GET/POST | /api/admin/articles | Liste et creation d'articles |
| PUT/DELETE | /api/admin/articles/:id | Modification et suppression |
| GET/POST | /api/admin/skills | Liste et creation de competences |
| PUT/DELETE | /api/admin/skills/:id | Modification et suppression |
| GET | /api/admin/messages | Liste des messages |
| PUT | /api/admin/messages/:id/read | Marquer comme lu |
| GET/POST | /api/admin/testimonials | Liste et creation de temoignages |
| PUT/DELETE | /api/admin/testimonials/:id | Modification et suppression |

## Credentials administrateur par defaut

> **Avertissement** : Changez ces valeurs dans le fichier `.env` avant de deployer en production.

- Email : `admin@example.com`
- Mot de passe : `ChangeMe123!`

## Securite

- JWT access token stocke uniquement en memoire React (jamais en localStorage)
- Refresh token en cookie HTTP-only avec `sameSite: strict`
- Mots de passe haches avec bcrypt (saltRounds: 12)
- Rate limiting : 100 req/15min global, 5 req/15min sur /api/auth/login
- Helmet pour les en-tetes HTTP de securite
- CORS configure uniquement pour l'origine frontend
- DOMPurify sur tous les contenus HTML affiches
- Validation des inputs avec express-validator cote serveur
