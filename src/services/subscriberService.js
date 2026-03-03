import { api } from './api.js'

export const subscribe = (email) => api.post('/subscribe', { email })
export const getAdminSubscribers = () => api.get('/admin/subscribers')
export const deleteSubscriber = (id) => api.del(`/admin/subscribers/${id}`)
