/* Page admin securite: surveillance intrusion, abus et evenements sensibles. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ShieldExclamationIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Spinner from '../../components/ui/Spinner.jsx'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import { getSecurityEvents, getSecuritySummary } from '../../services/securityService.js'

const WINDOW_OPTIONS = [
  { value: 6, label: '6h' },
  { value: 24, label: '24h' },
  { value: 72, label: '72h' },
  { value: 168, label: '7 jours' },
]

const SEVERITY_OPTIONS = [
  { value: '', label: 'Toutes severites' },
  { value: 'critical', label: 'Critique' },
  { value: 'warning', label: 'Alerte' },
  { value: 'info', label: 'Info' },
]

function formatDateTime(dateValue) {
  if (!dateValue) return '-'
  try {
    return new Date(dateValue).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '-'
  }
}

function severityBadgeStyle(severity) {
  if (severity === 'critical') {
    return {
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      color: '#f87171',
    }
  }
  if (severity === 'warning') {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
      color: '#fbbf24',
    }
  }
  return {
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    color: '#93c5fd',
  }
}

function StatCard({ label, value }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
    >
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
    </div>
  )
}

function SectionHeader({ title, description = '' }) {
  return (
    <div className="space-y-1 mb-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      {description && (
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      )}
    </div>
  )
}

export default function AdminSecurity() {
  const addToast = useAdminToast()
  const [windowHours, setWindowHours] = useState(24)
  const [severity, setSeverity] = useState('')
  const [eventQuery, setEventQuery] = useState('')
  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const hasMore = events.length < totalEvents
  const normalizedEventQuery = String(eventQuery || '').trim().toLowerCase()
  const filteredEvents = useMemo(() => {
    if (!normalizedEventQuery) {
      return events
    }

    return events.filter((event) => {
      const haystack = [
        event?.event_type,
        event?.severity,
        event?.ip_address,
        event?.message,
        event?.request_path,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')

      return haystack.includes(normalizedEventQuery)
    })
  }, [events, normalizedEventQuery])

  const loadSecurityData = useCallback(
    async ({ resetList = true } = {}) => {
      if (resetList) {
        setLoading(true)
      }

      try {
        const [summaryResponse, eventsResponse] = await Promise.all([
          getSecuritySummary({ windowHours }),
          getSecurityEvents({ limit: 50, offset: resetList ? 0 : events.length, severity, windowHours }),
        ])

        setSummary(summaryResponse?.data || null)
        setTotalEvents(Number(eventsResponse?.data?.total || 0))

        if (resetList) {
          setEvents(eventsResponse?.data?.items || [])
        } else {
          setEvents((prev) => [...prev, ...(eventsResponse?.data?.items || [])])
        }
      } catch (err) {
        addToast(err?.message || 'Erreur lors du chargement des logs securite.', 'error')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [addToast, events.length, severity, windowHours]
  )

  useEffect(() => {
    loadSecurityData({ resetList: true })
  }, [loadSecurityData])

  const summaryCards = useMemo(
    () => [
      { label: 'Evenements', value: summary?.totalEvents || 0 },
      { label: 'Critiques', value: summary?.criticalEvents || 0 },
      { label: 'Alertes', value: summary?.warningEvents || 0 },
      { label: 'Echecs auth', value: summary?.authFailures || 0 },
      { label: 'Origines bloquees', value: summary?.blockedOrigins || 0 },
      { label: 'Rate limit total', value: summary?.rateLimitHits || 0 },
      { label: 'Rate limit public', value: summary?.rateLimitPublicHits || 0 },
      { label: 'Rate limit admin', value: summary?.rateLimitAdminHits || 0 },
      { label: 'Rate limit auth', value: summary?.rateLimitAuthHits || 0 },
      { label: 'IPs uniques', value: summary?.uniqueIpCount || 0 },
    ],
    [summary]
  )

  return (
    <>
      <Helmet>
        <title>Securite - Administration</title>
      </Helmet>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldExclamationIcon className="h-6 w-6" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Securite & Intrusion
              </h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Surveillance des evenements sensibles, abus et signaux de risque.
            </p>
          </div>

          <div
            className="rounded-xl border p-3 grid grid-cols-1 sm:grid-cols-[auto_auto_minmax(220px,1fr)_auto] gap-2 items-center"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <select
              value={windowHours}
              onChange={(e) => setWindowHours(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
              }}
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Fenetre: {option.label}
                </option>
              ))}
            </select>

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
              }}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="relative">
              <MagnifyingGlassIcon
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-hidden="true"
              />
              <input
                type="text"
                value={eventQuery}
                onChange={(event) => setEventQuery(event.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="Rechercher type, IP, route..."
              />
            </div>

            <button
              type="button"
              onClick={() => loadSecurityData({ resetList: true })}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-primary)',
              }}
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              Rafraichir
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {summaryCards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div
                className="rounded-xl border p-4"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <SectionHeader title="Top types d evenements" />
                {Array.isArray(summary?.topEventTypes) && summary.topEventTypes.length > 0 ? (
                  <div className="space-y-2">
                    {summary.topEventTypes.map((entry) => (
                      <div
                        key={entry.eventType}
                        className="flex items-center justify-between text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <span>{entry.eventType}</span>
                        <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {entry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucun evenement sur cette fenetre.
                  </p>
                )}
              </div>

              <div
                className="rounded-xl border p-4"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <SectionHeader title="Top adresses IP" />
                {Array.isArray(summary?.topIps) && summary.topIps.length > 0 ? (
                  <div className="space-y-2">
                    {summary.topIps.map((entry) => (
                      <div
                        key={entry.ip}
                        className="flex items-center justify-between text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <span>{entry.ip || '-'}</span>
                        <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {entry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucune IP significative sur cette fenetre.
                  </p>
                )}
              </div>
            </div>

            <div
              className="rounded-xl border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div
                className="px-4 py-3 border-b text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Logs recents ({totalEvents} evenements)
                {normalizedEventQuery ? ` - filtres: ${filteredEvents.length}` : ''}
              </div>

              {events.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucun evenement sur cette fenetre.
                </p>
              ) : filteredEvents.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucun evenement ne correspond a cette recherche.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ color: 'var(--color-text-secondary)' }}>
                        <th className="text-left px-4 py-2">Date</th>
                        <th className="text-left px-4 py-2">Type</th>
                        <th className="text-left px-4 py-2">Niveau</th>
                        <th className="text-left px-4 py-2">IP</th>
                        <th className="text-left px-4 py-2">Message</th>
                        <th className="text-left px-4 py-2">Route</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event) => (
                        <tr
                          key={event.id}
                          className="border-t"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                        >
                          <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(event.created_at)}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{event.event_type}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span
                              className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={severityBadgeStyle(event.severity)}
                            >
                              {event.severity}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">{event.ip_address || '-'}</td>
                          <td className="px-4 py-2">{event.message}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{event.request_path || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {hasMore && (
                <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoadingMore(true)
                      loadSecurityData({ resetList: false })
                    }}
                    disabled={loadingMore}
                    className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'var(--color-bg-primary)',
                    }}
                  >
                    {loadingMore ? 'Chargement...' : 'Charger plus'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
