import client from './client'

const dashboardApi = {
    layTienDoHocTap: () => client.get('/dashboard/study-progress'),
}

export default dashboardApi