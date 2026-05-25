import client from './client'
const adminApi = {
  layThongKe:       ()           => client.get('/admin/stats'),
  layThongKeAi:     ()           => client.get('/admin/ai-stats'),
  layDanhSachUser:  (params)     => client.get('/admin/users', { params }),
  capNhatUser:      (id, data)   => client.put(`/admin/users/${id}`, data),
  xoaUser:          (id)         => client.delete(`/admin/users/${id}`),
  layPrompt:        ()           => client.get('/admin/prompts'),
  capNhatPrompt:    (id, text)   => client.put(`/admin/prompts/${id}`, { promptText: text }),
  phatQuangBa:      (data)       => client.post('/admin/broadcast', data),
}
export default adminApi
