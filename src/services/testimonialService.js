/* Service de gestion des temoignages */
import { api } from './api.js'

const TESTIMONIAL_CACHE_TTL_MS = 60_000

/* Fonction publique */
export const getTestimonials = () => api.get('/testimonials', { cacheTtlMs: TESTIMONIAL_CACHE_TTL_MS })

/* Fonctions admin */
export const getAdminTestimonials = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/testimonials${query}`)
}
export const createTestimonial = (data) => api.post('/admin/testimonials', data)
export const updateTestimonial = (id, data) => api.put(`/admin/testimonials/${id}`, data)
export const deleteTestimonial = (id) => api.del(`/admin/testimonials/${id}`)
