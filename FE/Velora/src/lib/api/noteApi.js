import client from './client'

const noteApi = {
    layTatCa:   (params)     => client.get('/notes', { params }),
    layTheoId:  (id)         => client.get(`/notes/${id}`),
    taoMoi:     (data)       => client.post('/notes', data),
    capNhat:    (id, data)   => client.put(`/notes/${id}`, data),
    xoa:        (id)         => client.delete(`/notes/${id}`),
    danhDau:    (id)         => client.patch(`/notes/${id}/bookmark`),
    caiThienAi: (id, data)   => client.post(`/notes/${id}/ai`, data),

    xuatPdf:    (id)         => client.get(`/notes/${id}/export/pdf`, {
        responseType: 'blob',
    }),

    xuatWord:   (id)         => client.get(`/notes/${id}/export/docx`, {
        responseType: 'blob',
    }),
}

export default noteApi