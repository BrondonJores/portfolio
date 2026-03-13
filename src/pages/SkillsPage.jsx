/* Page des competences avec barres de progression animees */
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import Navbar from '../components/sections/Navbar.jsx'
import Footer from '../components/sections/Footer.jsx'
import SectionTitle from '../components/ui/SectionTitle.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { usePublicSkills } from '../hooks/usePublicSkills.js'
import { buildPageTitle } from '../utils/seoSettings.js'

/* Animation de la barre de progression */
function SkillBar({ skill }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {skill.name}
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {skill.level}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: 'var(--color-accent)' }}
          initial={{ width: 0 }}
          whileInView={{ width: `${skill.level}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default function SkillsPage() {
  const { settings } = useSettings()
  const { groupedSkills, loading } = usePublicSkills()
  const pageTitle = buildPageTitle(settings, 'Compétences')
  const skillsPageHeading = settings.ui_skills_page_title || 'Mes compétences'
  const skillsPageSubtitle =
    settings.ui_skills_page_subtitle || 'Technologies et outils maîtrisés avec niveaux de compétences'

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title={skillsPageHeading}
            subtitle={skillsPageSubtitle}
          />

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Object.entries(groupedSkills).map(([category, skills]) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="p-6 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <h2
                    className="text-lg font-bold mb-6"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {category}
                  </h2>
                  {skills.map((skill) => (
                    <SkillBar key={skill.id} skill={skill} />
                  ))}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

