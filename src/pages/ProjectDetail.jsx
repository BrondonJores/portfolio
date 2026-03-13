import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  LinkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import Card from '../components/ui/Card.jsx'
import BlockRenderer from '../components/ui/BlockRenderer.jsx'
import { getProjectBySlug } from '../services/projectService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'
import { getProjectDisplayTags, getProjectTaxonomy } from '../utils/projectTaxonomy.js'

function getShortText(value, maxLength, fallback) {
  const normalized = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (!normalized) {
    return fallback
  }
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trim()}...`
}

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
  const projectsBadgeFeatured = settings.ui_project_badge_featured || 'Mis en avant'

  useEffect(() => {
    getProjectBySlug(slug)
      .then((res) => setProject(res?.data || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

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
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center pt-24" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>{projectNotFoundLabel}</p>
        </main>
      </>
    )
  }

  const taxonomy = getProjectTaxonomy(project)
  const displayTags = getProjectDisplayTags(project, 8)
  const metaCards = [
    {
      key: 'type',
      label: 'Type',
      value: taxonomy.type || 'Non renseigne',
      helper: project.featured ? projectsBadgeFeatured : 'Case study disponible',
    },
    {
      key: 'stack',
      label: 'Stack',
      value: taxonomy.stack.length > 0 ? taxonomy.stack.slice(0, 3).join(' | ') : 'A definir',
      helper: `${taxonomy.technologies.length || 0} technos visibles`,
    },
    {
      key: 'scope',
      label: 'Scope',
      value: taxonomy.domains.length > 0 ? taxonomy.domains.slice(0, 2).join(' | ') : 'Produit web',
      helper: taxonomy.labels.length > 0 ? taxonomy.labels.slice(0, 2).join(' | ') : 'Execution complete',
    },
  ]

  const description = getShortText(
    project.description,
    320,
    'Un projet concu pour transformer une intention produit en experience claire et robuste.'
  )

  return (
    <>
      <Helmet>
        <title>{buildPageTitle(settings, project.title)}</title>
      </Helmet>
      <Navbar />
      <main className="min-h-screen pb-16 pt-28" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center gap-2 text-sm transition-colors focus:outline-none"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(event) => { event.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            {projectBackLabel}
          </button>

          <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1.04fr)_320px] lg:items-end">
            <div>
              <p
                className="mb-4 text-[11px] uppercase tracking-[0.22em]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Dossier projet
              </p>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                    color: 'var(--color-accent-light)',
                  }}
                >
                  <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                  Showcase detaille
                </span>
                {project.featured && <Badge>{projectsBadgeFeatured}</Badge>}
              </div>

              <h1
                className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {project.title}
              </h1>

              <p
                className="mt-6 max-w-3xl text-base leading-relaxed md:text-lg"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {description}
              </p>

              {displayTags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {displayTags.map((tag) => (
                    <Badge key={`${project.id}-${tag}`}>{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {project.github_url && (
                  <Button variant="secondary" href={project.github_url} className="w-full justify-center sm:w-auto">
                    <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                    {projectViewCodeLabel}
                  </Button>
                )}
                {project.demo_url && (
                  <Button variant="primary" href={project.demo_url} className="w-full justify-center sm:w-auto">
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                    {projectViewDemoLabel}
                  </Button>
                )}
                <Button variant="ghost" onClick={handleCopyLink} className="w-full justify-center sm:w-auto">
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  {copied ? projectLinkCopiedLabel : projectCopyLinkLabel}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {metaCards.map((card) => (
                <Card key={card.key} className="h-full">
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    {card.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {card.helper}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {project.image_url && (
            <section className="mb-12">
              <div
                className="overflow-hidden rounded-[1.5rem] border p-2 sm:rounded-[2rem]"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-border) 78%, var(--color-accent))',
                  background:
                    'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-secondary) 86%, transparent), color-mix(in srgb, var(--color-accent-glow) 24%, transparent))',
                  boxShadow: '0 32px 72px -42px color-mix(in srgb, var(--color-accent-glow) 42%, transparent)',
                }}
              >
                <div
                  className="overflow-hidden rounded-[1.1rem] sm:rounded-[1.5rem]"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 84%, transparent)' }}
                >
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="max-h-[22rem] w-full object-contain object-top sm:max-h-[30rem] xl:max-h-[42rem]"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    width="1600"
                    height="900"
                  />
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start xl:grid-cols-[minmax(0,1fr)_300px]">
            <div
              className="rounded-[var(--ui-radius-2xl)] border p-6 md:p-8"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 78%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 88%, transparent)',
              }}
            >
              <BlockRenderer content={project.content} />
            </div>

            <aside className="order-first grid gap-4 lg:order-none">
              {taxonomy.technologies.length > 0 && (
                <Card>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Technologies
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {taxonomy.technologies.map((technology) => (
                      <Badge key={technology}>{technology}</Badge>
                    ))}
                  </div>
                </Card>
              )}

              {(taxonomy.domains.length > 0 || taxonomy.labels.length > 0) && (
                <Card>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Contexte
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[...taxonomy.domains, ...taxonomy.labels].map((item) => (
                      <Badge key={item}>{item}</Badge>
                    ))}
                  </div>
                </Card>
              )}

              <Card>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                  Liens
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  {project.demo_url ? (
                    <Button variant="primary" href={project.demo_url} className="w-full justify-center">
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                      {projectViewDemoLabel}
                    </Button>
                  ) : null}
                  {project.github_url ? (
                    <Button variant="secondary" href={project.github_url} className="w-full justify-center">
                      <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                      {projectViewCodeLabel}
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={handleCopyLink} className="w-full justify-center">
                    <LinkIcon className="h-4 w-4" aria-hidden="true" />
                    {copied ? projectLinkCopiedLabel : projectCopyLinkLabel}
                  </Button>
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
