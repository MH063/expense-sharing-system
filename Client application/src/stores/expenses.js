import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useExpenseStore = defineStore('expenses', () => {
  const expenses = ref([])
  const selectedExpenseId = ref(null)
  const filters = ref({
    roomId: null,
    status: 'all',
    category: 'all',
    dateRange: null
  })
  const loading = ref(false)
  const error = ref(null)

  const orderedExpenses = computed(() => {
    return [...expenses.value].sort((a, b) => {
      const timeA = new Date(a.incurred_at || a.created_at || 0).getTime()
      const timeB = new Date(b.incurred_at || b.created_at || 0).getTime()
      return timeB - timeA
    })
  })

  const selectedExpense = computed(() => {
    return expenses.value.find(expense => expense.id === selectedExpenseId.value) || null
  })

  const summary = computed(() => {
    const totalAmount = expenses.value.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const pendingAmount = expenses.value
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const approvedAmount = expenses.value
      .filter(item => item.status === 'approved')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)

    return {
      totalAmount,
      pendingAmount,
      approvedAmount,
      count: expenses.value.length
    }
  })

  const setExpenses = (expenseList) => {
    expenses.value = Array.isArray(expenseList) ? expenseList : []
  }

  const upsertExpense = (expense) => {
    const index = expenses.value.findIndex(item => item.id === expense.id)
    if (index >= 0) {
      expenses.value.splice(index, 1, { ...expenses.value[index], ...expense })
    } else {
      expenses.value.unshift(expense)
    }
  }

  const removeExpense = (expenseId) => {
    expenses.value = expenses.value.filter(expense => expense.id !== expenseId)
    if (selectedExpenseId.value === expenseId) {
      selectedExpenseId.value = null
    }
  }

  const setFilters = (newFilters) => {
    filters.value = {
      ...filters.value,
      ...newFilters
    }
  }

  const setSelectedExpenseId = (expenseId) => {
    selectedExpenseId.value = expenseId
  }

  const setLoading = (value) => {
    loading.value = value
  }

  const setError = (value) => {
    error.value = value
  }

  return {
    expenses,
    orderedExpenses,
    selectedExpense,
    selectedExpenseId,
    summary,
    filters,
    loading,
    error,
    setExpenses,
    upsertExpense,
    removeExpense,
    setFilters,
    setSelectedExpenseId,
    setLoading,
    setError
  }
})
