import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '@/api/http'
import websocketClient from '@/utils/websocket-client'
import tokenManager from '@/utils/jwt-token-manager'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const accessToken = ref(null)
  const refreshToken = ref(null)
  const tokenExpiry = ref(null)
  const roles = ref([])
  const permissions = ref([])
  const isRefreshing = ref(false)
  const refreshPromise = ref(null)

  const isAuthenticated = computed(() => {
    const hasToken = Boolean(accessToken.value)
    const tokenValid = tokenManager.isTokenValid()
    
    console.log('认证状态检查:', {
      hasToken,
      tokenValid,
      accessToken: accessToken.value ? '存在' : '不存在',
      tokenStatus: tokenManager.checkTokenStatus()
    })
    
    return hasToken && tokenValid
  })
  
  const hasRefreshToken = computed(() => Boolean(refreshToken.value))
  
  const isTokenExpiringSoon = computed(() => {
    return tokenManager.isTokenExpiringSoon()
  })
  
  const tokenExpiresIn = computed(() => {
    return tokenManager.getTokenExpiresIn()
  })

  const hasRole = (role) => roles.value.includes(role)
  const hasPermission = (permission) => permissions.value.includes(permission)

  /**
   * 初始化认证状态
   * 从Token管理器恢复Token和用户信息
   */
  const initializeAuth = () => {
    try {
      // 初始化Token管理器
      tokenManager.init()
      
      // 获取当前用户名
      const currentUsername = tokenManager.getCurrentUser()
      
      // 从Token管理器获取Token
      const token = tokenManager.getToken()
      const refreshTkn = tokenManager.getRefreshToken()
      
      if (token) {
        accessToken.value = token
        
        // 解析Token获取用户信息
        const payload = tokenManager.parseToken(token)
        if (payload) {
          currentUser.value = {
            id: payload.sub,
            username: payload.username,
            roles: payload.roles || [],
            permissions: payload.permissions || [],
            roomId: payload.roomId
          }
          roles.value = Array.isArray(payload.roles) ? payload.roles : []
          permissions.value = Array.isArray(payload.permissions) ? payload.permissions : []
        } else {
          // 如果是模拟Token，创建默认用户信息
          if (token.startsWith('mock-jwt-token-')) {
            currentUser.value = {
              id: 1,
              username: currentUsername || 'user',
              name: '虚拟用户',
              email: 'user@example.com',
              avatar: 'https://picsum.photos/seed/user1/200/200.jpg',
              role: 'admin', // 设置为管理员角色，拥有所有权限
              roles: ['admin'],
              permissions: ['all'], // 设置为拥有所有权限
              roomId: 1,
              rooms: [
                {
                  id: 1,
                  name: '默认寝室',
                  role: 'owner'
                }
              ]
            }
            roles.value = ['admin']
            permissions.value = ['all']
          }
        }
        
        // 连接WebSocket
        connectWebSocket()
      }
      
      // 确保refreshToken正确赋值
      if (refreshTkn) {
        refreshToken.value = refreshTkn
        console.log('已从Token管理器加载刷新Token')
      } else {
        // 尝试从localStorage或sessionStorage直接获取刷新令牌
        const currentUser = tokenManager.getCurrentUser()
        const rememberMe = localStorage.getItem('remember_me') === 'true'
        const storage = rememberMe ? localStorage : sessionStorage
        const userRefreshTokenKey = currentUser ? `refresh_token_${currentUser}` : 'refresh_token'
        const directRefreshToken = storage.getItem(userRefreshTokenKey)
        
        if (directRefreshToken) {
          refreshToken.value = directRefreshToken
          tokenManager.setRefreshToken(directRefreshToken)
          console.log('从存储直接获取并设置刷新Token')
        } else {
          console.log('Token管理器和存储中都没有刷新Token')
        }
      }
      
      // 设置Token管理器的刷新回调
      tokenManager.setRefreshCallback(refreshTokens)
      
      console.log('认证状态初始化完成', {
        isAuthenticated: isAuthenticated.value,
        user: currentUser.value,
        hasRefreshToken: hasRefreshToken.value,
        tokenExpiresIn: tokenExpiresIn.value
      })
    } catch (error) {
      console.error('认证状态初始化失败:', error)
      clearSession()
    }
  }
  
  /**
   * 刷新Token
   * @returns {Promise} 刷新结果
   */
  const refreshTokens = async () => {
    // 如果已经在刷新中，返回现有的Promise
    if (isRefreshing.value && refreshPromise.value) {
      return refreshPromise.value
    }
    
    // 如果没有刷新Token，直接返回失败
    if (!refreshToken.value) {
      throw new Error('没有可用的刷新Token')
    }
    
    isRefreshing.value = true
    
    try {
      refreshPromise.value = http.post('/auth/refresh-token', {
        refreshToken: refreshToken.value
      })
      
      const response = await refreshPromise.value
      
      // 处理后端返回的数据结构 {success: true, data: {xxx: []}}
      if (response.data.success && response.data.data) {
        const { token: newAccessToken, refreshToken: newRefreshToken } = response.data.data
        
        // 获取当前用户名，确保Token刷新时使用正确的用户上下文
        const currentUsername = tokenManager.getCurrentUser()
        
        // 更新Token管理器，支持多用户
        tokenManager.setTokens({
          token: newAccessToken,
          refreshToken: newRefreshToken
        }, currentUsername)
        
        // 更新状态
        accessToken.value = newAccessToken
        
        if (newRefreshToken) {
          refreshToken.value = newRefreshToken
        }
        
        // 更新WebSocket认证令牌
        if (websocketClient.isConnected) {
          websocketClient.updateAuthToken(newAccessToken)
        }
        
        console.log('Token刷新成功')
        return { success: true }
      } else {
        throw new Error(response.data.message || 'Token刷新失败')
      }
    } catch (error) {
      console.error('Token刷新失败:', error)
      // 刷新失败，清除会话
      clearSession()
      throw error
    } finally {
      isRefreshing.value = false
      refreshPromise.value = null
    }
  }
  
  /**
   * 刷新会话
   * @returns {Promise} 刷新结果
   */
  const refreshSession = async () => {
    try {
      if (!tokenManager.getRefreshToken()) {
        throw new Error('无刷新令牌')
      }
      
      console.log('刷新会话中...')
      
      // 使用Token管理器刷新Token
      const newTokens = await tokenManager.refreshToken(async () => {
        const response = await http.post('/auth/refresh-token', {
          refreshToken: tokenManager.getRefreshToken()
        })
        
        // 处理后端返回的数据结构 {success: true, data: {xxx: []}}
        if (response.data.success && response.data.data) {
          return response.data.data
        } else {
          throw new Error(response.data.message || '刷新令牌失败')
        }
      })
      
      // 更新状态
      if (newTokens) {
        accessToken.value = newTokens.token
        refreshToken.value = newTokens.refreshToken
        
        // 连接WebSocket
        connectWebSocket()
        
        console.log('会话刷新成功')
      }
      
      return newTokens
    } catch (error) {
      console.error('刷新会话失败:', error)
      throw error
    }
  }

  // 连接WebSocket
  const connectWebSocket = () => {
    if (accessToken.value) {
      websocketClient.connect(accessToken.value).catch(error => {
        console.error('WebSocket连接失败:', error)
      })
    }
  }

  // 断开WebSocket连接
  const disconnectWebSocket = () => {
    websocketClient.disconnect()
  }

  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据
   * @param {string} username - 用户名，用于多用户Token管理
   * @returns {Promise} 登录结果
   */
  const login = async (credentials, username) => {
    try {
      // 调用登录API
      console.log('调用登录API:', credentials)
      
      // 使用http客户端调用后端登录接口
      const response = await http.post('/auth/login', credentials)
      
      // 处理后端返回的数据结构 {success: true, data: {xxx: []}}
      if (response.data.success && response.data.data) {
        const { token, refreshToken: refreshTkn, user: userData } = response.data.data
        
        console.log('登录成功，收到Token:', {
          hasToken: !!token,
          hasRefreshToken: !!refreshTkn,
          userData
        })
        
        // 存储Token到Token管理器，支持多用户
        tokenManager.setTokens(token, refreshTkn, null, username || userData?.username)
        
        // 更新状态
        accessToken.value = token
        refreshToken.value = refreshTkn
        currentUser.value = userData
        roles.value = Array.isArray(userData?.roles) ? userData.roles : []
        permissions.value = Array.isArray(userData?.permissions) ? userData.permissions : []
        
        // 设置Token管理器的刷新回调
        tokenManager.setRefreshCallback(refreshTokens)
        
        // 连接WebSocket
        connectWebSocket()
        
        console.log('登录状态设置完成:', {
          isAuthenticated: isAuthenticated.value,
          currentUser: currentUser.value,
          hasAccessToken: !!accessToken.value,
          hasRefreshToken: !!refreshToken.value
        })
        
        return { success: true, user: userData }
      } else {
        throw new Error(response.data.message || '登录失败')
      }
    } catch (error) {
      console.error('登录失败:', error)
      throw new Error(error.response?.data?.message || '登录失败，请稍后重试')
    }
  }
  
  /**
   * 用户登出
   * @returns {Promise} 登出结果
   */
  const logout = async () => {
    try {
      // 通知服务器登出
      if (accessToken.value) {
        await http.post('/users/logout')
      }
    } catch (error) {
      console.error('服务器登出失败:', error)
    } finally {
      // 无论服务器登出是否成功，都清除本地状态
      // 清除Token管理器（只清除当前用户的Token，不影响其他已记住的用户）
      tokenManager.clearTokens()
      
      // 清除状态
      currentUser.value = null
      accessToken.value = null
      refreshToken.value = null
      tokenExpiry.value = null
      roles.value = []
      permissions.value = []
      isRefreshing.value = false
      refreshPromise.value = null
      
      // 断开WebSocket连接
      disconnectWebSocket()
      
      console.log('用户已登出，已清除当前用户的Token和状态')
    }
    
    return { success: true }
  }
  
  const setSession = ({ user, tokens, permissions: newPermissions, username }) => {
    currentUser.value = user
    
    if (tokens) {
      accessToken.value = tokens.token || null
      refreshToken.value = tokens.refreshToken || null
      tokenExpiry.value = tokens.accessTokenExpiresAt || null
      
      // 存储Token到Token管理器，支持多用户
      if (tokens.token) {
        tokenManager.setTokens(tokens.token, tokens.refreshToken, tokens.accessTokenExpiresAt, username || user?.username)
      }
    }
    
    roles.value = Array.isArray(user?.roles) ? user.roles : []
    permissions.value = Array.isArray(newPermissions) ? newPermissions : []
    
    // 设置Token管理器的刷新回调
    tokenManager.setRefreshCallback(refreshTokens)
    
    // 连接WebSocket
    connectWebSocket()
  }

  const clearSession = () => {
    // 清除Token管理器
    tokenManager.clearTokens()
    
    // 清除状态
    currentUser.value = null
    accessToken.value = null
    refreshToken.value = null
    tokenExpiry.value = null
    roles.value = []
    permissions.value = []
    isRefreshing.value = false
    refreshPromise.value = null
    
    // 断开WebSocket连接
    disconnectWebSocket()
    
    console.log('会话已清除')
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

  /**
   * 获取Token状态信息
   * @returns {Object} Token状态信息
   */
  const getTokenStatus = () => {
    return {
      isValid: tokenManager.isTokenValid(),
      isExpired: tokenManager.isTokenExpired(),
      isExpiringSoon: tokenManager.isTokenExpiringSoon(),
      expiresIn: tokenManager.getTokenExpiresIn(),
      issuedAt: tokenManager.getTokenIssuedAt(),
      expiresAt: tokenManager.getTokenExpiresAt()
    }
  }
  
  return {
    // 状态
    currentUser,
    accessToken,
    refreshToken,
    tokenExpiry,
    roles,
    permissions,
    isRefreshing,
    
    // 计算属性
    isAuthenticated,
    hasRefreshToken,
    isTokenExpiringSoon,
    tokenExpiresIn,
    shouldRefreshToken,
    
    // 方法
    initializeAuth,
    login,
    logout,
    refreshTokens,
    refreshSession,
    connectWebSocket,
    disconnectWebSocket,
    setSession,
    clearSession,
    hasRole,
    hasPermission,
    getTokenStatus
  }
})
