import client from './client'
const tagApi = {
  layTatCa: ()            => client.get('/tags'),
  taoMoi:   (data)        => client.post('/tags', data),
  capNhat:  (id, data)    => client.put(`/tags/${id}`, data),
  xoa:      (id)          => client.delete(`/tags/${id}`),
}
export default tagApi
