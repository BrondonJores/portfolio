/* Section Projets avec grille de cartes animees */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  CodeBracketIcon,
  ArrowTopRightOnSquareIcon,
  FolderOpenIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import AnimatedSceneAsset from '../ui/AnimatedSceneAsset.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Spinner from '../ui/Spinner.jsx'
import { getProjects } from '../../services/projectService.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'
import { buildSectionContainerVariants, buildSectionItemVariants } from '../../utils/sectionMotionProfiles.js'
import { getProjectDisplayTags, getProjectTaxonomy } from '../../utils/projectTaxonomy.js'

/**
 * Nettoie un texte pour affichage court.
 * @param {unknown} value Valeur brute.
 * @returns {string} Texte normalise.
 */
function normalizeText(value) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Extrait une phrase courte et lisible.
 * @param {unknown} value Texte source.
 * @param {number} maxLength Longueur max.
 * @param {string} fallback Valeur de repli.
 * @returns {string} Phrase courte.
 */
function getShortSentence(value, maxLength, fallback) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return fallback
  }
  const [firstChunk] = normalized.split(/(?<=[.!?])\s+/)
  const sentence = firstChunk || normalized
  if (sentence.length <= maxLength) {
    return sentence
  }
  return `${sentence.slice(0, Math.max(1, maxLength - 3)).trim()}...`
}

/**
 * Retourne les chips de presentation d'un projet.
 * @param {object} project Projet.
 * @param {number} limit Limite max.
 * @returns {Array<string>} Liste de chips.
 */
function resolveProjectChips(project, limit) {
  return getProjectDisplayTags(project, limit).map((tag) => normalizeText(tag)).filter(Boolean)
}

/**
 * Prepare les lignes "cas d'etude" d'un projet.
 * @param {object} project Projet.
 * @param {object} labels Labels i18n.
 * @returns {Array<{label:string,value:string}>} Lignes de contexte.
 */
