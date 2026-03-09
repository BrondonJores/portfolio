/* Service de gestion des certifications. */
import { api } from './api.js'

const CERTIFICATION_CACHE_TTL_MS = 30_000

/* Fonction publique */
export const getCertifications = async () => {
  const res = await api.get('/certifications', { cacheTtlMs: CERTIFICATION_CACHE_TTL_MS })
  return res
}

/* Fonctions admin */
export const getAdminCertifications = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/certifications${query}`)
}

export const createCertification = (data) => api.post('/admin/certifications', data)
export const updateCertification = (id, data) => api.put(`/admin/certifications/${id}`, data)
export const deleteCertification = (id) => api.del(`/admin/certifications/${id}`)
