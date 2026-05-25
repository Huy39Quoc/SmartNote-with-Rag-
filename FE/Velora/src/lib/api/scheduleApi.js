import client from './client'
const scheduleApi = {
  layTatCa:           ()          => client.get('/schedules'),
  layUuTien:          ()          => client.get('/schedules/priority'),
  taoMoi:             (data)      => client.post('/schedules', data),
  capNhat:            (id, data)  => client.put(`/schedules/${id}`, data),
  xoa:                (id)        => client.delete(`/schedules/${id}`),
  trichXuatTuGhiChu:  (data)      => client.post('/schedules/extract', data),
}
export default scheduleApi
