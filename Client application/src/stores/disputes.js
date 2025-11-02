import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useDisputeStore = defineStore('disputes', () => {
  const disputes = ref([])
  const selectedDisputeId = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({
    status: 'all',
    roomId: null,
    priority: 'all'
  })

  const orderedDisputes = computed(() => {
    return [...disputes.value].sort((a, b) => {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      if (priorityA !== priorityB) {
        return priorityB - priorityA
      }

      const timeA = new Date(a.created_at || 0).getTime()
      const timeB = new Date(b.created_at || 0).getTime()
      return timeA - timeB
    })
  })

  const selectedDispute = computed(() => disputes.value.find(item => item.id === selectedDisputeId.value) || null)

  const summary = computed(() => {
    const pendingCount = disputes.value.filter(item => item.status === 'pending').length
    const processingCount = disputes.value.filter(item => item.status === 'processing').length
    const resolvedCount = disputes.value.filter(item => item.status === 'resolved').length
    const rejectedCount = disputes.value.filter(item => item.status === 'rejected').length

    return {
      total: disputes.value.length,
      pending: pendingCount,
      processing: processingCount,
      resolved: resolvedCount,
      rejected: rejectedCount
    }
  })

  const setDisputes = (disputeList) => {
    disputes.value = Array.isArray(disputeList) ? disputeList : []
  }

  const upsertDispute = (dispute) => {
    const index = disputes.value.findIndex(item => item.id === dispute.id)
    if (index >= 0) {
      disputes.value.splice(index, 1, { ...disputes.value[index], ...dispute })
    } else {
      disputes.value.push(dispute)
    }
  }

  const removeDispute = (disputeId) => {
    disputes.value = disputes.value.filter(item => item.id !== disputeId)
    if (selectedDisputeId.value === disputeId) {
      selectedDisputeId.value = null
    }
  }

  const setSelectedDisputeId = (disputeId) => {
    selectedDisputeId.value = disputeId
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
    disputes,
    orderedDisputes,
    selectedDispute,
    selectedDisputeId,
    summary,
    filters,
    loading,
    error,
    setDisputes,
    upsertDispute,
    removeDispute,
    setSelectedDisputeId,
    setFilters,
    setLoading,
    setError
  }
})
