import { api } from './api.js'

export const getNewsletterCampaigns = () => api.get('/admin/newsletter')
export const createCampaign = (data) => api.post('/admin/newsletter', data)
export const updateCampaign = (id, data) => api.put(`/admin/newsletter/${id}`, data)
export const deleteCampaign = (id) => api.del(`/admin/newsletter/${id}`)
export const sendCampaign = (id) => api.post(`/admin/newsletter/${id}/send`, {})
