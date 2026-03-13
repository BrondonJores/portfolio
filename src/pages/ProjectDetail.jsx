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
import SmartImage from '../components/ui/SmartImage.jsx'
import { getProjectBySlug } from '../services/projectService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'
import { getProjectDisplayTags, getProjectTaxonomy } from '../utils/projectTaxonomy.js'
import { getProjectShowcaseProfile } from '../utils/projectShowcase.js'

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
  const showcaseProfile = getProjectShowcaseProfile(project)
  const displayTags = getProjectDisplayTags(project, 8)
  const detailReadout = [
    {
      key: 'delivery',
      label: 'Livraison',
      value: showcaseProfile.delivery,
      helper: showcaseProfile.proofHeadline,
    },
    {
      key: 'coverage',
      label: 'Couverture',
      value: showcaseProfile.coverageValue,
      helper: showcaseProfile.coverageDetail,
    },
    {
      key: 'stack',
      label: 'Stack',
      value: showcaseProfile.stack,
      helper: `${showcaseProfile.technologyCount || 0} technos visibles`,
    },
  ]
  const metaCards = [
    {
      key: 'delivery',
      label: 'Livraison',
      value: showcaseProfile.delivery,
      helper: showcaseProfile.proofHeadline,
    },
    {
      key: 'coverage',
      label: 'Couverture',
      value: showcaseProfile.coverageValue,
      helper: showcaseProfile.coverageDetail,
    },
    {
      key: 'scope',
      label: 'Scope',
      value: showcaseProfile.scope,
      helper: project.featured ? projectsBadgeFeatured : 'Case study disponible',
    },
  ]
  const caseStudyBrief = [
    { key: 'mission', label: 'Mission', value: showcaseProfile.mission },
    { key: 'scope', label: 'Scope', value: showcaseProfile.scope },
    { key: 'stack', label: 'Stack', value: showcaseProfile.stack },
    { key: 'proof', label: 'Preuves', value: showcaseProfile.proofDetail },
  ]
  const coverageItems = showcaseProfile.chapterLabels.length > 0
    ? showcaseProfile.chapterLabels
    : [showcaseProfile.scope, showcaseProfile.delivery, showcaseProfile.proofHeadline].filter(Boolean)

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
      <main className="min-h-screen pb-16 pt-24 sm:pt-28" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm transition-colors focus:outline-none sm:mb-8"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(event) => { event.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            {projectBackLabel}
          </button>

          <section className="mb-8 grid gap-6 lg:mb-10 lg:grid-cols-[minmax(0,1.04fr)_320px] lg:items-end">
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
                className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {project.title}
              </h1>

              <p
                className="mt-5 max-w-3xl text-sm leading-relaxed sm:text-base md:mt-6 md:text-lg"
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

              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
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

            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-1">
              {metaCards.map((card) => (
                <Card key={card.key} className="min-w-[15rem] snap-start sm:min-w-0 sm:h-full">
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
            <section className="mb-10 sm:mb-12">
              <div
                className="-mx-4 overflow-hidden rounded-[1.35rem] border p-2 sm:mx-0 sm:rounded-[2rem]"
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
                  <SmartImage
                    src={project.image_url}
                    alt={project.title}
                    className="w-full"
                    imgClassName="max-h-[18rem] w-full object-contain object-top sm:max-h-[24rem] lg:max-h-[30rem] xl:max-h-[42rem]"
                    loading="eager"
                    fetchPriority="high"
                    width="1800"
                    height="1100"
                    sizes="(min-width: 1280px) 1200px, 100vw"
                    widths={[768, 1024, 1440, 1800, 2200]}
                    maxWidth={2200}
                    quality="auto:best"
                    fallback={(
                      <SparklesIcon
                        className="h-12 w-12"
                        style={{ color: 'var(--color-accent)', opacity: 0.35 }}
                        aria-hidden="true"
                      />
                    )}
                    style={{ minHeight: '18rem' }}
                  />
                </div>
              </div>
            </section>
          )}

          <section className="mb-10 sm:mb-12">
            <Card>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] xl:items-start">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Project brief
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                    Ce dossier met en avant la mission, la livraison et les preuves qui portent le projet.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    Avant d&apos;entrer dans le contenu complet, tu peux lire ici le cadre du projet et les signaux qui le rendent concret.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {detailReadout.map((item) => (
                      <div
                        key={`${project.id}-${item.key}`}
                        className="rounded-2xl border px-4 py-3"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 82%, transparent)',
                        }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {item.value}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.helper}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {caseStudyBrief.map((item) => (
                    <div
                      key={`${project.id}-${item.key}`}
                      className="grid gap-2 rounded-2xl border px-4 py-4 md:grid-cols-[82px_1fr] md:items-start"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 78%, transparent)',
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.label}
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {coverageItems.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {coverageItems.map((item) => (
                    <span
                      key={`${project.id}-coverage-${item}`}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div
              className="rounded-[var(--ui-radius-2xl)] border p-5 sm:p-6 md:p-8"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 78%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 88%, transparent)',
              }}
            >
              <BlockRenderer content={project.content} />
            </div>

            <aside className="grid gap-4 sm:grid-cols-2 lg:sticky lg:top-28 lg:grid-cols-1">
              <Card>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                  Livraison
                </p>
                <div
                  className="mt-4 rounded-2xl border px-4 py-4"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 82%, transparent)',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {showcaseProfile.delivery}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {showcaseProfile.proofHeadline}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {showcaseProfile.proofDetail}
                  </p>
                </div>
              </Card>

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

              {coverageItems.length > 0 && (
                <Card>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Storyline
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {coverageItems.map((item) => (
                      <Badge key={`storyline-${item}`}>{item}</Badge>
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
