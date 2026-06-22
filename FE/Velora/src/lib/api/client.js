import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
})

const refreshClient = axios.create({
    baseURL: API_BASE_URL,
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
        const original = err.config || {}

        const isAuthRequest =
            original.url?.includes('/auth/login') ||
            original.url?.includes('/auth/register') ||
            original.url?.includes('/auth/refresh')

        if (err.response?.status === 401 && !original._retry && !isAuthRequest) {
            original._retry = true

            try {
                const refreshToken = localStorage.getItem('velora_refresh')
                if (!refreshToken) throw new Error('Missing refresh token')

                const { data } = await refreshClient.post('/auth/refresh', { refreshToken })

                localStorage.setItem('velora_token', data.data.accessToken)
                localStorage.setItem('velora_refresh', data.data.refreshToken)

                original.headers = original.headers || {}
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