import client from './client'
const authApi = {
  register:           (data) => client.post('/auth/register', data),
  login:         (data) => client.post('/auth/login', data),
  logout:         (data) => client.post('/auth/logout', data),
  refreshToken:      (data) => client.post('/auth/refresh', data),
  changePassword:       (data) => client.post('/auth/change-password', data),
  getMyProfile:   ()     => client.get('/users/me'),
  updateProfile:  (data) => client.put('/users/me', data),
}
export default authApi
