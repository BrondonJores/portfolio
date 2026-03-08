/* Section Competences avec grille animee */
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import AnimatedSection from '../ui/AnimatedSection.jsx'
import AnimatedMascots from '../ui/AnimatedMascots.jsx'
import AnimatedSceneAsset from '../ui/AnimatedSceneAsset.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'
import Card from '../ui/Card.jsx'
import Spinner from '../ui/Spinner.jsx'
import { getSkills } from '../../services/skillService.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getSectionAnimationConfig } from '../../utils/animationSettings.js'

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
  const { settings } = useSettings()
  const prefersReducedMotion = useReducedMotion()
  const animationConfig = useMemo(
    () => getSectionAnimationConfig(settings, Boolean(prefersReducedMotion), 'skills'),
    [settings, prefersReducedMotion]
  )
  const canAnimate = animationConfig.canAnimate
  const skillsTitle = settings.ui_section_skills_title || 'Competences'
  const skillsSubtitle = settings.ui_section_skills_subtitle || "Technologies et outils que j'utilise au quotidien"
  const skillsEmptyLabel = settings.ui_section_skills_empty || 'Aucune competence pour le moment.'

  useEffect(() => {
    getSkills()
      .then((res) => {
        const skillsByCategory = res.data || {}

        // Transformation en tableau pour mapper dans JSX
        const grouped = Object.entries(skillsByCategory).map(
          ([category, skills]) => ({
            category,
            items: skills.map((skill) => skill.name),
          })
        )

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
      <AnimatedSection id="skills" sectionKey="skills" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Spinner size="lg" />
        </div>
      </AnimatedSection>
    )
  }

  return (
    <AnimatedSection
      id="skills"
      sectionKey="skills"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      <AnimatedMascots scope="skills" sceneKey="skills" />
      <AnimatedSceneAsset scope="skills" sceneKey="skills" />

      <div className="max-w-6xl mx-auto relative z-20">
        <div className="flex items-center gap-3 mb-2">
          <WrenchScrewdriverIcon
            className="h-7 w-7"
            style={{ color: 'var(--color-accent)' }}
            aria-hidden="true"
          />
          <SectionTitle
            title={skillsTitle}
            subtitle={skillsSubtitle}
          />
        </div>

        {skillGroups.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {skillsEmptyLabel}
          </p>
        ) : (
          /* Grille des categories de competences */
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial={canAnimate ? 'hidden' : false}
            whileInView={canAnimate ? 'visible' : false}
            viewport={{ once: animationConfig.sectionOnce }}
          >
            {skillGroups.map((skillGroup) => (
              <motion.div
                key={skillGroup.category}
                variants={itemVariants}
                transition={{ duration: 0.4 * animationConfig.durationScale, ease: animationConfig.easePreset }}
              >
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
