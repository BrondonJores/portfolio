/* Service de gestion des parametres */
import { api } from './api.js'

const SETTINGS_CACHE_TTL_MS = 30_000

export const getSettings = () => api.get('/settings', { cacheTtlMs: SETTINGS_CACHE_TTL_MS })
export const getAdminSettings = () =>
  api.get('/admin/settings', { cacheTtlMs: SETTINGS_CACHE_TTL_MS })
export const updateSettings = (data) => api.put('/admin/settings', data)
