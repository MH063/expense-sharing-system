import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

export { useAuthStore } from './auth'
export { useNotificationStore } from './notifications'
export { useRoomStore } from './rooms'
export { useExpenseStore } from './expenses'
export { useBillStore } from './bills'
export { useReviewStore } from './reviews'
export { useDisputeStore } from './disputes'
export { useAnalyticsStore } from './analytics'
