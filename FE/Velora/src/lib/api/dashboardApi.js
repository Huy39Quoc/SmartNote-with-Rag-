import client from './client'

const dashboardApi = {
    getLearningProgress: () => client.get('/dashboard/study-progress'),
}

export default dashboardApi