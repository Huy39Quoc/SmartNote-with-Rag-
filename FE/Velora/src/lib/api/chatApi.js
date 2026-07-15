import client from './client'
const chatApi = {
  getSessions: ()          => client.get('/chat/sessions'),
  getSession:         (id)        => client.get(`/chat/sessions/${id}`),
  createSession:         (data)      => client.post('/chat/sessions', data || {}),
  updateSession:     (id, data)  => client.patch(`/chat/sessions/${id}`, data),
  deleteSession:         (id)        => client.delete(`/chat/sessions/${id}`),
  hoiDap:             (id, data)  => client.post(`/chat/sessions/${id}/ask`, data),
  recognizeSpeech:   (formData)  => client.post('/chat/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}
export default chatApi
