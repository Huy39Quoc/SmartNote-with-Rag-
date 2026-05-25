import client from './client'
const authApi = {
  dangKy:           (data) => client.post('/auth/register', data),
  dangNhap:         (data) => client.post('/auth/login', data),
  dangXuat:         (data) => client.post('/auth/logout', data),
  lamMoiToken:      (data) => client.post('/auth/refresh', data),
  doiMatKhau:       (data) => client.post('/auth/change-password', data),
  layThongTinToi:   ()     => client.get('/users/me'),
  capNhatThongTin:  (data) => client.put('/users/me', data),
}
export default authApi
