/* Service de gestion des messages de contact */
import { api } from './api.js'

/* Fonction publique */
export const sendMessage = (data) => api.post('/messages', data)

/* Fonctions admin */
export const getAdminMessages = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/messages${query}`)
}
export const markMessageAsRead = (id) => api.put(`/admin/messages/${id}/read`, {})
