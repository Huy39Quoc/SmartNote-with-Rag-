import client from './client'

const documentApi = {
    getAll: (params) =>
        client.get('/documents', { params }),

    getById: (id) =>
        client.get(`/documents/${id}`),

    getFile: (id) =>
        client.get(`/documents/${id}/file`, { responseType: 'blob' }),

    upload: (file, onProgress) => {
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

    analyzeAudio: (id, data) =>
        client.post(`/documents/${id}/transcribe`, data || {}),

    analyze: (id, data) =>
        client.post(`/documents/${id}/analyze`, data || {}),

    ask: (id, data) =>
        client.post(`/documents/${id}/ask`, data),

    getChatHistory: (id) =>
        client.get(`/documents/${id}/chat`),

    clearChatHistory: (id) =>
        client.delete(`/documents/${id}/chat`),

    remove: (id) =>
        client.delete(`/documents/${id}`),

    reprocess: (id) =>
        client.post(`/documents/${id}/reprocess`),

    share: (documentId, data) =>
        client.post(`/document-shares/documents/${documentId}`, data),

    getShares: (documentId) =>
        client.get(`/document-shares/documents/${documentId}`),

    revokeShare: (shareId) =>
        client.delete(`/document-shares/${shareId}`),

    getSharedDocuments: () =>
        client.get('/document-shares/shared-with-me'),
}

export default documentApi
