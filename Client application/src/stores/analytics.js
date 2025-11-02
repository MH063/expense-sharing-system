import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAnalyticsStore = defineStore('analytics', () => {
  const dashboardMetrics = ref({
    expenseTotal: 0,
    paidAmount: 0,
    pendingAmount: 0,
    memberCount: 0,
    disputeCount: 0,
    reviewPendingCount: 0,
    paymentSuccessRate: 0,
    expenseTrend: [],
    categoryDistribution: []
  })

  const expenseTrend = computed(() => dashboardMetrics.value.expenseTrend)
  const categoryDistribution = computed(() => dashboardMetrics.value.categoryDistribution)

  const setMetrics = (metrics) => {
    dashboardMetrics.value = { ...dashboardMetrics.value, ...metrics }
  }

  return {
    dashboardMetrics,
    expenseTrend,
    categoryDistribution,
    setMetrics
  }
})
