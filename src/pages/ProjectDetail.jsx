/* Page de detail d'un projet */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeftIcon, CodeBracketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import DOMPurify from 'dompurify'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { getProjectBySlug } from '../services/projectService.js'

export default function ProjectDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getProjectBySlug(slug)
      .then((res) => setProject(res?.data || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <>
        <Navbar />
        <main className="pt-24 min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Projet introuvable.</p>
        </main>
      </>
    )
  }

  /* Sanitisation du contenu HTML avant affichage */
  const safeContent = project.content
    ? DOMPurify.sanitize(project.content)
    : null

  return (
    <>
      <Helmet>
        <title>{project.title} - BrondonJores</title>
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Bouton retour */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm mb-8 transition-colors focus:outline-none"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Retour
          </button>

          {/* En-tete */}
          <header className="mb-8">
            <h1
              className="text-4xl font-bold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {project.title}
            </h1>
            {Array.isArray(project.tags) && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}
            {project.description && (
              <p
                className="text-lg leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {project.description}
              </p>
            )}
          </header>

          {/* Boutons d'action */}
          <div className="flex flex-wrap gap-3 mb-10">
            {project.github_url && (
              <Button variant="secondary" href={project.github_url}>
                <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                Voir le code
              </Button>
            )}
            {project.demo_url && (
              <Button variant="primary" href={project.demo_url}>
                <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                Voir la demo
              </Button>
            )}
          </div>

          {/* Contenu principal sanitise */}
          {safeContent && (
            <div
              className="prose max-w-none text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
