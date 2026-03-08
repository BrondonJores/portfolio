/* Service de gestion des projets */
import { api } from './api.js'

const PROJECT_CACHE_TTL_MS = 30_000
const PROJECT_DETAIL_CACHE_TTL_MS = 60_000

/* Fonctions publiques */
export const getProjects = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/projects${query}`, { cacheTtlMs: PROJECT_CACHE_TTL_MS })
}
export const getProjectBySlug = (slug) =>
  api.get(`/projects/${slug}`, { cacheTtlMs: PROJECT_DETAIL_CACHE_TTL_MS })

/* Fonctions admin */
export const getAdminProjects = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/projects${query}`)
}
export const getAdminProjectById = (id) => api.get(`/admin/projects/${id}`)
export const createProject = (data) => api.post('/admin/projects', data)
export const updateProject = (id, data) => api.put(`/admin/projects/${id}`, data)
export const deleteProject = (id) => api.del(`/admin/projects/${id}`)
