import { api } from './api.js'

export const getNewsletterCampaigns = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/newsletter${query}`)
}
export const getNewsletterCampaignById = (id) => api.get(`/admin/newsletter/${id}`)
export const createCampaign = (data) => api.post('/admin/newsletter', data)
export const updateCampaign = (id, data) => api.put(`/admin/newsletter/${id}`, data)
export const deleteCampaign = (id) => api.del(`/admin/newsletter/${id}`)
export const sendCampaign = (id) => api.post(`/admin/newsletter/${id}/send`, {})
