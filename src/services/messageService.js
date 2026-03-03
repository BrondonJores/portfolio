/* Service de gestion des messages de contact */
import { api } from './api.js'

/* Fonction publique */
export const sendMessage = (data) => api.post('/messages', data)

/* Fonctions admin */
export const getAdminMessages = () => api.get('/admin/messages')
export const markMessageAsRead = (id) => api.put(`/admin/messages/${id}/read`, {})
