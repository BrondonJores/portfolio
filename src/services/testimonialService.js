/* Service de gestion des temoignages */
import { api } from './api.js'

/* Fonction publique */
export const getTestimonials = () => api.get('/testimonials')

/* Fonctions admin */
export const getAdminTestimonials = () => api.get('/admin/testimonials')
export const createTestimonial = (data) => api.post('/admin/testimonials', data)
export const updateTestimonial = (id, data) => api.put(`/admin/testimonials/${id}`, data)
export const deleteTestimonial = (id) => api.del(`/admin/testimonials/${id}`)
