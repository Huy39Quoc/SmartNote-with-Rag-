import client from './client'
const chatApi = {
  layDanhSachSession: ()          => client.get('/chat/sessions'),
  laySession:         (id)        => client.get(`/chat/sessions/${id}`),
  taoSession:         (data)      => client.post('/chat/sessions', data || {}),
  capNhatSession:     (id, data)  => client.patch(`/chat/sessions/${id}`, data),
  xoaSession:         (id)        => client.delete(`/chat/sessions/${id}`),
  hoiDap:             (id, data)  => client.post(`/chat/sessions/${id}/ask`, data),
}
export default chatApi
