import client from './client'
const adminApi = {
  getStats:         ()           => client.get('/admin/stats'),
  getAiStats:       ()           => client.get('/admin/ai-stats'),
  getUsers:         (params)     => client.get('/admin/users', { params }),
  updateUser:       (id, data)   => client.put(`/admin/users/${id}`, data),
  deleteUser:       (id)         => client.delete(`/admin/users/${id}`),
  getPrompts:       ()           => client.get('/admin/prompts'),
  updatePrompt:     (id, text)   => client.put(`/admin/prompts/${id}`, { promptText: text }),
  broadcast:        (data)       => client.post('/admin/broadcast', data),
  getLandingDraft:  ()           => client.get('/admin/landing'),
  saveLandingDraft: (data)       => client.put('/admin/landing', data),
  publishLanding:   ()           => client.post('/admin/landing/publish'),
    getAdminPackages: () => client.get('/admin/packages'),
    createAdminPackage: (data) => client.post('/admin/packages', data),
    updateAdminPackage: (id, data) => client.put(`/admin/packages/${id}`, data),
    deleteAdminPackage: (id) => client.delete(`/admin/packages/${id}`),
}
export default adminApi
