/* Section Hero pleine hauteur avec animations d'entree */
import { motion } from 'framer-motion'
import { ArrowDownIcon } from '@heroicons/react/24/outline'
import Button from '../ui/Button.jsx'

/* Variants pour l'animation staggeree des elements texte */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Fond avec gradient anime subtil */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          background: [
            'radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
            'radial-gradient(ellipse at 80% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
            'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
            'radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
          ],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      />

      {/* Contenu principal */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge de disponibilite */}
          <motion.div variants={itemVariants} className="mb-6">
            <span
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full border"
              style={{
                color: 'var(--color-accent-light)',
                borderColor: 'var(--color-accent)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
              Disponible pour des projets
            </span>
          </motion.div>

          {/* Titre principal oversized */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-7xl font-black mb-6 leading-none tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Developpeur
            <br />
            <span style={{ color: 'var(--color-accent)' }}>Full Stack</span>
          </motion.h1>

          {/* Sous-titre */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Je construis des applications web modernes, performantes et securisees.
          </motion.p>

          {/* Boutons CTA */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="primary" href="#projects">
              Voir mes projets
            </Button>
            <Button variant="secondary" href="#contact">
              Me contacter
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Icone fleche vers le bas avec animation bounce */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ArrowDownIcon
          className="h-6 w-6"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-hidden="true"
        />
      </motion.div>
    </section>
  )
}
