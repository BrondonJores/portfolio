/* Point d'entree de l'application */
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'
import ProtectedRoute from './components/admin/ProtectedRoute.jsx'
import Spinner from './components/ui/Spinner.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import './index.css'

/* Chargement paresseux de toutes les pages pour le code splitting */
const Home = lazy(() => import('./pages/Home.jsx'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'))
const SkillsPage = lazy(() => import('./pages/SkillsPage.jsx'))
const BlogPage = lazy(() => import('./pages/BlogPage.jsx'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail.jsx'))
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'))
const CmsPage = lazy(() => import('./pages/CmsPage.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

/* Pages admin */
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminProjects = lazy(() => import('./pages/admin/AdminProjects.jsx'))
const AdminProjectForm = lazy(() => import('./pages/admin/AdminProjectForm.jsx'))
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles.jsx'))
const AdminArticleForm = lazy(() => import('./pages/admin/AdminArticleForm.jsx'))
const AdminSkills = lazy(() => import('./pages/admin/AdminSkills.jsx'))
const AdminCertifications = lazy(() => import('./pages/admin/AdminCertifications.jsx'))
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages.jsx'))
const AdminTestimonials = lazy(() => import('./pages/admin/AdminTestimonials.jsx'))
const AdminComments = lazy(() => import('./pages/admin/AdminComments.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))
const AdminNewsletter = lazy(() => import('./pages/admin/AdminNewsletter.jsx'))
const AdminCampaignForm = lazy(() => import('./pages/admin/AdminCampaignForm.jsx'))
const AdminSubscribers = lazy(() => import('./pages/admin/AdminSubscribers.jsx'))
const AdminBlockTemplates = lazy(() => import('./pages/admin/AdminBlockTemplates.jsx'))
const AdminThemePresets = lazy(() => import('./pages/admin/AdminThemePresets.jsx'))
const AdminSecurity = lazy(() => import('./pages/admin/AdminSecurity.jsx'))
const AdminVisualBuilder = lazy(() => import('./pages/admin/AdminVisualBuilder.jsx'))
const AdminPages = lazy(() => import('./pages/admin/AdminPages.jsx'))
const AdminPageForm = lazy(() => import('./pages/admin/AdminPageForm.jsx'))

/* Fallback de chargement pour Suspense */
function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <Spinner size="lg" variant="page" />
    </div>
  )
}

/* Route protegee par authentification */
function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

/* Definition complete des routes React Router v7 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Suspense fallback={<LoadingFallback />}><Home /></Suspense> },
      { path: 'competences', element: <Suspense fallback={<LoadingFallback />}><SkillsPage /></Suspense> },
      { path: 'projets', element: <Suspense fallback={<LoadingFallback />}><ProjectsPage /></Suspense> },
      { path: 'projets/:slug', element: <Suspense fallback={<LoadingFallback />}><ProjectDetail /></Suspense> },
      { path: 'blog', element: <Suspense fallback={<LoadingFallback />}><BlogPage /></Suspense> },
      { path: 'blog/:slug', element: <Suspense fallback={<LoadingFallback />}><ArticleDetail /></Suspense> },
      { path: 'pages/:slug', element: <Suspense fallback={<LoadingFallback />}><CmsPage /></Suspense> },
      { path: 'contact', element: <Suspense fallback={<LoadingFallback />}><ContactPage /></Suspense> },
      { path: '*', element: <Suspense fallback={<LoadingFallback />}><NotFound /></Suspense> },
    ],
  },
  /* Page de connexion admin (sans protection) */
  {
    path: '/admin/login',
    element: <Suspense fallback={<LoadingFallback />}><AdminLogin /></Suspense>,
  },
  /* Builder visuel admin plein ecran (protege, hors layout lateral). */
  {
    path: '/admin/builder',
    element: (
      <Protected>
        <Suspense fallback={<LoadingFallback />}><AdminVisualBuilder /></Suspense>
      </Protected>
    ),
  },
  /* Routes admin protegees */
  {
    path: '/admin',
    element: (
      <Protected>
        <AdminLayout />
      </Protected>
    ),
    children: [
      { index: true, element: <Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense> },
      { path: 'projets', element: <Suspense fallback={<LoadingFallback />}><AdminProjects /></Suspense> },
      { path: 'projets/nouveau', element: <Suspense fallback={<LoadingFallback />}><AdminProjectForm /></Suspense> },
      { path: 'projets/:id', element: <Suspense fallback={<LoadingFallback />}><AdminProjectForm /></Suspense> },
      { path: 'articles', element: <Suspense fallback={<LoadingFallback />}><AdminArticles /></Suspense> },
      { path: 'articles/nouveau', element: <Suspense fallback={<LoadingFallback />}><AdminArticleForm /></Suspense> },
      { path: 'articles/:id', element: <Suspense fallback={<LoadingFallback />}><AdminArticleForm /></Suspense> },
      { path: 'competences', element: <Suspense fallback={<LoadingFallback />}><AdminSkills /></Suspense> },
      { path: 'certifications', element: <Suspense fallback={<LoadingFallback />}><AdminCertifications /></Suspense> },
      { path: 'messages', element: <Suspense fallback={<LoadingFallback />}><AdminMessages /></Suspense> },
      { path: 'temoignages', element: <Suspense fallback={<LoadingFallback />}><AdminTestimonials /></Suspense> },
      { path: 'commentaires', element: <Suspense fallback={<LoadingFallback />}><AdminComments /></Suspense> },
      { path: 'parametres', element: <Suspense fallback={<LoadingFallback />}><AdminSettings /></Suspense> },
      { path: 'newsletter/new', element: <Suspense fallback={<LoadingFallback />}><AdminCampaignForm /></Suspense> },
      { path: 'newsletter/:id/edit', element: <Suspense fallback={<LoadingFallback />}><AdminCampaignForm /></Suspense> },
      { path: 'newsletter', element: <Suspense fallback={<LoadingFallback />}><AdminNewsletter /></Suspense> },
      { path: 'subscribers', element: <Suspense fallback={<LoadingFallback />}><AdminSubscribers /></Suspense> },
      { path: 'templates', element: <Suspense fallback={<LoadingFallback />}><AdminBlockTemplates /></Suspense> },
      { path: 'themes', element: <Suspense fallback={<LoadingFallback />}><AdminThemePresets /></Suspense> },
      { path: 'security', element: <Suspense fallback={<LoadingFallback />}><AdminSecurity /></Suspense> },
      { path: 'pages', element: <Suspense fallback={<LoadingFallback />}><AdminPages /></Suspense> },
      { path: 'pages/nouveau', element: <Suspense fallback={<LoadingFallback />}><AdminPageForm /></Suspense> },
      { path: 'pages/:id', element: <Suspense fallback={<LoadingFallback />}><AdminPageForm /></Suspense> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <RouterProvider router={router} />
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
)
