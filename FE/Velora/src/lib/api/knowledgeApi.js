import client from './client'
const knowledgeApi = {
  layTatCa:    ()          => client.get('/knowledge'),
  layTheoId:   (id)        => client.get(`/knowledge/${id}`),
  taoMoi:      (data)      => client.post('/knowledge', data),
  capNhat:     (id, data)  => client.put(`/knowledge/${id}`, data),
  xoa:         (id)        => client.delete(`/knowledge/${id}`),
  phanLoai:    (data)      => client.post('/knowledge/classify', data),
  phanLoaiLai: ()          => client.post('/knowledge/reclassify'),
}
export default knowledgeApi
