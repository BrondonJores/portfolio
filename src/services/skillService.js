/* Service de gestion des competences */
import { api } from './api.js'

/* Fonction publique */
export const getSkills = async () => {
  const res = await api.get('/skills')
  return res 
}

/* Fonctions admin */
export const getAdminSkills = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/skills${query}`)
}
export const createSkill = (data) => api.post('/admin/skills', data)
export const updateSkill = (id, data) => api.put(`/admin/skills/${id}`, data)
export const deleteSkill = (id) => api.del(`/admin/skills/${id}`)
