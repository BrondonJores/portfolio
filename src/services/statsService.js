/* Service des statistiques du tableau de bord */
import { api } from './api.js'

/* Recupere les stats aggregees par mois (6 derniers mois) */
export const getAdminStats = () => api.get('/admin/stats')
