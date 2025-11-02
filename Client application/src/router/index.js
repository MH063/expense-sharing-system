import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import NotFound from '@/views/NotFound.vue'
import Login from '@/views/auth/Login.vue'
import Register from '@/views/auth/Register.vue'
import Profile from '@/views/auth/Profile.vue'
import Notifications from '@/views/notifications/NotificationCenter.vue'
import RoomDashboard from '@/views/rooms/RoomDashboard.vue'
import RoomDetail from '@/views/rooms/RoomDetail.vue'
import RoomInvitations from '@/views/rooms/RoomInvitations.vue'
import ExpenseDashboard from '@/views/expenses/ExpenseDashboard.vue'
import ExpenseDetail from '@/views/expenses/ExpenseDetail.vue'
import ExpenseCreate from '@/views/expenses/ExpenseCreate.vue'
import BillDashboard from '@/views/bills/BillDashboard.vue'
import BillDetail from '@/views/bills/BillDetail.vue'
import BillPayment from '@/views/bills/BillPayment.vue'
import ReviewDashboard from '@/views/reviews/ReviewDashboard.vue'
import ReviewDetail from '@/views/reviews/ReviewDetail.vue'
import DisputeDashboard from '@/views/disputes/DisputeDashboard.vue'
import DisputeDetail from '@/views/disputes/DisputeDetail.vue'
import AnalyticsDashboard from '@/views/analytics/AnalyticsDashboard.vue'
import Forbidden from '@/views/Forbidden.vue'
import { createAuthGuard } from './guards'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/auth/login',
    name: 'Login',
    component: Login,
    meta: { layout: 'auth' }
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: Register,
    meta: { layout: 'auth' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
    meta: { requiresAuth: true }
  },
  {
    path: '/rooms',
    name: 'RoomDashboard',
    component: RoomDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/rooms/:roomId',
    name: 'RoomDetail',
    component: RoomDetail,
    meta: { requiresAuth: true },
    props: true
  },
  {
    path: '/rooms/:roomId/invitations',
    name: 'RoomInvitations',
    component: RoomInvitations,
    meta: { requiresAuth: true }
  },
  {
    path: '/expenses',
    name: 'ExpenseDashboard',
    component: ExpenseDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/expenses/create',
    name: 'ExpenseCreate',
    component: ExpenseCreate,
qମ meta: { requiresAuth: true }
  },
  {
    path: '/expenses/:expenseId',
    name: 'ExpenseDetail',
    component: ExpenseDetail,
    meta: { requiresAuth: true },
    props: true
  },
  {
    path: '/bills',
    name: 'BillDashboard',
    component: BillDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/bills/:billId',
    name: 'BillDetail',
    component: BillDetail,
    meta: { requiresAuth: true },
    props: true
  },
  {
    path: '/bills/:billId/payment',
    name: 'BillPayment',
    component: BillPayment,
    meta: { requiresAuth: true },
    props: true
  },
  {
    path: '/reviews',
    name: 'ReviewDashboard',
    component: ReviewDashboard,
    meta: { requiresAuth: true, allowedRoles: ['admin', 'room_leader', 'payer'] }
  },
  {
    path: '/reviews/:reviewId',
    name: 'ReviewDetail',
    component: ReviewDetail,
    meta: { requiresAuth: true, allowedRoles: ['admin', 'room_leader', 'payer'] },
    props: true
  },
  {
    path: '/disputes',
    name: 'DisputeDashboard',
    component: DisputeDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/disputes/:disputeId',
    name: 'DisputeDetail',
    component: DisputeDetail,
    meta: { requiresAuth: true },
    props: true
  },
  {
    path: '/analytics',
    name: 'AnalyticsDashboard',
    component: AnalyticsDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: Forbidden
  },
  {
    path: '/404',
    name: 'NotFound',
    component: NotFound
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

createAuthGuard(router)

export default router