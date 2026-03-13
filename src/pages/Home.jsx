/* Page d'accueil regroupant toutes les sections */
import Navbar from '../components/sections/Navbar.jsx'
import Hero from '../components/sections/Hero.jsx'
import HomeSignalBoard from '../components/sections/HomeSignalBoard.jsx'
import About from '../components/sections/About.jsx'
import Skills from '../components/sections/Skills.jsx'
import Certifications from '../components/sections/Certifications.jsx'
import Projects from '../components/sections/Projects.jsx'
import Blog from '../components/sections/Blog.jsx'
import CertificationBadgesShowcase from '../components/sections/CertificationBadgesShowcase.jsx'
import Contact from '../components/sections/Contact.jsx'
import Footer from '../components/sections/Footer.jsx'
import { usePublicArticles } from '../hooks/usePublicArticles.js'
import { usePublicCertifications } from '../hooks/usePublicCertifications.js'
import { usePublicProjects } from '../hooks/usePublicProjects.js'
import { usePublicSkills } from '../hooks/usePublicSkills.js'

const HOME_ARTICLE_PARAMS = Object.freeze({ limit: 4 })
const HOME_PROJECT_PARAMS = Object.freeze({ featured: true, limit: 4 })

/**
 * Page d'accueil avec toutes les sections du portfolio.
 * Chaque section possede un id pour la navigation par ancre.
 */
export default function Home() {
  const { articles, loading: articlesLoading } = usePublicArticles(HOME_ARTICLE_PARAMS)
  const { certifications, badgeImages, loading: certificationsLoading } = usePublicCertifications()
  const { projects, loading: projectsLoading } = usePublicProjects(HOME_PROJECT_PARAMS)
  const { skillGroups, loading: skillsLoading } = usePublicSkills()
  const homeMetrics = [
    {
      value: projectsLoading ? '...' : String(projects.length),
      label: 'Projets',
      detail: 'showcases et etudes de cas visibles',
    },
    {
      value: articlesLoading ? '...' : String(articles.length),
      label: 'Articles',
      detail: 'retours terrain et prises de position',
    },
    {
      value: certificationsLoading ? '...' : String(certifications.length),
      label: 'Certifications',
      detail: certificationsLoading ? 'badges en chargement' : `${badgeImages.length} badges verifies`,
    },
  ]

  return (
    <>
      <Navbar />
      <Hero homeMetrics={homeMetrics} />
      <HomeSignalBoard
        projects={projects}
        articles={articles}
        certifications={certifications}
        badgeImages={badgeImages}
        skillGroups={skillGroups}
      />
      <Projects projects={projects} loading={projectsLoading} />
      <Skills skillGroups={skillGroups} loading={skillsLoading} />
      <About />
      <Blog articles={articles} loading={articlesLoading} />
      <Certifications certifications={certifications} loading={certificationsLoading} />
      <CertificationBadgesShowcase badges={badgeImages} loading={certificationsLoading} />
      <Contact />
      <Footer />
    </>
  )
}
