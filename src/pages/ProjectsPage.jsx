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
import Spinner from '../components/ui/Spinner.jsx'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { usePublicProjects } from '../hooks/usePublicProjects.js'
import { buildPageTitle } from '../utils/seoSettings.js'
import { getFacetAxis, getProjectDisplayTags, getProjectTaxonomy } from '../utils/projectTaxonomy.js'

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
  const spotlightTaxonomy = useMemo(
    () => (spotlightProject ? getProjectTaxonomy(spotlightProject) : null),
    [spotlightProject]
  )
  const spotlightTags = useMemo(
    () => (spotlightProject ? getProjectDisplayTags(spotlightProject, 6) : []),
    [spotlightProject]
  )

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
                          <img
                            src={spotlightProject.image_url}
                            alt={spotlightProject.title}
                            className="h-full w-full object-cover object-top"
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                            width="1600"
                            height="900"
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
                            {getShortText(
                              spotlightProject.description,
                              240,
                              'Une realisation orientee impact, execution et lisibilite.'
                            )}
                          </p>
                        </div>

                        {spotlightTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {spotlightTags.map((tag) => (
                              <Badge key={`${spotlightProject.id}-${tag}`}>{tag}</Badge>
                            ))}
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                              Type
                            </p>
                            <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {spotlightTaxonomy?.type || 'Non renseigne'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                              Stack
                            </p>
                            <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {spotlightTaxonomy?.stack?.length > 0 ? spotlightTaxonomy.stack.slice(0, 3).join(' | ') : 'A definir'}
                            </p>
                          </div>
                        </div>

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
                      const taxonomy = getProjectTaxonomy(project)
                      const displayTags = getProjectDisplayTags(project, 5)

                      return (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
                        >
                          <Card className="group h-full flex flex-col overflow-hidden !p-0">
                            {project.image_url ? (
                              <div
                                className="relative h-52 overflow-hidden"
                                style={{
                                  background:
                                    'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-primary) 86%, transparent), color-mix(in srgb, var(--color-accent-glow) 28%, transparent))',
                                }}
                              >
                                <img
                                  src={project.image_url}
                                  alt={project.title}
                                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
                                  loading="lazy"
                                  decoding="async"
                                  width="1200"
                                  height="675"
                                />
                              </div>
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
                                {getShortText(
                                  project.description,
                                  150,
                                  'Projet produit pour transformer une intention en experience claire.'
                                )}
                              </p>

                              {(taxonomy.type || taxonomy.stack.length > 0) && (
                                <div className="mb-4 space-y-1">
                                  {taxonomy.type && (
                                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                      Type: <span style={{ color: 'var(--color-text-primary)' }}>{taxonomy.type}</span>
                                    </p>
                                  )}
                                  {taxonomy.stack.length > 0 && (
                                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                      Stack: <span style={{ color: 'var(--color-text-primary)' }}>{taxonomy.stack.slice(0, 2).join(' | ')}</span>
                                    </p>
                                  )}
                                </div>
                              )}

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
