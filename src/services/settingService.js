/* Service de gestion des parametres */
import { api } from './api.js'

export const getSettings = () => api.get('/settings')
export const getAdminSettings = () => api.get('/admin/settings')
export const updateSettings = (data) => api.put('/admin/settings', data)
