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
    getAll:   (params)     => client.get('/notes', { params }),
    getById:  (id)         => client.get(`/notes/${id}`),
    create:     (data)       => client.post('/notes', data),
    update:    (id, data)   => client.put(`/notes/${id}`, data),
    remove:        (id)         => client.delete(`/notes/${id}`),
    mark:    (id)         => client.patch(`/notes/${id}/bookmark`),
    improveWithAi: (id, data)   => client.post(`/notes/${id}/ai`, data),

    exportPdf:    (id)         => client.get(`/notes/${id}/export/pdf`, {
        responseType: 'blob',
    }),

    exportWord:   (id)         => client.get(`/notes/${id}/export/docx`, {
        responseType: 'blob',
    }),

    share: (noteId, data) =>
        client.post(`/note-shares/notes/${noteId}`, data),

    getShares: (noteId) =>
        client.get(`/note-shares/notes/${noteId}`),

    updateSharePermission: (shareId, data) =>
        client.patch(`/note-shares/${shareId}`, data),

    revokeShare: (shareId) =>
        client.delete(`/note-shares/${shareId}`),

    getSharedNotes: () =>
        client.get('/note-shares/shared-with-me'),
    
    createDiagram: (id, payload) => client.post(`/notes/${id}/diagram`, payload),

    getVersions: (id) =>
        client.get(`/notes/${id}/versions`),

    restoreVersion: (id, versionId) =>
        client.post(`/notes/${id}/versions/${versionId}/restore`),

    createRealtimeUrl: (id, token) =>
        `${API_BASE_URL}/notes/${id}/events?token=${encodeURIComponent(token)}`,

    createCollaborationUrl: (id, token) =>
        `${toWebSocketBaseUrl()}/notes/${id}/collab?token=${encodeURIComponent(token)}`,
}

export default noteApi
