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
import './index.css'

/* Chargement paresseux de toutes les pages pour le code splitting */
const Home = lazy(() => import('./pages/Home.jsx'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'))
const SkillsPage = lazy(() => import('./pages/SkillsPage.jsx'))
const BlogPage = lazy(() => import('./pages/BlogPage.jsx'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail.jsx'))
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

/* Pages admin */
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminProjects = lazy(() => import('./pages/admin/AdminProjects.jsx'))
const AdminProjectForm = lazy(() => import('./pages/admin/AdminProjectForm.jsx'))
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles.jsx'))
const AdminArticleForm = lazy(() => import('./pages/admin/AdminArticleForm.jsx'))
const AdminSkills = lazy(() => import('./pages/admin/AdminSkills.jsx'))
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages.jsx'))
const AdminTestimonials = lazy(() => import('./pages/admin/AdminTestimonials.jsx'))
const AdminComments = lazy(() => import('./pages/admin/AdminComments.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))

/* Fallback de chargement pour Suspense */
function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <Spinner size="lg" />
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
      { path: 'contact', element: <Suspense fallback={<LoadingFallback />}><ContactPage /></Suspense> },
      { path: '*', element: <Suspense fallback={<LoadingFallback />}><NotFound /></Suspense> },
    ],
  },
  /* Page de connexion admin (sans protection) */
  {
    path: '/admin/login',
    element: <Suspense fallback={<LoadingFallback />}><AdminLogin /></Suspense>,
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
      { path: 'messages', element: <Suspense fallback={<LoadingFallback />}><AdminMessages /></Suspense> },
      { path: 'temoignages', element: <Suspense fallback={<LoadingFallback />}><AdminTestimonials /></Suspense> },
      { path: 'commentaires', element: <Suspense fallback={<LoadingFallback />}><AdminComments /></Suspense> },
      { path: 'parametres', element: <Suspense fallback={<LoadingFallback />}><AdminSettings /></Suspense> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
)
