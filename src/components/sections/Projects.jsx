/* Section Projets avec grille de cartes animees */
import { useEffect, useState } from 'react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  CodeBracketIcon,
  ArrowTopRightOnSquareIcon,
  FolderOpenIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Spinner from '../ui/Spinner.jsx'
import { getProjects } from '../../services/projectService.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAnimationConfig } from '../../utils/animationSettings.js'

/* Variants pour l'animation staggeree des cartes */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getAnimationConfig(settings, Boolean(prefersReducedMotion)),
    [settings, prefersReducedMotion]
  )
  const canAnimate = animationConfig.canAnimate

  useEffect(() => {
    getProjects({ featured: true, limit: 3 })
      .then((data) => setProjects(data.data))
      .catch((err) => {
        console.error('Erreur lors du chargement des projets :', err)
        setProjects([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <AnimatedSection
        id="projects"
        className="py-24 px-4 sm:px-6 lg:px-8"
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
      className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <div className="max-w-6xl mx-auto">
        <SectionTitle
          title="Projets"
          subtitle="Quelques-uns de mes realisations recentes"
        />

        {/* Grille de cartes projets */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial={canAnimate ? 'hidden' : false}
          whileInView={canAnimate ? 'visible' : false}
          viewport={{ once: animationConfig.sectionOnce }}
        >
          {projects.map((project) => (
            <motion.div
              key={project.id}
              variants={cardVariants}
              transition={{ duration: 0.5 * animationConfig.durationScale, ease: animationConfig.easePreset }}
            >
              <Card className="h-full flex flex-col overflow-hidden !p-0">
                {/* Image du projet */}
                {project.image_url ? (
                  <div className="w-full h-48 overflow-hidden flex-shrink-0">
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full h-48 flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-bg-primary)' }}
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
                  {/* En-tete de la carte */}
                  <div className="flex items-start justify-between mb-4">
                    {!project.image_url && (
                      <FolderOpenIcon
                        className="h-8 w-8"
                        style={{ color: 'var(--color-accent)' }}
                        aria-hidden="true"
                      />
                    )}
                    {project.featured && (
                      <span
                        className="ml-auto text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          color: 'var(--color-accent-light)',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        }}
                      >
                        Mis en avant
                      </span>
                    )}
                  </div>

                  {/* Titre et description */}
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {project.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-4 flex-grow"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {project.description}
                  </p>

                  {/* Tags technologies */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(project.tags || []).map((tag) => (
                      <span
                        key={tag}
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

                  {/* Boutons d'action */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      href={project.github_url}
                      aria-label={`Voir le code source de ${project.title} sur GitHub`}
                    >
                      <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                      GitHub
                    </Button>
                    {project.demo_url ? (
                      <Button
                        variant="secondary"
                        href={project.demo_url}
                        aria-label={`Voir la demo de ${project.title}`}
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Demo
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        disabled
                        aria-label="Demo non disponible"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Demo
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Lien vers tous les projets */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/projets"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
            style={{ color: 'var(--color-accent)' }}
          >
            Voir tous mes projets
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AnimatedSection>
  )
}
