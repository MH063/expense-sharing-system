import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import { setRouterStore } from './router'
import { useAuthStore } from './stores/auth'
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

// 初始化权限系统
authStore.$onAction(({ name, after }) => {
  if (name === 'clearSession') {
    after(() => {
      console.log('用户已登出，重定向到登录页')
      if (window.location.pathname !== '/auth/login') {
        router.push('/auth/login')
      }
    })
  }
})

app.mount('#app')