import client from './client'

const documentApi = {
    layTatCa: (params) =>
        client.get('/documents', { params }),

    layTheoId: (id) =>
        client.get(`/documents/${id}`),

    taiLen: (file, onProgress) => {
        const form = new FormData()
        form.append('file', file)

        return client.post('/documents/upload', form, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: e => {
                if (!e.total) return
                onProgress?.(Math.round((e.loaded * 100) / e.total))
            },
        })
    },

    phanTichAmThanh: (id, data) =>
        client.post(`/documents/${id}/transcribe`, data || {}),

    phanTich: (id, data) =>
        client.post(`/documents/${id}/analyze`, data || {}),

    hoiDap: (id, data) =>
        client.post(`/documents/${id}/ask`, data),

    xoa: (id) =>
        client.delete(`/documents/${id}`),

    chiaSe: (documentId, data) =>
        client.post(`/document-shares/documents/${documentId}`, data),

    layDanhSachChiaSe: (documentId) =>
        client.get(`/document-shares/documents/${documentId}`),

    huyChiaSe: (shareId) =>
        client.delete(`/document-shares/${shareId}`),

    layTaiLieuDuocChiaSe: () =>
        client.get('/document-shares/shared-with-me'),
}

export default documentApi