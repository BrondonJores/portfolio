import { api } from './api.js'

export const subscribe = ({ email, captchaToken }) =>
  api.post('/subscribe', {
    email,
    ...(captchaToken ? { captcha_token: captchaToken } : {}),
  })
export const getAdminSubscribers = () => api.get('/admin/subscribers')
export const deleteSubscriber = (id) => api.del(`/admin/subscribers/${id}`)
