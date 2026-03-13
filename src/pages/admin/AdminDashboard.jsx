/* Tableau de bord administrateur enrichi, filtrable et exportable CSV. */
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowDownTrayIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FolderOpenIcon,
  PaintBrushIcon,
  PaperAirplaneIcon,
  Squares2X2Icon,
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
const dashboardPanelStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 88%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
  boxShadow: '0 26px 56px -44px color-mix(in srgb, var(--color-accent-glow) 26%, transparent)',
}
const dashboardSoftPanelStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 86%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
}

/**
 * Entete standard de section dashboard.
 * @param {object} props Proprietes d'affichage.
 * @returns {JSX.Element} Entete harmonise.
 */
function SectionHeader({ title, description = '', icon: Icon = null }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 18%, transparent)' }}
          >
            <Icon
              className="h-4 w-4"
              style={{ color: 'var(--color-accent)' }}
              aria-hidden="true"
            />
          </span>
        )}
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
            Pilotage
          </p>
          <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
        </div>
      </div>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      )}
    </div>
  )
}

/**
 * Echappe une cellule CSV.
 * @param {unknown} value Valeur brute.
 * @returns {string} Valeur CSV serialisee.
 */
function escapeCsvCell(value) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) {
    return text
  }
  return `"${text.replace(/"/g, '""')}"`
}

/**
 * Construit un contenu CSV a partir du snapshot stats.
 * @param {object} stats Snapshot dashboard.
 * @returns {string} Texte CSV.
 */
function buildDashboardCsv(stats) {
  const summary = stats?.summary || {}
  const trends = stats?.trends || {}
  const chartData = Array.isArray(stats?.chartData) ? stats.chartData : []
  const periodSeries = Array.isArray(stats?.periodSeries) ? stats.periodSeries : []
  const topTags = Array.isArray(stats?.topTags) ? stats.topTags : []
  const periodDays = stats?.filters?.periodDays || 30

  const lines = []

  lines.push('section,metric,value')
  for (const [key, value] of Object.entries(summary)) {
    lines.push([escapeCsvCell('summary'), escapeCsvCell(key), escapeCsvCell(value)].join(','))
  }

  lines.push('')
  lines.push('section,metric,current,previous,delta,delta_percent,direction')
  for (const [key, trend] of Object.entries(trends)) {
    if (!trend || typeof trend !== 'object' || trend.current === undefined) continue
    lines.push([
      escapeCsvCell('trend'),
      escapeCsvCell(key),
      escapeCsvCell(trend.current),
      escapeCsvCell(trend.previous),
      escapeCsvCell(trend.delta),
      escapeCsvCell(trend.deltaPercent),
      escapeCsvCell(trend.direction),
    ].join(','))
  }

  lines.push('')
  lines.push('monthly,month,messages,abonnes,projets,articles,commentaires,campagnes')
  for (const row of chartData) {
    lines.push([
      escapeCsvCell('monthly'),
      escapeCsvCell(row.month),
      escapeCsvCell(row.messages),
      escapeCsvCell(row.abonnes),
      escapeCsvCell(row.projets),
      escapeCsvCell(row.articles),
      escapeCsvCell(row.commentaires),
      escapeCsvCell(row.campagnes),
    ].join(','))
  }

  lines.push('')
  lines.push(`period_${periodDays}j,day,messages,abonnes,contenu,projets,articles,commentaires,campagnes`)
  for (const row of periodSeries) {
    lines.push([
      escapeCsvCell(`period_${periodDays}j`),
      escapeCsvCell(row.day),
      escapeCsvCell(row.messages),
      escapeCsvCell(row.abonnes),
      escapeCsvCell(row.contenu),
      escapeCsvCell(row.projets),
      escapeCsvCell(row.articles),
      escapeCsvCell(row.commentaires),
      escapeCsvCell(row.campagnes),
    ].join(','))
  }

  lines.push('')
  lines.push('top_tags,tag,count')
  for (const tag of topTags) {
    lines.push([
      escapeCsvCell('top_tags'),
      escapeCsvCell(tag.tag),
      escapeCsvCell(tag.count),
    ].join(','))
  }

  return lines.join('\n')
}

/**
 * Telecharge un fichier CSV dans le navigateur.
 * @param {string} filename Nom du fichier.
 * @param {string} csvContent Contenu CSV.
 * @returns {void}
 */
