import client from './client'

const knowledgeApi = {
    getAll:    ()          => client.get('/knowledge'),
    getById:   (id)        => client.get(`/knowledge/${id}`),
    create:      (data)      => client.post('/knowledge', data),
    update:     (id, data)  => client.put(`/knowledge/${id}`, data),
    remove:         (id)        => client.delete(`/knowledge/${id}`),
    classify:    (data)      => client.post('/knowledge/classify', data),
    reclassify: ()          => client.post('/knowledge/reclassify'),

    submitClassificationFeedback: (data) =>
        client.post('/knowledge/classification-feedback', data),

    getFeedbackStats: () =>
        client.get('/knowledge/classification-feedback/stats'),

    getGraph: () =>
        client.get('/knowledge/graph'),
}

export default knowledgeApi
