/* Section Projets avec grille de cartes animees */
import { motion } from 'framer-motion'
import {
  CodeBracketIcon,
  ArrowTopRightOnSquareIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import { projects } from '../../data/projects.js'

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
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={cardVariants}>
              <Card className="h-full flex flex-col">
                {/* En-tete de la carte */}
                <div className="flex items-start justify-between mb-4">
                  <FolderOpenIcon
                    className="h-8 w-8"
                    style={{ color: 'var(--color-accent)' }}
                    aria-hidden="true"
                  />
                  {project.featured && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
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
                  {project.tags.map((tag) => (
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
                    href={project.github}
                    aria-label={`Voir le code source de ${project.title} sur GitHub`}
                  >
                    <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
                    GitHub
                  </Button>
                  {project.demo ? (
                    <Button
                      variant="secondary"
                      href={project.demo}
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
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AnimatedSection>
  )
}