function buildProjectSnapshot(project, labels) {
  const taxonomy = getProjectTaxonomy(project)
  const summary = getShortSentence(
    project?.description,
    140,
    'Projet produit pour livrer une solution claire, testable et maintenable.'
  )
  const stack = taxonomy.stack.length > 0
    ? taxonomy.stack.slice(0, 3).join(' | ')
    : 'Stack non renseignee'
  const proof = [
    project?.demo_url ? labels.demoLive : null,
    project?.github_url ? labels.sourceCode : null,
  ].filter(Boolean).join(' + ') || labels.caseStudyOnly

  return [
    { label: labels.objective, value: summary },
    { label: labels.stack, value: stack },
    { label: labels.proof, value: proof },
  ]
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'projects'),
    [settings, prefersReducedMotion]
  )
  const canAnimate = animationConfig.canAnimate
  const containerVariants = useMemo(
    () => buildSectionContainerVariants('projects', animationConfig),
    [animationConfig]
  )
  const cardVariants = useMemo(
    () => buildSectionItemVariants('projects', animationConfig),
    [animationConfig]
  )
  const projectsTitle = settings.ui_section_projects_title || 'Projets'
  const projectsSubtitle = settings.ui_section_projects_subtitle || 'Quelques-uns de mes realisations recentes'
  const projectsBadgeFeatured = settings.ui_project_badge_featured || 'Mis en avant'
  const projectsActionGithub = settings.ui_project_action_github || 'GitHub'
  const projectsActionDemo = settings.ui_project_action_demo || 'Demo'
  const projectsDemoUnavailable = settings.ui_project_demo_unavailable || 'Demo non disponible'
  const projectsViewAllLabel = settings.ui_section_projects_view_all || 'Voir tous mes projets'
  const projectsActionCaseStudy = settings.ui_project_action_case_study || 'Voir etude de cas'
  const projectsShowcaseLabel = settings.ui_project_showcase_label || 'Showcase'
  const projectsStatDemos = settings.ui_project_stat_demos || 'Demos live'
  const projectsStatRepos = settings.ui_project_stat_repos || 'Repos publics'
  const projectsStatTech = settings.ui_project_stat_tech || 'Technos'
  const snapshotObjective = settings.ui_project_snapshot_objective || 'Objectif'
  const snapshotStack = settings.ui_project_snapshot_stack || 'Stack'
  const snapshotProof = settings.ui_project_snapshot_proof || 'Preuve'
  const snapshotCaseStudyOnly = settings.ui_project_snapshot_case_study || 'Etude de cas detaillee'
  const snapshotDemoLive = settings.ui_project_snapshot_demo_live || 'Demo live'
  const snapshotSourceCode = settings.ui_project_snapshot_source_code || 'Code source'

  useEffect(() => {
    getProjects({ featured: true, limit: 4 })
      .then((data) => setProjects(data.data))
      .catch((err) => {
        console.error('Erreur lors du chargement des projets :', err)
        setProjects([])
      })
      .finally(() => setLoading(false))
  }, [])

  const showcaseStats = useMemo(() => {
    const demosCount = projects.filter((project) => Boolean(project.demo_url)).length
    const reposCount = projects.filter((project) => Boolean(project.github_url)).length
    const technologiesCount = new Set(
      projects.flatMap((project) => getProjectTaxonomy(project).technologies || [])
    ).size

    return [
      { key: 'demos', label: projectsStatDemos, value: demosCount, Icon: ArrowTopRightOnSquareIcon },
      { key: 'repos', label: projectsStatRepos, value: reposCount, Icon: CodeBracketIcon },
      { key: 'tech', label: projectsStatTech, value: technologiesCount, Icon: SparklesIcon },
    ]
  }, [projects, projectsStatDemos, projectsStatRepos, projectsStatTech])

  const [heroProject, ...secondaryProjects] = projects

  if (loading) {
    return (
      <AnimatedSection
        id="projects"
        sectionKey="projects"
        className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <div className="max-w-6xl mx-auto flex justify-center">
          <Spinner size="lg" />
        </div>
      </AnimatedSection>
    )
  }

  if (projects.length === 0) {
    return null
  }

  return (
    <AnimatedSection
      id="projects"
      sectionKey="projects"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <AnimatedMascots scope="projects" sceneKey="projects" />
      <AnimatedSceneAsset scope="projects" sceneKey="projects" />

      <div className="max-w-6xl mx-auto relative z-20">
        <SectionTitle
          title={projectsTitle}
          subtitle={projectsSubtitle}
        />

        {/* Grille de cartes projets */}
        <motion.div
          className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3"
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          whileInView={canAnimate ? 'visible' : false}
          viewport={{ once: animationConfig.sectionOnce }}
        >
          {showcaseStats.map(({ key, label, value, Icon }) => (
            <motion.div
              key={key}
              variants={cardVariants}
              transition={{ duration: 0.5 * animationConfig.durationScale, ease: animationConfig.easePreset }}
            >
              <div
                className="rounded-xl border px-4 py-3 h-full"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'linear-gradient(120deg, color-mix(in srgb, var(--color-bg-card) 88%, transparent), color-mix(in srgb, var(--color-accent-glow) 24%, transparent))',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-accent) 40%, var(--color-border))',
                      backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                      {label}
                    </p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {value}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 xl:grid-cols-5 gap-6"
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          whileInView={canAnimate ? 'visible' : false}
          viewport={{ once: animationConfig.sectionOnce }}
        >
          {heroProject && (
            <motion.div
              className="xl:col-span-3"
              variants={cardVariants}
              transition={{ duration: 0.52 * animationConfig.durationScale, ease: animationConfig.easePreset }}
            >
              <Card className="h-full overflow-hidden !p-0">
                <article className="flex h-full flex-col">
                  {heroProject.image_url ? (
                    <div
                      className="relative h-56 md:h-72 lg:h-[24rem] overflow-hidden"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 72%, transparent)' }}
                    >
                      <img
                        src={heroProject.image_url}
                        alt={heroProject.title}
                        className="h-full w-full object-contain p-2 md:p-3"
                        loading="lazy"
                        decoding="async"
                        width="1600"
                        height="900"
                      />
                    </div>
                  ) : (
                    <div
                      className="h-56 md:h-72 lg:h-[24rem] flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, color-mix(in srgb, var(--color-bg-card) 90%, transparent), color-mix(in srgb, var(--color-accent-glow) 42%, transparent))',
                      }}
                    >
                      <FolderOpenIcon
                        className="h-12 w-12"
                        style={{ color: 'var(--color-accent)', opacity: 0.45 }}
                        aria-hidden="true"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-5 p-6 md:p-7">
                    <div className="flex flex-wrap items-center gap-2">
                      {heroProject.featured && (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            color: 'var(--color-accent-light)',
                            backgroundColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
                          }}
                        >
                          {projectsBadgeFeatured}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          color: 'var(--color-text-secondary)',
                          backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 70%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--color-border) 70%, transparent)',
                        }}
                      >
                        <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {projectsShowcaseLabel}
                      </span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                      {heroProject.title}
                    </h3>
                    <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      {getShortSentence(
                        heroProject.description,
                        210,
                        'Projet concu pour fournir une solution robuste et orientee impact.'
                      )}
                    </p>

                    <dl className="grid gap-3">
                      {buildProjectSnapshot(heroProject, {
                        objective: snapshotObjective,
                        stack: snapshotStack,
                        proof: snapshotProof,
                        caseStudyOnly: snapshotCaseStudyOnly,
                        demoLive: snapshotDemoLive,
                        sourceCode: snapshotSourceCode,
                      }).map((item) => (
                        <div key={`${heroProject.id}-${item.label}`} className="grid grid-cols-[80px_1fr] gap-3 text-sm">
                          <dt style={{ color: 'var(--color-text-secondary)' }}>{item.label}</dt>
                          <dd style={{ color: 'var(--color-text-primary)' }}>{item.value}</dd>
                        </div>
                      ))}
                    </dl>

                    {resolveProjectChips(heroProject, 6).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {resolveProjectChips(heroProject, 6).map((tag) => (
                          <span
                            key={`${heroProject.id}-${tag}`}
                            className="text-xs font-mono px-2 py-1 rounded border"
                            style={{
                              color: 'var(--color-text-secondary)',
                              borderColor: 'var(--color-border)',
                              fontFamily: 'JetBrains Mono Variable, monospace',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      <Link
                        to={`/projets/${heroProject.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                        style={{
                          color: 'var(--color-text-primary)',
                          backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 84%, transparent)',
                          border: '1px solid var(--color-border)',
                        }}
                        aria-label={`${projectsActionCaseStudy} - ${heroProject.title}`}
                      >
                        {projectsActionCaseStudy}
                        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                      </Link>

                      {heroProject.github_url && (
                        <Button
                          variant="ghost"
                          href={heroProject.github_url}
                          aria-label={`${projectsActionGithub} - ${heroProject.title}`}
                        >
                          <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                          {projectsActionGithub}
                        </Button>
                      )}

                      {heroProject.demo_url ? (
                        <Button
                          variant="secondary"
                          href={heroProject.demo_url}
                          aria-label={`${projectsActionDemo} - ${heroProject.title}`}
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                          {projectsActionDemo}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          disabled
                          aria-label={projectsDemoUnavailable}
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                          {projectsActionDemo}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              </Card>
            </motion.div>
          )}

          <div className="xl:col-span-2 grid grid-cols-1 gap-6">
            {secondaryProjects.map((project) => {
              const tags = resolveProjectChips(project, 4)
              const snapshot = buildProjectSnapshot(project, {
                objective: snapshotObjective,
                stack: snapshotStack,
                proof: snapshotProof,
                caseStudyOnly: snapshotCaseStudyOnly,
                demoLive: snapshotDemoLive,
                sourceCode: snapshotSourceCode,
              })

              return (
                <motion.div
                  key={project.id}
                  variants={cardVariants}
                  transition={{ duration: 0.48 * animationConfig.durationScale, ease: animationConfig.easePreset }}
                >
                  <Card className="h-full flex flex-col overflow-hidden !p-0">
                    {project.image_url ? (
                      <div
                        className="w-full h-44 md:h-48 overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 72%, transparent)' }}
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
                        className="w-full h-44 md:h-48 flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            'linear-gradient(150deg, color-mix(in srgb, var(--color-bg-primary) 92%, transparent), color-mix(in srgb, var(--color-accent-glow) 32%, transparent))',
                        }}
                      >
                        <FolderOpenIcon
                          className="h-9 w-9"
                          style={{ color: 'var(--color-accent)', opacity: 0.35 }}
                          aria-hidden="true"
                        />
                      </div>
                    )}

                    <div className="flex flex-col flex-grow p-5">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <h3 className="text-lg font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                          {project.title}
                        </h3>
                        {project.featured && (
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              color: 'var(--color-accent-light)',
                              backgroundColor: 'color-mix(in srgb, var(--color-accent) 16%, transparent)',
                            }}
                          >
                            {projectsBadgeFeatured}
                          </span>
                        )}
                      </div>

                      <p className="text-sm leading-relaxed mb-4 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {getShortSentence(project.description, 150, 'Solution orientee valeur et execution propre.')}
                      </p>

                      <dl className="grid gap-2 mb-4">
                        {snapshot.slice(1).map((item) => (
                          <div key={`${project.id}-${item.label}`} className="grid grid-cols-[60px_1fr] gap-2 text-xs">
                            <dt style={{ color: 'var(--color-text-secondary)' }}>{item.label}</dt>
                            <dd style={{ color: 'var(--color-text-primary)' }}>{item.value}</dd>
                          </div>
                        ))}
                      </dl>

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-5">
                          {tags.slice(0, 4).map((tag) => (
                            <span
                              key={`${project.id}-${tag}`}
                              className="text-xs font-mono px-2 py-0.5 rounded border"
                              style={{
                                color: 'var(--color-text-secondary)',
                                borderColor: 'var(--color-border)',
                                fontFamily: 'JetBrains Mono Variable, monospace',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center gap-3">
                        <Link
                          to={`/projets/${project.slug}`}
                          className="inline-flex items-center gap-1 text-sm font-medium transition-colors duration-200"
                          style={{ color: 'var(--color-accent)' }}
                          aria-label={`${projectsActionCaseStudy} - ${project.title}`}
                        >
                          {projectsActionCaseStudy}
                          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        {project.demo_url && (
                          <Button
                            variant="ghost"
                            href={project.demo_url}
                            aria-label={`${projectsActionDemo} - ${project.title}`}
                            className="!px-3 !py-1.5"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                            {projectsActionDemo}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Lien vers tous la page projet */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/projets"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
            style={{ color: 'var(--color-accent)' }}
            aria-label={projectsViewAllLabel}
          >
            {projectsViewAllLabel}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AnimatedSection>
  )
}
