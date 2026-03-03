/* Section Competences avec grille animee */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Spinner from '../ui/Spinner.jsx'
import { getSkills } from '../../services/skillService.js'

/* Variants pour l'animation staggeree des elements */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

export default function Skills() {
  const [skillGroups, setSkillGroups] = useState([])
  const [loading, setLoading] = useState(true)

 useEffect(() => {
    getSkills()
      .then((skills) => {
        /* Groupement du tableau plat par categorie */
        const grouped = skills.reduce((acc, skill) => {
          const existing = acc.find((g) => g.category === skill.category)
          if (existing) {
            existing.items.push(skill.name)
          } else {
            acc.push({ category: skill.category, items: [skill.name] })
          }
          return acc
        }, [])
        setSkillGroups(grouped)
      })
      .catch((err) => {
        console.error('Erreur lors du chargement des competences :', err)
        setSkillGroups([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <AnimatedSection id="skills" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Spinner size="lg" />
        </div>
      </AnimatedSection>
    )
  }

  return (
    <AnimatedSection
      id="skills"
      className="py-24 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <WrenchScrewdriverIcon
            className="h-7 w-7"
            style={{ color: 'var(--color-accent)' }}
            aria-hidden="true"
          />
          <SectionTitle
            title="Competences"
            subtitle="Technologies et outils que j'utilise au quotidien"
          />
        </div>

        {skillGroups.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Aucune competence pour le moment.
          </p>
        ) : (
          /* Grille des categories de competences */
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {skillGroups.map((skillGroup) => (
              <motion.div key={skillGroup.category} variants={itemVariants}>
                <Card>
                  <h3
                    className="text-lg font-bold mb-4"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {skillGroup.category}
                  </h3>
                  {/* Badges de competences */}
                  <div className="flex flex-wrap gap-2">
                    {skillGroup.items.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-medium px-3 py-1 rounded-full border"
                        style={{
                          color: 'var(--color-accent-light)',
                          borderColor: 'var(--color-accent)',
                          backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AnimatedSection>
  )
}
