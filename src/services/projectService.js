/* Service de gestion des projets */
import { api } from './api.js'

/* Fonctions publiques */
export const getProjects = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/projects${query}`)
}
export const getProjectBySlug = (slug) => api.get(`/projects/${slug}`)

/* Fonctions admin */
export const getAdminProjects = () => api.get('/admin/projects')
export const createProject = (data) => api.post('/admin/projects', data)
export const updateProject = (id, data) => api.put(`/admin/projects/${id}`, data)
export const deleteProject = (id) => api.del(`/admin/projects/${id}`)
