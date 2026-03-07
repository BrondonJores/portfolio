/* Service des statistiques du tableau de bord */
import { api } from './api.js'

/* Recupere le snapshot stats complet (KPI, tendances, series, recents). */
export function getAdminStats(options = {}) {
  const params = new URLSearchParams()

  if (options.periodDays !== undefined && options.periodDays !== null) {
    params.set('period_days', String(options.periodDays))
  }

  const query = params.toString()
  const suffix = query ? `?${query}` : ''

  return api.get(`/admin/stats${suffix}`)
}
