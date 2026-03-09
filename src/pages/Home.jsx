/* Page d'accueil regroupant toutes les sections */
import Navbar from '../components/sections/Navbar.jsx'
import Hero from '../components/sections/Hero.jsx'
import About from '../components/sections/About.jsx'
import Skills from '../components/sections/Skills.jsx'
import Certifications from '../components/sections/Certifications.jsx'
import Projects from '../components/sections/Projects.jsx'
import Blog from '../components/sections/Blog.jsx'
import Contact from '../components/sections/Contact.jsx'
import Footer from '../components/sections/Footer.jsx'

/**
 * Page d'accueil avec toutes les sections du portfolio.
 * Chaque section possede un id pour la navigation par ancre.
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Skills />
      <Certifications />
      <Projects />
      <Blog />
      <Contact />
      <Footer />
    </>
  )
}
