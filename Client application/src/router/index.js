import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import UserGuide from '@/views/UserGuide.vue'
import Dashboard from '@/views/Dashboard.vue'
import NotFound from '@/views/NotFound.vue'
import Login from '@/views/auth/Login.vue'
import Register from '@/views/auth/Register.vue'
import ForgotPassword from '@/views/auth/ForgotPassword.vue'
import Profile from '@/views/auth/Profile.vue'
import Notifications from '@/views/NotificationsPage.vue'
import RoomDashboard from '@/views/rooms/RoomDashboard.vue'
import RoomDetail from '@/views/rooms/RoomDetail.vue'
import RoomCreate from '@/views/rooms/RoomCreate.vue'
import RoomInvitations from '@/views/rooms/RoomInvitations.vue'
import ExpenseDashboard from '@/views/expenses/ExpenseDashboard.vue'
import ExpenseDetail from '@/views/expenses/ExpenseDetail.vue'
import ExpenseCreate from '@/views/expenses/ExpenseCreate.vue'
import BillDashboard from '@/views/bills/BillDashboard.vue'
import BillDetail from '@/views/bills/BillDetail.vue'
import BillPayment from '@/views/bills/BillPayment.vue'
import BillList from '@/views/bills/BillList.vue'
import BillForm from '@/views/bills/BillForm.vue'
import QrCodeManagement from '@/views/QrCodeManagement.vue'
import ScanPayment from '@/views/ScanPayment.vue'
import PaymentHistory from '@/views/PaymentHistory.vue'
import InviteCodeManagement from '@/views/InviteCodeManagement.vue'
import JoinRoom from '@/views/JoinRoom.vue'
import SpecialPaymentRules from '@/views/SpecialPaymentRules.vue'
import PaymentTransfers from '@/views/PaymentTransfers.vue'
import PaymentTransferList from '@/views/bills/PaymentTransferList.vue'
import ReviewDashboard from '@/views/reviews/ReviewDashboard.vue'
import ReviewDetail from '@/views/reviews/ReviewDetail.vue'
import DisputeDashboard from '@/views/disputes/DisputeDashboard.vue'
import DisputeDetail from '@/views/disputes/DisputeDetail.vue'
import AnalyticsDashboard from '@/views/analytics/AnalyticsDashboard.vue'
import NotificationCenter from '@/views/notifications/NotificationCenter.vue'
import Settings from '@/views/Settings.vue'
import ActivitiesList from '@/views/activities/ActivitiesList.vue'
import Forbidden from '@/views/Forbidden.vue'
import PermissionTest from '@/views/admin/PermissionTest.vue'
import { createAuthGuard } from './guards'
import { createPermissionGuard } from './permissionGuard'
import { PERMISSIONS, ROLES } from '@/utils/permissions'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: '仪表盘',
      requiresAuth: true
    }
  },
  {
    path: '/user-guide',
    name: 'UserGuide',
    component: UserGuide,
    meta: {
      title: '使用指南',
      requiresAuth: false
    }
  },
  {
    path: '/auth/login',
    name: 'Login',
    component: Login,
    meta: { 
      layout: 'auth',
      requiresGuest: true // 只有未登录用户可以访问
    }
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: Register,
    meta: { 
      layout: 'auth',
      requiresGuest: true // 只有未登录用户可以访问
    }
  },
  {
    path: '/auth/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { 
      layout: 'auth',
      requiresGuest: true // 只有未登录用户可以访问
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.PROFILE_VIEW
    }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
    meta: { 
      requiresAuth: true
    }
  },
  {
    path: '/notifications/center',
    name: 'NotificationCenter',
    component: NotificationCenter,
    meta: { 
      requiresAuth: true
    }
  },
  {
    path: '/rooms',
    name: 'RoomDashboard',
    component: RoomDashboard,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.ROOM_VIEW
    }
  },
  {
    path: '/rooms/create',
    name: 'RoomCreate',
    component: RoomCreate,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.ROOM_CREATE
    }
  },
  {
    path: '/rooms/create/payment-rules',
    name: 'CreateRoomPaymentRules',
    component: SpecialPaymentRules,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.ROOM_CREATE
    }
  },
  {
    path: '/rooms/:roomId',
    name: 'RoomDetail',
    component: RoomDetail,
    meta: { 
      requiresAuth: true,
      requiresRoomPermission: PERMISSIONS.ROOM_VIEW
    },
    props: true
  },
  {
    path: '/rooms/:roomId/invitations',
    name: 'RoomInvitations',
    component: RoomInvitations,
    meta: { 
      requiresAuth: true,
      requiresRoomPermission: PERMISSIONS.ROOM_INVITE
    }
  },
  {
    path: '/expenses',
    name: 'ExpenseDashboard',
    component: ExpenseDashboard,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.EXPENSE_VIEW
    }
  },
  {
    path: '/expenses/create',
    name: 'ExpenseCreate',
    component: ExpenseCreate,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.EXPENSE_CREATE
    }
  },
  {
    path: '/expenses/:expenseId',
    name: 'ExpenseDetail',
    component: ExpenseDetail,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.EXPENSE_VIEW
    },
    props: true
  },
  {
    path: '/bills',
    name: 'BillDashboard',
    component: BillDashboard,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_VIEW
    }
  },
  {
    path: '/bills/list',
    name: 'BillList',
    component: BillList,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_VIEW
    }
  },
  {
    path: '/bills/create',
    name: 'BillCreate',
    component: BillForm,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_CREATE
    }
  },
  {
    path: '/bills/:billId',
    name: 'BillDetail',
    component: BillDetail,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_VIEW
    },
    props: true
  },
  {
    path: '/bills/:billId/edit',
    name: 'BillEdit',
    component: BillForm,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_EDIT
    },
    props: true
  },
  {
    path: '/bills/:billId/payment',
    name: 'BillPayment',
    component: BillPayment,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_PAY
    },
    props: true
  },
  {
    path: '/qr-codes',
    name: 'QrCodeManagement',
    component: QrCodeManagement,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_PAY
    }
  },
  {
    path: '/payments/:billId/scan',
    name: 'ScanPayment',
    component: ScanPayment,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_PAY
    },
    props: true
  },
  {
    path: '/payments/history',
    name: 'PaymentHistory',
    component: PaymentHistory,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_PAY
    }
  },
  {
    path: '/invite-codes',
    name: 'InviteCodeManagement',
    component: InviteCodeManagement,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.ROOM_INVITE
    }
  },
  {
    path: '/join-room',
    name: 'JoinRoom',
    component: JoinRoom,
    meta: { 
      requiresAuth: true
    }
  },
  {
    path: '/rooms/:roomId/payment-rules',
    name: 'SpecialPaymentRules',
    component: SpecialPaymentRules,
    meta: { 
      requiresAuth: true,
      requiresRoomPermission: PERMISSIONS.ROOM_EDIT
    },
    props: true
  },
  {
    path: '/bills/:billId/transfers',
    name: 'PaymentTransfers',
    component: PaymentTransferList,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.BILL_VIEW
    },
    props: true
  },
  {
    path: '/reviews',
    name: 'ReviewDashboard',
    component: ReviewDashboard,
    meta: { 
      requiresAuth: true, 
      requiresPermission: PERMISSIONS.ROOM_EDIT
    }
  },
  {
    path: '/reviews/:reviewId',
    name: 'ReviewDetail',
    component: ReviewDetail,
    meta: { 
      requiresAuth: true, 
      requiresPermission: PERMISSIONS.ROOM_EDIT
    },
    props: true
  },
  {
    path: '/disputes',
    name: 'DisputeDashboard',
    component: DisputeDashboard,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.EXPENSE_VIEW
    }
  },
  {
    path: '/disputes/:disputeId',
    name: 'DisputeDetail',
    component: DisputeDetail,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.EXPENSE_VIEW
    },
    props: true
  },
  {
    path: '/analytics',
    name: 'AnalyticsDashboard',
    component: AnalyticsDashboard,
    meta: { 
      requiresAuth: true,
      requiresPermission: PERMISSIONS.EXPENSE_VIEW
    }
  },
  {
    path: '/activities',
    name: 'ActivitiesList',
    component: ActivitiesList,
    meta: { 
      title: '活动列表',
      requiresAuth: true,
      requiresPermission: PERMISSIONS.EXPENSE_VIEW
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { 
      requiresAuth: true
    }
  },
  {
    path: '/admin/permissions',
    name: 'PermissionTest',
    component: PermissionTest,
    meta: {
      title: '权限测试',
      requiresAuth: true,
      requiresPermission: PERMISSIONS.ADMIN_ACCESS
    }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: Forbidden,
    meta: {
      title: '访问被拒绝',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: '页面未找到',
      requiresAuth: false
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 设置路由守卫的store
let authStore = null

export function setRouterStore(store) {
  authStore = store
}

// 创建认证守卫
createAuthGuard(router)

// 创建权限守卫
createPermissionGuard(router, authStore)

// 导出获取当前store的方法
export function getCurrentAuthStore() {
  return authStore
}

export default router