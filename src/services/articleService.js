/* Service de gestion des articles */
import { api } from './api.js'

/* Fonctions publiques */
export const getArticles = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/articles${query}`)
}
export const getArticleBySlug = (slug) => api.get(`/articles/${slug}`)

/* Fonctions admin */
export const getAdminArticles = () => api.get('/admin/articles')
export const createArticle = (data) => api.post('/admin/articles', data)
export const updateArticle = (id, data) => api.put(`/admin/articles/${id}`, data)
export const deleteArticle = (id) => api.del(`/admin/articles/${id}`)
