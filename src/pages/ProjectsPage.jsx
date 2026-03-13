import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  FolderOpenIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import SectionTitle from '../components/ui/SectionTitle.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import SmartImage from '../components/ui/SmartImage.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { usePublicProjects } from '../hooks/usePublicProjects.js'
import { buildPageTitle } from '../utils/seoSettings.js'
import { getFacetAxis, getProjectDisplayTags } from '../utils/projectTaxonomy.js'
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

function buildSummaryTiles({ totalProjects, activeFilters, typeFacets, stackFacets, technologyFacets }) {
  return [
    {
      key: 'total',
      label: 'Selection visible',
      value: String(totalProjects || 0),
      helper: activeFilters > 0 ? `${activeFilters} filtres actifs` : 'sans filtre',
    },
    {
      key: 'types',
      label: 'Types',
      value: String(typeFacets.length || 0),
      helper: 'facettes disponibles',
    },
    {
      key: 'tech',
      label: 'Technos',
      value: String(technologyFacets.length || 0),
      helper: `${stackFacets.length || 0} stacks detectees`,
    },
  ]
}

function buildProjectBrief(profile) {
  return [
    { label: 'Mission', value: profile.mission },
    { label: 'Scope', value: profile.scope },
    { label: 'Stack', value: profile.stack },
  ]
}

function buildProjectSignals(profile) {
  return [
    { label: 'Livraison', value: profile.delivery, helper: profile.proofHeadline },
    { label: 'Couverture', value: profile.coverageValue, helper: profile.coverageDetail },
    { label: 'Preuves', value: profile.proofHeadline, helper: profile.proofDetail },
  ]
}

