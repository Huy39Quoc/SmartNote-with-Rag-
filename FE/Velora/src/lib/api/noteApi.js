import client from './client'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

function toWebSocketBaseUrl() {
    if (API_BASE_URL.startsWith('http://')) {
        return API_BASE_URL.replace(/^http:\/\//, 'ws://')
    }

    if (API_BASE_URL.startsWith('https://')) {
        return API_BASE_URL.replace(/^https:\/\//, 'wss://')
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${API_BASE_URL}`
}

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

    capNhatQuyenChiaSe: (shareId, data) =>
        client.patch(`/note-shares/${shareId}`, data),

    huyChiaSe: (shareId) =>
        client.delete(`/note-shares/${shareId}`),

    layGhiChuDuocChiaSe: () =>
        client.get('/note-shares/shared-with-me'),
    
    taoSoDo: (id, payload) => client.post(`/notes/${id}/diagram`, payload),

    layPhienBan: (id) =>
        client.get(`/notes/${id}/versions`),

    khoiPhucPhienBan: (id, versionId) =>
        client.post(`/notes/${id}/versions/${versionId}/restore`),

    taoRealtimeUrl: (id, token) =>
        `${API_BASE_URL}/notes/${id}/events?token=${encodeURIComponent(token)}`,

    taoCollabUrl: (id, token) =>
        `${toWebSocketBaseUrl()}/notes/${id}/collab?token=${encodeURIComponent(token)}`,
}

export default noteApi
