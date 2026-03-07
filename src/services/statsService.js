/* Service des statistiques du tableau de bord */
import { api } from './api.js'

/* Recupere le snapshot stats complet (KPI, tendances, series, recents). */
export const getAdminStats = () => api.get('/admin/stats')
