import client from './client'
const tagApi = {
  getAll: ()            => client.get('/tags'),
  create:   (data)        => client.post('/tags', data),
  update:  (id, data)    => client.put(`/tags/${id}`, data),
  remove:      (id)          => client.delete(`/tags/${id}`),
}
export default tagApi
