import client from './client'
const scheduleApi = {
  getAll:           ()          => client.get('/schedules'),
  getPriority:          ()          => client.get('/schedules/priority'),
  create:             (data)      => client.post('/schedules', data),
  update:            (id, data)  => client.put(`/schedules/${id}`, data),
  remove:                (id)        => client.delete(`/schedules/${id}`),
  extractFromNote:  (data)      => client.post('/schedules/extract', data),
}
export default scheduleApi
