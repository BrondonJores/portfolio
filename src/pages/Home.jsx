/* Page d'accueil regroupant toutes les sections */
import Hero from '../components/sections/Hero.jsx'
import About from '../components/sections/About.jsx'
import Skills from '../components/sections/Skills.jsx'
import Projects from '../components/sections/Projects.jsx'
import Contact from '../components/sections/Contact.jsx'
import Footer from '../components/sections/Footer.jsx'

/**
 * Page d'accueil avec toutes les sections du portfolio.
 * Chaque section possede un id pour la navigation par ancre.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Contact />
      <Footer />
    </>
  )
}
