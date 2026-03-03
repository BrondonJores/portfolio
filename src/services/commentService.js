/* Service de gestion des commentaires */
import { api } from './api.js'

/* Fonctions publiques */
export const getCommentsByArticle = (articleId) => api.get(`/comments/${articleId}`)
export const postComment = (data) => api.post('/comments', data)

/* Fonctions admin */
export const getAdminComments = () => api.get('/admin/comments')
export const approveComment = (id) => api.put(`/admin/comments/${id}/approve`, {})
export const deleteComment = (id) => api.del(`/admin/comments/${id}`)
