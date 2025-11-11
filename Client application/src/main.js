import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import { setRouterStore } from './router'
import { useAuthStore } from './stores/auth'
import { useNotificationStore } from './stores/notifications'
import { permissionDirective } from './utils/permissions'

const app = createApp(App)

app.use(ElementPlus)
app.use(pinia)
app.use(router)

// 注册权限指令
app.directive('permission', permissionDirective)

// 获取store实例并设置到路由中
const authStore = useAuthStore()
setRouterStore(authStore)

// 初始化认证状态
authStore.initializeAuth()

// 初始化通知服务（全局WebSocket连接）
const notificationStore = useNotificationStore()
notificationStore.initialize()

// 监听认证状态变化，自动更新WebSocket认证令牌
authStore.$subscribe((mutation, state) => {
  if (mutation.events.key === 'accessToken' && state.accessToken) {
    console.log('🔑 认证令牌已更新，更新WebSocket认证')
    // 注意：这里使用延迟以确保令牌已完全更新
    setTimeout(() => {
      if (notificationStore.isConnected) {
        // 如果已连接，通知WebSocket服务更新令牌
        import('@/services/websocket-service').then(({ default: websocketService }) => {
          websocketService.updateAuthToken(state.accessToken)
        })
      }
    }, 100)
  }
})

// 初始化权限系统
authStore.$onAction(({ name, after }) => {
  if (name === 'clearSession') {
    after(() => {
      console.log('用户已登出，重定向到登录页')
      if (window.location.pathname !== '/auth/login') {
        router.push('/auth/login')
      }
      // 用户登出时，断开WebSocket连接
      notificationStore.disconnect()
    })
  }
})

app.mount('#app')