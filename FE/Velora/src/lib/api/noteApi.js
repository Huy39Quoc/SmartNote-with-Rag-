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

    chiaSe: (noteId, data) =>
        client.post(`/note-shares/notes/${noteId}`, data),

    layDanhSachChiaSe: (noteId) =>
        client.get(`/note-shares/notes/${noteId}`),

    huyChiaSe: (shareId) =>
        client.delete(`/note-shares/${shareId}`),

    layGhiChuDuocChiaSe: () =>
        client.get('/note-shares/shared-with-me'),
}

export default noteApi