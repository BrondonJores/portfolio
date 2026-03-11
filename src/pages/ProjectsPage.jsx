/* Page liste de tous les projets avec filtres et pagination */
import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { FolderOpenIcon, CodeBracketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import SectionTitle from '../components/ui/SectionTitle.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import { getProjects } from '../services/projectService.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildPageTitle } from '../utils/seoSettings.js'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [allTags, setAllTags] = useState([])
  const [activeTag, setActiveTag] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const { settings } = useSettings()
  const pageTitle = buildPageTitle(settings, 'Projets')
  const projectsPageHeading = settings.ui_projects_page_title || 'Mes Projets'
  const projectsPageSubtitle =
    settings.ui_projects_page_subtitle || "L'ensemble de mes realisations et experiences de developpement"
  const projectsBadgeFeatured = settings.ui_project_badge_featured || 'Mis en avant'
  const projectsActionGithub = settings.ui_project_action_github || 'GitHub'
  const projectsActionDemo = settings.ui_project_action_demo || 'Demo'

  useEffect(() => {
    const params = { page, limit: 9 }
    if (activeTag) params.tag = activeTag

    setLoading(true)
    getProjects(params)
      .then((res) => {
        setProjects(res?.data || [])
        setPagination(res?.pagination || null)
        /* Collecte de tous les tags uniques */
        const tags = [...new Set((res?.data || []).flatMap((p) => p.tags || []))]
        if (page === 1) setAllTags(tags)
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [page, activeTag])

  const handleTagFilter = (tag) => {
    setActiveTag((prev) => (prev === tag ? null : tag))
    setPage(1)
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title={projectsPageHeading}
            subtitle={projectsPageSubtitle}
          />

          {/* Filtres par tag */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagFilter(tag)}
                  className="transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-full"
                >
                  <Badge variant={activeTag === tag ? 'solid' : 'default'}>
                    {tag}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Grille des projets */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
                  >
                    <Card className="h-full flex flex-col overflow-hidden !p-0">
                      {/* Image du projet */}
                      {project.image_url ? (
                        <div
                          className="w-full h-52 md:h-56 overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 74%, transparent)' }}
                        >
                          <img
                            src={project.image_url}
                            alt={project.title}
                            className="w-full h-full object-contain p-2 transition-transform duration-300 hover:scale-[1.02]"
                            loading="lazy"
                            decoding="async"
                            width="1200"
                            height="675"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-full h-52 md:h-56 flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          <FolderOpenIcon
                            className="h-10 w-10"
                            style={{ color: 'var(--color-accent)', opacity: 0.3 }}
                            aria-hidden="true"
                          />
                        </div>
                      )}

                      {/* Contenu de la carte */}
                      <div className="flex flex-col flex-grow p-5">
                        <div className="flex items-start justify-between mb-3">
                          {!project.image_url && (
                            <FolderOpenIcon
                              className="h-7 w-7"
                              style={{ color: 'var(--color-accent)' }}
                              aria-hidden="true"
                            />
                          )}
                          {project.featured && (
                            <Badge className="ml-auto">{projectsBadgeFeatured}</Badge>
                          )}
                        </div>
                        <h2
                          className="text-base font-bold mb-2"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          <Link
                            to={`/projets/${project.slug}`}
                            className="hover:text-[var(--color-accent)] transition-colors"
                          >
                            {project.title}
                          </Link>
                        </h2>
                        <p
                          className="text-sm leading-relaxed mb-4 flex-grow line-clamp-3"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {project.description}
                        </p>
                        {Array.isArray(project.tags) && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {project.tags.map((tag) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-auto">
                          {project.github_url && (
                            <Button
                              variant="ghost"
                              href={project.github_url}
                              aria-label={`${projectsActionGithub} - ${project.title}`}
                            >
                              <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                              {projectsActionGithub}
                            </Button>
                          )}
                          {project.demo_url && (
                            <Button
                              variant="secondary"
                              href={project.demo_url}
                              aria-label={`${projectsActionDemo} - ${project.title}`}
                            >
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                              {projectsActionDemo}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-9 h-9 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      style={{
                        backgroundColor: p === page ? 'var(--color-accent)' : 'var(--color-bg-card)',
                        color: p === page ? '#fff' : 'var(--color-text-secondary)',
                        border: `1px solid var(--color-border)`,
                      }}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  ))}
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
