import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const accessToken = ref(null)
  const refreshToken = ref(null)
  const tokenExpiry = ref(null)
  const roles = ref([])
  const permissions = ref([])

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const hasRefreshToken = computed(() => Boolean(refreshToken.value))

  const hasRole = (role) => roles.value.includes(role)
  const hasPermission = (permission) => permissions.value.includes(permission)

  const setSession = ({ user, tokens, permissions: newPermissions }) => {
    currentUser.value = user
    accessToken.value = tokens?.accessToken || null
    refreshToken.value = tokens?.refreshToken || null
    tokenExpiry.value = tokens?.accessTokenExpiresAt || null
    roles.value = Array.isArray(user?.roles) ? user.roles : []
    permissions.value = Array.isArray(newPermissions) ? newPermissions : []
  }

  const clearSession = () => {
    currentUser.value = null
    accessToken.value = null
    refreshToken.value = null
    tokenExpiry.value = null
    roles.value = []
    permissions.value = []
  }

  const shouldRefreshToken = computed(() => {
    if (!tokenExpiry.value) {
      return false
    }

    const expiration = new Date(tokenExpiry.value).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    return expiration - now <= fiveMinutes && hasRefreshToken.value
  })

  return {
    currentUser,
    accessToken,
    refreshToken,
    tokenExpiry,
    roles,
    permissions,
    isAuthenticated,
    hasRefreshToken,
    hasRole,
    hasPermission,
    setSession,
    clearSession,
    shouldRefreshToken
  }
})
