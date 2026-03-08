/* Page de detail d'un projet */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeftIcon, CodeBracketIcon, ArrowTopRightOnSquareIcon, LinkIcon } from '@heroicons/react/24/outline'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import BlockRenderer from '../components/ui/BlockRenderer.jsx'
import { getProjectBySlug } from '../services/projectService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'

export default function ProjectDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const { settings } = useSettings()
  const projectNotFoundLabel = settings.ui_project_detail_not_found || 'Projet introuvable.'
  const projectBackLabel = settings.ui_project_detail_back || 'Retour'
  const projectViewCodeLabel = settings.ui_project_detail_view_code || 'Voir le code'
  const projectViewDemoLabel = settings.ui_project_detail_view_demo || 'Voir la demo'
  const projectCopyLinkLabel = settings.ui_project_detail_copy_link || 'Copier le lien'
  const projectLinkCopiedLabel = settings.ui_project_detail_link_copied || 'Lien copie !'

  useEffect(() => {
    getProjectBySlug(slug)
      .then((res) => setProject(res?.data || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  /* Copie du lien dans le presse-papiers */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

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
          <p style={{ color: 'var(--color-text-secondary)' }}>{projectNotFoundLabel}</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>{buildPageTitle(settings, project.title)}</title>
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
            {projectBackLabel}
          </button>

          {/* En-tete */}
          <header className="mb-8">
            {/* Image du projet */}
            {project.image_url && (
              <img
                src={project.image_url}
                alt={project.title}
                className="w-full max-h-72 object-cover rounded-xl mb-6"
              />
            )}
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
                {projectViewCodeLabel}
              </Button>
            )}
            {project.demo_url && (
              <Button variant="primary" href={project.demo_url}>
                <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                {projectViewDemoLabel}
              </Button>
            )}
            {/* Bouton de partage */}
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 text-sm transition-colors focus:outline-none"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              {copied ? projectLinkCopiedLabel : projectCopyLinkLabel}
            </button>
          </div>

          {/* Contenu de l'article */}
          <BlockRenderer content={project.content} />
        </div>
      </main>
      <Footer />
    </>
  )
}
