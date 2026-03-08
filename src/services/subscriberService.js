import { api } from './api.js'

export const subscribe = ({ email, captchaToken }) =>
  api.post('/subscribe', {
    email,
    ...(captchaToken ? { captcha_token: captchaToken } : {}),
  })
export const getAdminSubscribers = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get(`/admin/subscribers${query}`)
}
export const deleteSubscriber = (id) => api.del(`/admin/subscribers/${id}`)
