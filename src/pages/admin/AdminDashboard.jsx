/* Tableau de bord administrateur enrichi et theme-aware. */
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FolderOpenIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
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
import Spinner from '../../components/ui/Spinner.jsx'
import { getAdminStats } from '../../services/statsService.js'

const CHART_COLORS = [
  'var(--color-accent)',
  'var(--color-accent-light)',
  'var(--color-text-primary)',
  'var(--color-text-secondary)',
  'var(--color-border)',
]

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    color: 'var(--color-text-primary)',
  },
}

const axisTickStyle = { fill: 'var(--color-text-secondary)', fontSize: 12 }

/**
 * Carte KPI cliquable du dashboard.
 * @param {object} props Proprietes de la carte.
 * @returns {JSX.Element} Carte d'indicateur.
 */
function StatCard({ icon: Icon, label, value, hint, color, to, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: 'easeOut' }}
    >
      <Link
        to={to}
        className="flex items-center gap-4 p-5 rounded-xl border transition-all hover:border-[var(--color-accent)]"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: color,
          }}
        >
          <Icon className="h-6 w-6" style={{ color }} aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {value ?? '-'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </p>
          {hint && (
            <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {hint}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

/**
 * Badges de tendance 30 jours.
 * @param {object} props Proprietes du badge.
 * @returns {JSX.Element} Badge tendance.
 */
function TrendPill({ label, trend }) {
  const safeTrend = trend || { current: 0, previous: 0, delta: 0, deltaPercent: 0, direction: 'flat' }
  const isUp = safeTrend.direction === 'up'
  const isDown = safeTrend.direction === 'down'
  const prefix = safeTrend.delta > 0 ? '+' : ''

  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
    >
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {safeTrend.current}
      </p>
      <p
        className="text-xs font-medium"
        style={{
          color: isUp
            ? 'var(--color-accent)'
            : isDown
              ? 'var(--color-text-secondary)'
              : 'var(--color-text-secondary)',
        }}
      >
        {safeTrend.direction === 'flat'
          ? 'Stable vs periode precedente'
          : `${prefix}${safeTrend.delta} (${prefix}${safeTrend.deltaPercent}%) vs periode precedente`}
      </p>
    </div>
  )
}

/**
 * Formate une date ISO pour affichage simple.
 * @param {string | null | undefined} isoDate Date ISO.
 * @returns {string} Date formatee.
 */
function formatDate(isoDate) {
  if (!isoDate) return '-'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const response = await getAdminStats()
        if (!active) return
        setStats(response?.data || null)
      } catch (err) {
        if (!active) return
        setError(err.message || 'Impossible de charger les statistiques.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const summary = stats?.summary || {}
  const trends = stats?.trends || {}
  const chartData = Array.isArray(stats?.chartData) ? stats.chartData : []
  const recentMessages = Array.isArray(stats?.recentMessages) ? stats.recentMessages : []
  const topTags = Array.isArray(stats?.topTags) ? stats.topTags : []
  const lastSentCampaign = stats?.lastSentCampaign || null

  const totalDistribution = useMemo(
    () => [
      { name: 'Projets', value: Number(summary.projectsPublished) || 0 },
      { name: 'Articles', value: Number(summary.articlesPublished) || 0 },
      { name: 'Abonnes', value: Number(summary.subscribersTotal) || 0 },
      { name: 'Messages', value: Number(summary.messagesTotal) || 0 },
      { name: 'Commentaires en attente', value: Number(summary.commentsPending) || 0 },
    ],
    [summary]
  )

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Erreur de chargement
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {error}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium focus:outline-none"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          Recharger
        </button>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Tableau de bord - Administration</title>
      </Helmet>

      <div className="space-y-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Tableau de bord
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            icon={FolderOpenIcon}
            label="Projets publies"
            value={summary.projectsPublished || 0}
            hint={`${summary.projectsDraft || 0} brouillon(s), ${summary.projectsFeatured || 0} en avant`}
            color="var(--color-accent)"
            to="/admin/projets"
            delay={0}
          />
          <StatCard
            icon={DocumentTextIcon}
            label="Articles publies"
            value={summary.articlesPublished || 0}
            hint={`${summary.articlesDraft || 0} brouillon(s), ${summary.articleLikes || 0} likes`}
            color="var(--color-accent-light)"
            to="/admin/articles"
            delay={0.04}
          />
          <StatCard
            icon={EnvelopeIcon}
            label="Messages non lus"
            value={summary.unreadMessages || 0}
            hint={`${summary.messagesTotal || 0} total, ${summary.messageReadRate || 0}% lus`}
            color="var(--color-text-primary)"
            to="/admin/messages"
            delay={0.08}
          />
          <StatCard
            icon={UserGroupIcon}
            label="Abonnes newsletter"
            value={summary.subscribersTotal || 0}
            hint={`${summary.subscribersConfirmed || 0} confirmes`}
            color="var(--color-text-secondary)"
            to="/admin/subscribers"
            delay={0.12}
          />
          <StatCard
            icon={ChatBubbleLeftRightIcon}
            label="Commentaires a moderer"
            value={summary.commentsPending || 0}
            hint="Commentaires en attente d'approbation"
            color="var(--color-accent)"
            to="/admin/commentaires"
            delay={0.16}
          />
          <StatCard
            icon={PaperAirplaneIcon}
            label="Campagnes envoyees"
            value={summary.campaignsSent || 0}
            hint={`${summary.campaignsDraft || 0} brouillon(s)`}
            color="var(--color-accent-light)"
            to="/admin/newsletter"
            delay={0.2}
          />
        </div>

        <section
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Tendances sur 30 jours
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TrendPill label="Messages" trend={trends.messages30d} />
            <TrendPill label="Nouveaux abonnes" trend={trends.subscribers30d} />
            <TrendPill label="Contenus publies" trend={trends.content30d} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Analytiques
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <EnvelopeIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Messages et abonnes
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dashColorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dashColorSubscribers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent-light)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent-light)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="messages" stroke="var(--color-accent)" fill="url(#dashColorMessages)" />
                  <Area type="monotone" dataKey="abonnes" stroke="var(--color-accent-light)" fill="url(#dashColorSubscribers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <DocumentTextIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Production de contenu
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="projets" fill="var(--color-accent)" />
                  <Bar dataKey="articles" fill="var(--color-accent-light)" />
                  <Bar dataKey="commentaires" fill="var(--color-text-secondary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ChartPieIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Repartition globale
                </h3>
              </div>
              {totalDistribution.every((item) => item.value === 0) ? (
                <div className="flex items-center justify-center" style={{ height: 220 }}>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucune donnee disponible
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={totalDistribution} innerRadius={52} outerRadius={84} dataKey="value" paddingAngle={2}>
                      {totalDistribution.map((entry, index) => (
                        <Cell key={`pie-cell-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] gap-4">
          <section
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Derniers messages
            </h2>
            {recentMessages.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Aucun message recent.
              </p>
            ) : (
              <div className="space-y-2">
                {recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border p-3"
                    style={{
                      borderColor: msg.read_at ? 'var(--color-border)' : 'var(--color-accent)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {msg.name}
                      </p>
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {msg.email}
                    </p>
                    <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              <Link to="/admin/messages" className="text-sm" style={{ color: 'var(--color-accent)' }}>
                Voir tous les messages
              </Link>
            </div>
          </section>

          <section
            className="rounded-xl border p-4 space-y-4"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Top tags contenus
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                Tags les plus utilises dans les projets et articles publies.
              </p>
            </div>

            {topTags.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Aucun tag exploitable pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {topTags.map((item) => (
                  <div
                    key={item.tag}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      #{item.tag}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Derniere campagne envoyee
              </p>
              {lastSentCampaign ? (
                <div className="mt-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {lastSentCampaign.subject}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Envoyee le {formatDate(lastSentCampaign.sent_at)}
                  </p>
                </div>
              ) : (
                <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucune campagne envoyee.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

