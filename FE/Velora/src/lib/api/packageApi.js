import client from './client'

const packageApi = {
    // Đã xóa chữ /api thừa ở đầu các đường dẫn
    layDanhSachGoiHoatDong: () => client.get('/packages/active'),

    muaGoiDichVu: (packageId, billingCycle = 'monthly') =>
        client.post(`/packages/buy/${packageId}?type=${billingCycle}`),

    // Các API dành cho Quản trị viên (Admin)
    taoGoi: (data) => client.post('/admin/packages', data),

    capNhatGoi: (id, data) => client.put(`/admin/packages/${id}`, data),

    xoaGoi: (id) => client.delete(`/admin/packages/${id}`)
}

export default packageApi