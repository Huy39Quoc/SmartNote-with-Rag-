import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(config => {
  const token = localStorage.getItem('velora_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('velora_refresh')
        if (!refreshToken) throw new Error()
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        localStorage.setItem('velora_token', data.data.accessToken)
        localStorage.setItem('velora_refresh', data.data.refreshToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return client(original)
      } catch {
        localStorage.removeItem('velora_token')
        localStorage.removeItem('velora_refresh')
        window.location.href = '/dang-nhap'
      }
    }
    return Promise.reject(err)
  }
)

export default client
