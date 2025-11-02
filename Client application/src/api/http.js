import axios from 'axios'
import { useAuthStore } from '@/stores'

const http = axios.create({
  baseURL: '/api',
  timeout: 15000
})

http.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authStore = useAuthStore()
    if (error.response?.status === 401 && authStore.hasRefreshToken) {
      try {
        await authStore.refreshSession()
        const retryConfig = { ...error.config }
        retryConfig.headers.Authorization = `Bearer ${authStore.accessToken}`
        return http.request(retryConfig)
      } catch (refreshError) {
        authStore.clearSession()
      }
    }
    return Promise.reject(error)
  }
)

export default http
