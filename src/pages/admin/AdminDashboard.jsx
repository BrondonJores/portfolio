/* Tableau de bord administrateur */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderOpenIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  WrenchScrewdriverIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { getAdminProjects } from '../../services/projectService.js'
import { getAdminArticles } from '../../services/articleService.js'
import { getAdminMessages } from '../../services/messageService.js'
import { getAdminSkills } from '../../services/skillService.js'
import { getAdminStats } from '../../services/statsService.js'

const PIE_COLORS = ['var(--color-accent)', '#a78bfa', '#f87171', '#4ade80']

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    color: 'var(--color-text-primary)',
  },
}

const axisTickStyle = { fill: 'var(--color-text-secondary)', fontSize: 12 }

/* Composant carte de statistique */
function StatCard({ icon: Icon, label, value, color, to, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      <Link
        to={to}
        className="flex items-center gap-4 p-6 rounded-xl border transition-all hover:border-[var(--color-accent)]"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-6 w-6" style={{ color }} aria-hidden="true" />
        </div>
        <div>
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {value ?? '-'}
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {label}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    projects: null,
    articles: null,
    messages: null,
    skills: null,
    unreadMessages: null,
    recentMessages: [],
    chartData: [],
  })

  useEffect(() => {
    /* Chargement parallele de toutes les statistiques */
    Promise.allSettled([
      getAdminProjects(),
      getAdminArticles(),
      getAdminMessages(),
      getAdminSkills(),
      getAdminStats(),
    ]).then(([projects, articles, messages, skills, statsResult]) => {
      const projectsData = projects.value?.data || []
      const articlesData = articles.value?.data || []
      const messagesData = messages.value?.data || []
      const skillsData = skills.value?.data || {}
      const chartData = statsResult.value?.data || []

      const publishedProjects = projectsData.filter((p) => p.published).length
      const publishedArticles = articlesData.filter((a) => a.published).length
      const unread = messagesData.filter((m) => !m.read_at).length
      const skillCount = Object.values(skillsData).flat().length

      setStats({
        projects: publishedProjects,
        articles: publishedArticles,
        messages: messagesData.length,
        skills: skillCount,
        unreadMessages: unread,
        recentMessages: messagesData.slice(0, 3),
        chartData,
      })
    })
  }, [])

  return (
    <>
      <Helmet>
        <title>Tableau de bord - Administration</title>
      </Helmet>
      <div>
        <h1
          className="text-2xl font-bold mb-8"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Tableau de bord
        </h1>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={FolderOpenIcon}
            label="Projets publies"
            value={stats.projects}
            color="var(--color-accent)"
            to="/admin/projets"
            delay={0}
          />
          <StatCard
            icon={DocumentTextIcon}
            label="Articles publies"
            value={stats.articles}
            color="#a78bfa"
            to="/admin/articles"
            delay={0.05}
          />
          <StatCard
            icon={EnvelopeIcon}
            label={`Messages${stats.unreadMessages ? ` (${stats.unreadMessages} non lus)` : ''}`}
            value={stats.messages}
            color="#f87171"
            to="/admin/messages"
            delay={0.1}
          />
          <StatCard
            icon={WrenchScrewdriverIcon}
            label="Competences"
            value={stats.skills}
            color="#4ade80"
            to="/admin/competences"
            delay={0.15}
          />
        </div>

        {/* Section Charts */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Analytiques
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart 1 : Messages reçus */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <EnvelopeIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Messages reçus
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke="var(--color-accent)"
                    fill="url(#colorMessages)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2 : Contenu publié */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <DocumentTextIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Contenu publié
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="projets" fill="var(--color-accent)" />
                  <Bar dataKey="articles" fill="#a78bfa" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3 : Répartition du contenu */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ChartPieIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Répartition
                </h3>
              </div>
              {(() => {
                const pieData = [
                  { name: 'Projets', value: stats.projects || 0 },
                  { name: 'Articles', value: stats.articles || 0 },
                  { name: 'Compétences', value: stats.skills || 0 },
                  { name: 'Messages', value: stats.messages || 0 },
                ]
                const total = pieData.reduce((sum, d) => sum + d.value, 0)
                if (total === 0) {
                  return (
                    <div className="flex items-center justify-center" style={{ height: 200 }}>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Aucune donnée disponible
                      </p>
                    </div>
                  )
                }
                return (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {PIE_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )
              })()}
            </div>
          </div>
        </section>

        {/* Derniers messages */}
        {stats.recentMessages.length > 0 && (
          <section>
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Derniers messages
            </h2>
            <div className="space-y-3">
              {stats.recentMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-4 p-4 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: msg.read_at ? 'var(--color-border)' : 'var(--color-accent)',
                  }}
                >
                  {/* Indicateur non lu */}
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      backgroundColor: msg.read_at ? 'var(--color-border)' : '#f87171',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {msg.name}
                      <span
                        className="ml-2 font-normal text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {msg.email}
                      </span>
                    </p>
                    <p
                      className="text-sm mt-0.5 truncate"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {msg.message}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-4">
              <Link
                to="/admin/messages"
                className="text-sm transition-colors"
                style={{ color: 'var(--color-accent-light)' }}
              >
                Voir tous les messages
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