function downloadCsvFile(filename, csvContent) {
  if (typeof window === 'undefined') {
    return
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

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
        className="group flex h-full flex-col gap-5 rounded-[var(--ui-radius-xl)] border p-5 transition-all"
        style={{
          ...dashboardPanelStyle,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
              {value ?? '-'}
            </p>
          </div>
          <span
            className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[1.1rem] border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
              borderColor: color,
            }}
          >
            <Icon className="h-6 w-6" style={{ color }} aria-hidden="true" />
          </span>
        </div>

        <div className="min-w-0 border-t pt-4" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 62%, transparent)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Ouvrir le module
          </p>
          {hint && (
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {hint}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

/**
 * Badge de tendance entre deux periodes.
 * @param {object} props Proprietes du badge.
 * @returns {JSX.Element} Badge tendance.
 */
function TrendPill({ label, trend }) {
  const safeTrend = trend || { current: 0, previous: 0, delta: 0, deltaPercent: 0, direction: 'flat' }
  const isUp = safeTrend.direction === 'up'
  const prefix = safeTrend.delta > 0 ? '+' : ''

  return (
    <div
      className="rounded-[var(--ui-radius-xl)] border p-4"
      style={dashboardPanelStyle}
    >
      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        {safeTrend.current}
      </p>
      <p
        className="mt-3 text-xs font-medium leading-relaxed"
        style={{
          color: isUp ? 'var(--color-accent)' : 'var(--color-text-secondary)',
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

/**
 * Petit bloc de metrique operationnelle.
 * @param {object} props Proprietes de la metrique.
 * @returns {JSX.Element} Bloc de metrique.
 */
function MetricTile({ label, value, helper }) {
  return (
    <div
      className="rounded-[var(--ui-radius-xl)] border p-4"
      style={dashboardPanelStyle}
    >
      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
      {helper && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {helper}
        </p>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [periodDays, setPeriodDays] = useState(30)

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const response = await getAdminStats({ periodDays })
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
  }, [periodDays])

  const summary = stats?.summary || {}
  const trends = stats?.trends || {}
  const chartData = Array.isArray(stats?.chartData) ? stats.chartData : []
  const periodSeries = Array.isArray(stats?.periodSeries) ? stats.periodSeries : []
  const recentMessages = Array.isArray(stats?.recentMessages) ? stats.recentMessages : []
  const topTags = Array.isArray(stats?.topTags) ? stats.topTags : []
  const lastSentCampaign = stats?.lastSentCampaign || null
  const periodSummary = stats?.periodSummary || { current: {}, previous: {} }
  const allowedPeriodDays = Array.isArray(stats?.filters?.allowedPeriodDays)
    ? stats.filters.allowedPeriodDays
    : [7, 30, 90]
  const activePeriodDays = stats?.filters?.periodDays || periodDays
  const activePeriodLabel = `${activePeriodDays} jours`

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

  /**
   * Exporte le dashboard courant en CSV.
   * @returns {void}
   */
  const handleExportCsv = () => {
    const csvContent = buildDashboardCsv(stats || {})
    const dateStamp = new Date().toISOString().slice(0, 10)
    downloadCsvFile(`dashboard-stats-${dateStamp}.csv`, csvContent)
  }

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
        className="rounded-[var(--ui-radius-2xl)] border p-6"
        style={dashboardSoftPanelStyle}
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
          className="mt-4 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          Reessayer
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
        <section
          className="overflow-hidden rounded-[var(--ui-radius-2xl)] border p-6 md:p-7"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-border) 76%, transparent)',
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--color-bg-card) 90%, transparent), color-mix(in srgb, var(--color-accent-glow) 18%, transparent))',
            boxShadow: '0 30px 68px -46px color-mix(in srgb, var(--color-accent-glow) 30%, transparent)',
          }}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
                Poste de pilotage
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                Tableau de bord
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Lecture globale du portfolio, de l'inbox, du contenu et des campagnes sur la fenetre active ({activePeriodLabel}).
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div
                  className="rounded-full border px-4 py-2 text-xs font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
                  }}
                >
                  {summary.interactionTotal || 0} interactions totales
                </div>
                <div
                  className="rounded-full border px-4 py-2 text-xs font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 58%, transparent)',
                  }}
                >
                  {summary.responsePressure || 0} points d'attention inbox
                </div>
              </div>
            </div>

            <div
              className="rounded-[var(--ui-radius-xl)] border p-4"
              style={dashboardSoftPanelStyle}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                Periode et export
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {allowedPeriodDays.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPeriodDays(days)}
                    aria-pressed={periodDays === days}
                    className="rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
                    style={{
                      borderColor: periodDays === days ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                      color: periodDays === days ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 88%, transparent)',
                    }}
                  >
                    {days}j
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div
                  className="rounded-xl border px-4 py-3"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 66%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                    Fenetre active
                  </p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {activePeriodLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium focus:outline-none"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                  }}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          className="rounded-[var(--ui-radius-2xl)] border p-5 md:p-6"
          style={dashboardSoftPanelStyle}
        >
          <SectionHeader
            title="Studio et accelerateurs"
            description="Acces directs pour pousser le design system, les templates et la production sans friction."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/admin/templates"
              className="rounded-[var(--ui-radius-xl)] border p-5 transition-all"
              style={dashboardPanelStyle}
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 18%, transparent)' }}
                >
                  <Squares2X2Icon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Marketplace Templates
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    Gerer les templates de blocs et importer des packs.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/themes"
              className="rounded-[var(--ui-radius-xl)] border p-5 transition-all"
              style={dashboardPanelStyle}
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-glow) 18%, transparent)' }}
                >
                  <PaintBrushIcon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Marketplace Themes
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    Parcourir, importer et appliquer des themes.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

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
            hint={`${summary.subscribersConfirmed || 0} confirmes (${summary.subscriberConfirmationRate || 0}%)`}
            color="var(--color-text-secondary)"
            to="/admin/subscribers"
            delay={0.12}
          />
          <StatCard
            icon={ChatBubbleLeftRightIcon}
            label="Commentaires a moderer"
            value={summary.commentsPending || 0}
            hint={`${summary.commentApprovalRate || 0}% approuves`}
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
          className="rounded-[var(--ui-radius-2xl)] border p-5 md:p-6"
          style={dashboardSoftPanelStyle}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <MetricTile
              label="Pression inbox"
              value={summary.responsePressure || 0}
              helper="Messages non lus + commentaires en attente"
            />
            <MetricTile
              label="Interactions totales"
              value={summary.interactionTotal || 0}
              helper="Messages + commentaires + abonnes"
            />
            <MetricTile
              label="Moyenne mensuelle messages"
              value={summary.avgMonthlyMessages || 0}
              helper="Sur les 6 derniers mois"
            />
            <MetricTile
              label="Moyenne mensuelle contenu"
              value={summary.avgMonthlyContent || 0}
              helper="Projets + articles publies"
            />
            <MetricTile
              label="Moyenne mensuelle abonnes"
              value={summary.avgMonthlySubscribers || 0}
              helper="Sur les 6 derniers mois"
            />
          </div>
        </section>

        <section
          className="rounded-[var(--ui-radius-2xl)] border p-5 md:p-6"
          style={dashboardSoftPanelStyle}
        >
          <SectionHeader
            title={`Tendances sur ${activePeriodDays} jours`}
            description="Comparaison avec la periode precedente pour mesurer l'evolution."
            icon={ClockIcon}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <TrendPill label="Messages" trend={trends.messages} />
            <TrendPill label="Nouveaux abonnes" trend={trends.subscribers} />
            <TrendPill label="Contenus publies" trend={trends.content} />
            <TrendPill label="Commentaires" trend={trends.comments} />
            <TrendPill label="Campagnes envoyees" trend={trends.campaigns} />
          </div>
        </section>

        <section>
          <SectionHeader
            title={`Fenetre active (${activePeriodDays} jours)`}
            description="Lecture detaillee sur la periode selectionnee."
            icon={ClockIcon}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div
              className="rounded-[var(--ui-radius-2xl)] border p-5"
              style={dashboardPanelStyle}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                Flux messages / abonnes
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={periodSeries}>
                  <defs>
                    <linearGradient id="periodColorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="periodColorSubscribers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent-light)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent-light)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="messages" stroke="var(--color-accent)" fill="url(#periodColorMessages)" />
                  <Area type="monotone" dataKey="abonnes" stroke="var(--color-accent-light)" fill="url(#periodColorSubscribers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-[var(--ui-radius-2xl)] border p-5"
              style={dashboardPanelStyle}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                Contenu / campagnes sur la periode
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={periodSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="contenu" fill="var(--color-accent)" />
                  <Bar dataKey="campagnes" fill="var(--color-accent-light)" />
                  <Bar dataKey="commentaires" fill="var(--color-text-secondary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <MetricTile
              label="Leads periode"
              value={periodSummary.current?.leads || 0}
              helper={`${periodSummary.current?.leadsPerDay || 0}/jour`}
            />
            <MetricTile
              label="Conversion abonnes/messages"
              value={`${periodSummary.current?.subscriberPerMessageRate || 0}%`}
              helper="Nouveaux abonnes par rapport aux messages entrants"
            />
            <MetricTile
              label="Leads periode precedente"
              value={periodSummary.previous?.leads || 0}
              helper="Pour comparer la traction"
            />
          </div>
        </section>

        <section>
          <SectionHeader
            title="Analytiques 6 mois"
            description="Vision macro des tendances messages, contenus et repartition."
            icon={ChartPieIcon}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="rounded-[var(--ui-radius-2xl)] border p-5"
              style={dashboardPanelStyle}
            >
              <div className="flex items-center gap-2 mb-3">
                <EnvelopeIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
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
              className="rounded-[var(--ui-radius-2xl)] border p-5"
              style={dashboardPanelStyle}
            >
              <div className="flex items-center gap-2 mb-3">
                <DocumentTextIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
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
              className="rounded-[var(--ui-radius-2xl)] border p-5"
              style={dashboardPanelStyle}
            >
              <div className="flex items-center gap-2 mb-3">
                <ChartPieIcon className="h-4 w-4" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
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
            className="rounded-[var(--ui-radius-2xl)] border p-5"
            style={dashboardPanelStyle}
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
                    className="rounded-[var(--ui-radius-xl)] border p-4"
                    style={{
                      borderColor: msg.read_at
                        ? 'color-mix(in srgb, var(--color-border) 68%, transparent)'
                        : 'var(--color-accent)',
                      backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 72%, transparent)',
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
            className="rounded-[var(--ui-radius-2xl)] border p-5 space-y-4"
            style={dashboardPanelStyle}
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
                    className="flex items-center justify-between rounded-[var(--ui-radius-xl)] border px-4 py-3"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 72%, transparent)',
                    }}
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

            <div className="border-t pt-3" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
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
