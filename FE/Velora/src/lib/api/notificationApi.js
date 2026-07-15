import client from './client'

const notificationApi = {
    getAll: (params) => client.get('/notifications', { params }),
    unreadCount: () => client.get('/notifications/unread-count'),
    markAsRead: (id) => client.patch(`/notifications/${id}/read`),
    markAllAsRead: () => client.patch('/notifications/read-all'),
}

export default notificationApi