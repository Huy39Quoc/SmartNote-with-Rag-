import client from './client'
const documentApi = {
  layTatCa:  (params) => client.get('/documents', { params }),
  layTheoId: (id)     => client.get(`/documents/${id}`),
  taiLen: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return client.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round(e.loaded * 100 / e.total)),
    })
  },
  phanTichAmThanh: (id, data) => client.post(`/documents/${id}/transcribe`, data || {}),
  phanTich:        (id, data) => client.post(`/documents/${id}/analyze`, data || {}),
  hoiDap:          (id, data) => client.post(`/documents/${id}/ask`, data),
  xoa:             (id)       => client.delete(`/documents/${id}`),
}
export default documentApi
