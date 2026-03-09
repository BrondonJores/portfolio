/* Service de gestion des articles */
import { api } from './api.js'

const ARTICLE_CACHE_TTL_MS = 30_000
const ARTICLE_DETAIL_CACHE_TTL_MS = 60_000

/* Fonctions publiques */
export const getArticles = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/articles${query}`, { cacheTtlMs: ARTICLE_CACHE_TTL_MS })
}
export const getArticleBySlug = (slug) =>
  api.get(`/articles/${slug}`, { cacheTtlMs: ARTICLE_DETAIL_CACHE_TTL_MS })
export const likeArticle = (slug) => api.post(`/articles/${slug}/likes`)
export const unlikeArticle = (slug) => api.del(`/articles/${slug}/likes`)

/* Fonctions admin */
export const getAdminArticles = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/articles${query}`)
}
export const getAdminArticleById = (id) => api.get(`/admin/articles/${id}`)
export const createArticle = (data) => api.post('/admin/articles', data)
export const importAdminArticles = (data) => api.post('/admin/articles/import', data)
export const updateArticle = (id, data) => api.put(`/admin/articles/${id}`, data)
export const deleteArticle = (id) => api.del(`/admin/articles/${id}`)
