import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useReviewStore = defineStore('reviews', () => {
  const reviewQueues = ref([])
  const selectedReviewId = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({
    level: 'all',
    status: 'all',
    roomId: null
  })

  const orderedReviews = computed(() => {
    return [...reviewQueues.value].sort((a, b) => {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      if (priorityA !== priorityB) {
        return priorityB - priorityA
      }

      const timeA = new Date(a.submitted_at || a.created_at || 0).getTime()
      const timeB = new Date(b.submitted_at || b.created_at || 0).getTime()
      return timeA - timeB
    })
  })

  const selectedReview = computed(() => reviewQueues.value.find(item => item.id === selectedReviewId.value) || null)

  const summary = computed(() => {
    const pendingCount = reviewQueues.value.filter(item => item.status === 'pending').length
    const processingCount = reviewQueues.value.filter(item => item.status === 'processing').length
    const completedCount = reviewQueues.value.filter(item => item.status === 'completed').length

    return {
      total: reviewQueues.value.length,
      pending: pendingCount,
      processing: processingCount,
      completed: completedCount
    }
  })

  const setReviewQueues = (queueList) => {
    reviewQueues.value = Array.isArray(queueList) ? queueList : []
  }

  const upsertReview = (review) => {
    const index = reviewQueues.value.findIndex(item => item.id === review.id)
    if (index >= 0) {
      reviewQueues.value.splice(index, 1, { ...reviewQueues.value[index], ...review })
    } else {
      reviewQueues.value.push(review)
    }
  }

  const removeReview = (reviewId) => {
    reviewQueues.value = reviewQueues.value.filter(item => item.id !== reviewId)
    if (selectedReviewId.value === reviewId) {
      selectedReviewId.value = null
    }
  }

  const setSelectedReviewId = (reviewId) => {
    selectedReviewId.value = reviewId
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
    reviewQueues,
    orderedReviews,
    selectedReview,
    selectedReviewId,
    summary,
    filters,
    loading,
    error,
    setReviewQueues,
    upsertReview,
    removeReview,
    setSelectedReviewId,
    setFilters,
    setLoading,
    setError
  }
})
