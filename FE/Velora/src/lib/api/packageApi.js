import client from './client'

const packageApi = {

    getActivePackages: () => client.get('/packages/active'),

    purchaseServicePackage: (packageId, billingCycle = 'monthly') =>
        client.post(`/packages/buy/${packageId}?type=${billingCycle}`),

    createPackage: (data) => client.post('/admin/packages', data),

    updatePackage: (id, data) => client.put(`/admin/packages/${id}`, data),

    deletePackage: (id) => client.delete(`/admin/packages/${id}`)
}

export default packageApi
