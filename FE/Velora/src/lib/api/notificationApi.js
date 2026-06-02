import client from './client'

const notificationApi = {
    layTatCa: (params) => client.get('/notifications', { params }),
    demChuaDoc: () => client.get('/notifications/unread-count'),
    danhDauDaDoc: (id) => client.patch(`/notifications/${id}/read`),
    danhDauTatCaDaDoc: () => client.patch('/notifications/read-all'),
}

export default notificationApi