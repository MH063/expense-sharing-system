import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { initAuth } from './utils/auth'
import performanceMonitor from './utils/performanceMonitor'
import lazyDirective, { install as installLazyDirective } from './directives/lazyLoad'
import './assets/styles/performance.css'

// 初始化权限验证
initAuth()

// 启动性能监控
if (import.meta.env.DEV) {
  performanceMonitor.start()
  
  // 在开发环境下，定期打印性能报告
  setInterval(() => {
    performanceMonitor.printReport()
  }, 30000) // 每30秒打印一次
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)
app.use(router)

// 注册懒加载指令
installLazyDirective(app)

app.mount('#app')