import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useBillStore = defineStore('bills', () => {
  const bills = ref([])
  const selectedBillId = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({
    roomId: null,
    status: 'all',
    dateRange: null
  })

  const orderedBills = computed(() => {
    return [...bills.value].sort((a, b) => {
      const timeA = new Date(a.billing_period_start || a.created_at || 0).getTime()
      const timeB = new Date(b.billing_period_start || b.created_at || 0).getTime()
      return timeB - timeA
    })
  })

  const selectedBill = computed(() => bills.value.find(bill => bill.id === selectedBillId.value) || null)

  const summary = computed(() => {
    const totalAmount = bills.value.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
    const pendingAmount = bills.value
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.total_amount || 0), 0)

    const paidAmount = bills.value
      .filter(item => item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.total_amount || 0), 0)

    return {
      totalAmount,
      pendingAmount,
      paidAmount,
      count: bills.value.length
    }
  })

  const setBills = (billList) => {
    bills.value = Array.isArray(billList) ? billList : []
  }

  const upsertBill = (bill) => {
    const index = bills.value.findIndex(item => item.id === bill.id)
    if (index >= 0) {
      bills.value.splice(index, 1, { ...bills.value[index], ...bill })
    } else {
      bills.value.unshift(bill)
    }
  }

  const removeBill = (billId) => {
    bills.value = bills.value.filter(bill => bill.id !== billId)
    if (selectedBillId.value === billId) {
      selectedBillId.value = null
    }
  }

  const setSelectedBillId = (billId) => {
    selectedBillId.value = billId
  }

  const setFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const setLoading = (value) => {
    loading.value = value
  }

  const setError = (value) => {
    error.value = value
  }

  return {
    bills,
    orderedBills,
    selectedBill,
    selectedBillId,
    summary,
    filters,
    loading,
    error,
    setBills,
    upsertBill,
    removeBill,
    setSelectedBillId,
    setFilters,
    setLoading,
    setError
  }
})
