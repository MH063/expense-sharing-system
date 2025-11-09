import { createRouter, createWebHistory } from 'vue-router'
import { checkAuth, initAuth } from '../utils/auth'

// 初始化权限验证
initAuth()

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'AdminHome',
    component: () => import('../views/AdminHome.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/docs',
    name: 'DocsManagement',
    component: () => import('../views/docs/DocsManagement.vue'),
    children: [
      {
        path: 'requirements',
        name: 'RequirementsDoc',
        component: () => import('../views/docs/RequirementsDoc.vue')
      },
      {
        path: 'database',
        name: 'DatabaseDoc',
        component: () => import('../views/docs/DatabaseDoc.vue')
      },
      {
            path: 'versions',
            name: 'DocVersions',
            component: () => import('../views/docs/DocVersions.vue')
          },
          {
            path: 'search',
            name: 'DocSearch',
            component: () => import('../views/docs/DocSearch.vue')
          },
      {
        path: 'system',
        name: 'SystemDoc',
        component: () => import('@/views/docs/SystemDoc.vue')
      },
      {
        path: 'versions',
        name: 'DocVersions',
        component: () => import('@/views/docs/DocVersions.vue')
      }
    ]
  },
  {
    path: '/system',
    name: 'System',
    redirect: '/system/users',
    component: () => import('../views/AdminHome.vue'),
    children: [
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('../views/system/UserManagement.vue')
      },
      {
        path: 'roles',
        name: 'RoleAssignment',
        component: () => import('../views/system/RoleAssignment.vue')
      },
      {
        path: 'dorms',
        name: 'DormManagement',
        component: () => import('../views/system/DormManagement.vue')
      },
      {
        path: 'expense',
        name: 'ExpenseMonitor',
        component: () => import('../views/system/ExpenseMonitor.vue')
      },
      {
        path: 'abnormal',
        name: 'AbnormalExpense',
        component: () => import('../views/system/AbnormalExpense.vue')
      }
    ]
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('../views/AdminHome.vue'),
    redirect: '/review/process',
    meta: { title: '审核与争议管理', icon: 'Document' },
    children: [
      {
        path: 'process',
        name: 'ReviewProcess',
        component: () => import('../views/review/ReviewMonitor.vue'),
        meta: { title: '审核流程' }
      },
      {
        path: 'disputes',
        name: 'DisputeCases',
        component: () => import('../views/review/DisputeManagement.vue'),
        meta: { title: '争议管理' }
      },
      {
        path: 'progress',
        name: 'ProgressTracking',
        component: () => import('../views/review/ProgressTracking.vue'),
        meta: { title: '处理进度跟踪' }
      }
    ]
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('../views/AdminHome.vue'),
    redirect: '/config/system',
    meta: { title: '系统配置与数据统计', icon: 'Setting' },
    children: [
      {
        path: 'system',
        name: 'SystemConfig',
        component: () => import('../views/config/SystemConfig.vue'),
        meta: { title: '系统参数配置' }
      },
      {
        path: 'rules',
        name: 'SharingRules',
        component: () => import('../views/config/SharingRules.vue'),
        meta: { title: '分摊规则管理' }
      },
      {
        path: 'templates',
        name: 'NotificationTemplates',
        component: () => import('../views/config/NotificationTemplates.vue'),
        meta: { title: '通知模板配置' }
      },
      {
        path: 'statistics',
        name: 'SystemStatistics',
        component: () => import('../views/config/SystemStatistics.vue'),
        meta: { title: '系统使用统计' }
      }
    ]
  },
  {
    path: '/test',
    name: 'TestPage',
    component: () => import('../views/TestPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫 - 处理权限验证
router.beforeEach((to, from, next) => {
  console.log('路由导航:', to.path)
  
  // 检查路由是否需要身份验证
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)
  
  // 如果是登录页面，且用户已登录，则重定向到首页
  if (to.path === '/login' && checkAuth()) {
    next('/')
    return
  }
  
  // 如果路由需要身份验证且用户未登录，则重定向到登录页面
  if (requiresAuth && !checkAuth()) {
    console.log('用户未登录，重定向到登录页')
    next('/login')
    return
  }
  
  // 其他情况允许访问
  console.log('权限验证通过，允许访问')
  next()
})

export default router