export default function ProjectsPage() {
  const [activeType, setActiveType] = useState('')
  const [activeStack, setActiveStack] = useState('')
  const [activeTechnology, setActiveTechnology] = useState('')
  const [page, setPage] = useState(1)
  const { settings } = useSettings()
  const {
    projects,
    facets,
    pagination,
    loading,
  } = usePublicProjects({
    page,
    limit: 9,
    includeFacets: true,
    ...(activeType ? { type: activeType } : {}),
    ...(activeStack ? { stack: activeStack } : {}),
    ...(activeTechnology ? { technology: activeTechnology } : {}),
  })
  const pageTitle = buildPageTitle(settings, 'Projets')
  const projectsPageHeading = settings.ui_projects_page_title || 'Mes Projets'
  const projectsPageSubtitle =
    settings.ui_projects_page_subtitle || "L'ensemble de mes realisations et experiences de developpement"
  const projectsBadgeFeatured = settings.ui_project_badge_featured || 'Mis en avant'
  const projectsActionGithub = settings.ui_project_action_github || 'GitHub'
  const projectsActionDemo = settings.ui_project_action_demo || 'Demo'
  const projectsDemoUnavailable = settings.ui_project_demo_unavailable || 'Demo non disponible'
  const projectsActionCaseStudy = settings.ui_project_action_case_study || 'Voir etude de cas'

  const typeFacets = useMemo(() => getFacetAxis(facets, 'type'), [facets])
  const stackFacets = useMemo(() => getFacetAxis(facets, 'stack'), [facets])
  const technologyFacets = useMemo(() => getFacetAxis(facets, 'technologies'), [facets])
  const hasActiveFilters = Boolean(activeType || activeStack || activeTechnology)
  const activeFilterCount = [activeType, activeStack, activeTechnology].filter(Boolean).length
  const summaryTiles = buildSummaryTiles({
    totalProjects: pagination?.total ?? projects.length,
    activeFilters: activeFilterCount,
    typeFacets,
    stackFacets,
    technologyFacets,
  })
  const spotlightProject = projects[0] || null
  const secondaryProjects = spotlightProject ? projects.slice(1) : []
  const projectProfiles = useMemo(
    () => new Map(projects.map((project) => [project.id, getProjectShowcaseProfile(project)])),
    [projects]
  )
  const spotlightTags = useMemo(
    () => (spotlightProject ? getProjectDisplayTags(spotlightProject, 6) : []),
    [spotlightProject]
  )
  const spotlightProfile = spotlightProject ? projectProfiles.get(spotlightProject.id) : null
  const dossierOverview = useMemo(() => {
    const liveCount = projects.filter((project) => Boolean(project.demo_url)).length
    const sourceCount = projects.filter((project) => Boolean(project.github_url)).length
    const structuredCount = projects.filter((project) => {
      const profile = projectProfiles.get(project.id)
      return Boolean(profile?.contentBlockCount)
    }).length

    return [
      { key: 'live', label: 'Livraisons live', value: String(liveCount), helper: 'demos accessibles' },
      { key: 'source', label: 'Sources visibles', value: String(sourceCount), helper: 'repos consultables' },
      { key: 'dossier', label: 'Dossiers structures', value: String(structuredCount), helper: 'case studies approfondis' },
    ]
  }, [projectProfiles, projects])

  const clearFilters = () => {
    setActiveType('')
    setActiveStack('')
    setActiveTechnology('')
    setPage(1)
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Navbar />
      <main className="min-h-screen pb-16 pt-24 sm:pt-28" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <section className="mb-8 sm:mb-10">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end xl:gap-8">
              <div>
                <p
                  className="mb-4 text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Dossier projets
                </p>
                <SectionTitle
                  title={projectsPageHeading}
                  subtitle={projectsPageSubtitle}
                />
              </div>

              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                {summaryTiles.map((tile) => (
                  <Card key={tile.key} className="min-w-[14.5rem] snap-start sm:min-w-0 sm:h-full">
                    <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                      {tile.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {tile.value}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {tile.helper}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {(typeFacets.length > 0 || stackFacets.length > 0 || technologyFacets.length > 0) && (
            <section className="mb-8 sm:mb-10">
              <Card>
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                        Filtrer la selection
                      </p>
                      <p className="mt-2 text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {hasActiveFilters
                          ? `${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''} actif${activeFilterCount > 1 ? 's' : ''}`
                          : 'Affichage complet des projets'}
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        Reinitialiser
                      </button>
                    )}
                  </div>

                  {typeFacets.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                        Type
                      </p>
                      <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                        {typeFacets.map((facet) => (
                          <button
                            key={facet.value}
                            type="button"
                            onClick={() => {
                              setActiveType((prev) => (prev === facet.value ? '' : facet.value))
                              setPage(1)
                            }}
                            className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          >
                            <Badge variant={activeType === facet.value ? 'solid' : 'default'}>
                              {facet.value}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {stackFacets.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                        Stack
                      </p>
                      <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                        {stackFacets.map((facet) => (
                          <button
                            key={facet.value}
                            type="button"
                            onClick={() => {
                              setActiveStack((prev) => (prev === facet.value ? '' : facet.value))
                              setPage(1)
                            }}
                            className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          >
                            <Badge variant={activeStack === facet.value ? 'solid' : 'default'}>
                              {facet.value}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {technologyFacets.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                        Technologies
                      </p>
                      <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                        {technologyFacets.slice(0, 18).map((facet) => (
                          <button
                            key={facet.value}
                            type="button"
                            onClick={() => {
                              setActiveTechnology((prev) => (prev === facet.value ? '' : facet.value))
                              setPage(1)
                            }}
                            className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          >
                            <Badge variant={activeTechnology === facet.value ? 'solid' : 'default'}>
                              {facet.value}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </section>
          )}

          <section className="mb-8 sm:mb-10">
            <Card>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] xl:items-end">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Lecture showcase
                  </p>
                  <p className="mt-3 text-lg font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    Chaque projet est raconte comme un dossier: mission, scope, livraison et preuves visibles.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    La page n&apos;est plus une simple liste. Elle te laisse comparer rapidement ce qui est live, ce qui est documente, et ce qui raconte le mieux ta facon de livrer.
                  </p>
                </div>

                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                  {dossierOverview.map((tile) => (
                    <div
                      key={tile.key}
                      className="min-w-[13rem] snap-start rounded-2xl border px-4 py-4 sm:min-w-0"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 84%, transparent)',
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                        {tile.label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {tile.value}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {tile.helper}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <div className="py-10 text-center">
                <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Aucun projet ne correspond a la selection.
                </p>
                <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Essaie de retirer un filtre pour retrouver l’ensemble du catalogue.
                </p>
                {hasActiveFilters && (
                  <div className="mt-6">
                    <Button variant="secondary" onClick={clearFilters}>
                      Reinitialiser les filtres
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <>
              {spotlightProject && (
                <section className="mb-10">
                  <Card className="overflow-hidden !p-0">
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
                      <div
                        className="relative min-h-[240px] overflow-hidden sm:min-h-[320px]"
                        style={{
                          background:
                            'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-secondary) 82%, transparent), color-mix(in srgb, var(--color-accent-glow) 28%, transparent))',
                        }}
                      >
                        {spotlightProject.image_url ? (
                          <SmartImage
                            src={spotlightProject.image_url}
                            alt={spotlightProject.title}
                            className="h-full w-full"
                            imgClassName="h-full w-full object-cover object-top"
                            loading="eager"
                            fetchPriority="high"
                            width="1600"
                            height="900"
                            sizes="(min-width: 1280px) 760px, 100vw"
                            widths={[768, 1024, 1440, 1800]}
                            maxWidth={1800}
                            quality="auto:best"
                            fallback={(
                              <FolderOpenIcon
                                className="h-14 w-14"
                                style={{ color: 'var(--color-accent)', opacity: 0.42 }}
                                aria-hidden="true"
                              />
                            )}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <FolderOpenIcon
                              className="h-14 w-14"
                              style={{ color: 'var(--color-accent)', opacity: 0.42 }}
                              aria-hidden="true"
                            />
                          </div>
                        )}
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--color-bg-primary) 20%, transparent) 100%)',
                          }}
                        />
                      </div>

                      <div className="flex flex-col gap-5 p-5 sm:p-6 md:p-8">
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                          Flagship case study
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                            style={{
                              borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                              backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                              color: 'var(--color-accent-light)',
                            }}
                          >
                            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                            Spotlight
                          </span>
                          {spotlightProject.featured && <Badge>{projectsBadgeFeatured}</Badge>}
                        </div>

                        <div>
                          <h2 className="text-2xl font-semibold md:text-3xl" style={{ color: 'var(--color-text-primary)' }}>
                            {spotlightProject.title}
                          </h2>
                          <p className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                            {spotlightProfile?.mission || 'Une realisation orientee impact, execution et lisibilite.'}
                          </p>
                        </div>

                        {spotlightTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {spotlightTags.map((tag) => (
                              <Badge key={`${spotlightProject.id}-${tag}`}>{tag}</Badge>
                            ))}
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-3">
                          {buildProjectSignals(spotlightProfile || getProjectShowcaseProfile(spotlightProject)).map((item) => (
                            <div
                              key={`${spotlightProject.id}-${item.label}`}
                              className="rounded-2xl border px-4 py-3"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 78%, transparent)',
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

                        <div className="grid gap-3">
                          {buildProjectBrief(spotlightProfile || getProjectShowcaseProfile(spotlightProject)).map((item) => (
                            <div key={`${spotlightProject.id}-${item.label}`} className="grid gap-2 md:grid-cols-[80px_1fr] md:items-start">
                              <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-secondary)' }}>
                                {item.label}
                              </p>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {spotlightProfile?.chapterLabels?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {spotlightProfile.chapterLabels.map((chapter) => (
                              <span
                                key={`${spotlightProject.id}-chapter-${chapter}`}
                                className="rounded-full border px-3 py-1 text-xs"
                                style={{
                                  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                {chapter}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                          <Link
                            to={`/projets/${spotlightProject.slug}`}
                            className="inline-flex items-center gap-2 text-sm font-medium"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {projectsActionCaseStudy}
                            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          {spotlightProject.github_url && (
                            <Button variant="ghost" href={spotlightProject.github_url} className="w-full justify-center sm:w-auto">
                              <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                              {projectsActionGithub}
                            </Button>
                          )}
                          {spotlightProject.demo_url ? (
                            <Button variant="secondary" href={spotlightProject.demo_url} className="w-full justify-center sm:w-auto">
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                              {projectsActionDemo}
                            </Button>
                          ) : (
                            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              {projectsDemoUnavailable}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </section>
              )}

              {secondaryProjects.length > 0 && (
                <section>
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Catalogue
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {secondaryProjects.length} projets sur cette page
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {secondaryProjects.map((project, index) => {
                      const displayTags = getProjectDisplayTags(project, 5)
                      const profile = projectProfiles.get(project.id) || getProjectShowcaseProfile(project)

                      return (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
                        >
                          <Card className="group h-full flex flex-col overflow-hidden !p-0">
                            {project.image_url ? (
                              <SmartImage
                                src={project.image_url}
                                alt={project.title}
                                className="h-52"
                                imgClassName="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
                                loading="lazy"
                                width="1200"
                                height="675"
                                sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
                                widths={[480, 720, 960, 1200]}
                                maxWidth={1200}
                                quality="auto:good"
                                fallback={(
                                  <FolderOpenIcon
                                    className="h-10 w-10"
                                    style={{ color: 'var(--color-accent)', opacity: 0.3 }}
                                    aria-hidden="true"
                                  />
                                )}
                                style={{
                                  background:
                                    'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-primary) 86%, transparent), color-mix(in srgb, var(--color-accent-glow) 28%, transparent))',
                                }}
                              />
                            ) : (
                              <div
                                className="flex h-48 items-center justify-center"
                                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                              >
                                <FolderOpenIcon
                                  className="h-10 w-10"
                                  style={{ color: 'var(--color-accent)', opacity: 0.3 }}
                                  aria-hidden="true"
                                />
                              </div>
                            )}

                            <div className="flex flex-1 flex-col p-5">
                              <p className="mb-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                                Case study
                              </p>
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    <Link
                                      to={`/projets/${project.slug}`}
                                      className="transition-colors hover:text-[var(--color-accent)]"
                                    >
                                      {project.title}
                                    </Link>
                                  </h2>
                                </div>
                                {project.featured && <Badge>{projectsBadgeFeatured}</Badge>}
                              </div>

                              <p className="mb-4 text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--color-text-secondary)' }}>
                                {getShortText(profile.mission, 150, 'Projet produit pour transformer une intention en experience claire.')}
                              </p>

                              <div
                                className="mb-4 rounded-2xl border px-3 py-3"
                                style={{
                                  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
                                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 76%, transparent)',
                                }}
                              >
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {buildProjectSignals(profile).slice(0, 2).map((item) => (
                                    <div key={`${project.id}-${item.label}`}>
                                      <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-secondary)' }}>
                                        {item.label}
                                      </p>
                                      <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                        {item.value}
                                      </p>
                                      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                        {item.helper}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="mb-4 space-y-2">
                                {buildProjectBrief(profile).map((item) => (
                                  <div key={`${project.id}-${item.label}`} className="grid grid-cols-[64px_1fr] gap-2 text-xs">
                                    <p style={{ color: 'var(--color-text-secondary)' }}>{item.label}</p>
                                    <p style={{ color: 'var(--color-text-primary)' }}>{item.value}</p>
                                  </div>
                                ))}
                              </div>

                              {displayTags.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-1.5">
                                  {displayTags.map((tag) => (
                                    <Badge key={`${project.id}-${tag}`}>{tag}</Badge>
                                  ))}
                                </div>
                              )}

                              <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                <Link
                                  to={`/projets/${project.slug}`}
                                  className="inline-flex items-center gap-2 text-sm font-medium"
                                  style={{ color: 'var(--color-accent)' }}
                                >
                                  {projectsActionCaseStudy}
                                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                                </Link>
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                  {profile.proofHeadline}
                                </span>
                                {project.github_url && (
                                  <Button
                                    variant="ghost"
                                    href={project.github_url}
                                    className="w-full justify-center sm:w-auto"
                                    aria-label={`${projectsActionGithub} - ${project.title}`}
                                  >
                                    <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                                    {projectsActionGithub}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                </section>
              )}

              {pagination && pagination.pages > 1 && (
                <div className="mt-10 overflow-x-auto pb-1">
                  <div className="flex min-w-max justify-center gap-2">
                    {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((nextPage) => (
                      <button
                        key={nextPage}
                        type="button"
                        onClick={() => setPage(nextPage)}
                        className="h-10 min-w-10 rounded-full px-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={{
                          backgroundColor: nextPage === page ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-bg-card) 88%, transparent)',
                          color: nextPage === page ? '#ffffff' : 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border)',
                        }}
                        aria-current={nextPage === page ? 'page' : undefined}
                      >
                        {nextPage}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
