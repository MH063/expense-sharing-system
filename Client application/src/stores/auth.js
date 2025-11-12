import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '@/api/http'
import websocketClient from '@/utils/websocket-client'
import tokenManager from '@/utils/token-manager'

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
  
  // 添加checkPermission方法作为hasPermission的别名，保持向后兼容
  const checkPermission = (permission) => hasPermission(permission)

  /**
   * 初始化认证状态
   * 从Token管理器恢复Token和用户信息
   */
  const initializeAuth = async () => {
    try {
      console.log('=== 认证状态初始化开始 ===')
      // 初始化Token管理器
      tokenManager.init()
      
      // 获取当前用户名
      const currentUsername = tokenManager.getCurrentUser()
      console.log('当前用户名:', currentUsername)
      
      // 从Token管理器获取Token
      const token = tokenManager.getToken()
      const refreshTkn = tokenManager.getRefreshToken()
      console.log('获取到的Token:', !!token, '获取到的RefreshToken:', !!refreshTkn)
      console.log('Token内容:', token)
      
      if (token) {
        accessToken.value = token
        console.log('设置accessToken完成')
        
        // 解析Token获取用户信息
        const payload = tokenManager.parseToken(token)
        console.log('Token解析结果:', payload)
        
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
          console.log('标准Token解析，设置currentUser:', currentUser.value)
          console.log('设置roles数组:', roles.value)
          
          // 同步最新角色信息
          await syncUserRoles()
        } else {
          console.log('Token解析失败，检查是否为模拟Token')
          // 如果是模拟Token，创建默认用户信息
          if (token.startsWith('mock-jwt-token-')) {
            console.log('检测到模拟Token，设置默认管理员用户信息')
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
            console.log('模拟Token设置完成:', currentUser.value)
            console.log('设置roles数组:', roles.value)
          } else {
            console.log('非模拟Token且解析失败')
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
      
      const res = await refreshPromise.value
      
      // 处理后端返回的数据结构 {success: true, data: {xxx: []}}
      // 注意：根据规则，后端数据是双层嵌套，可能需要访问 res.data.data.xxx
      let responseData = res.data
      
      // 如果数据是双层嵌套，尝试访问 res.data.data
      if (responseData && responseData.data) {
        responseData = responseData.data
        console.log('检测到双层嵌套数据结构，使用res.data.data')
      }
      
      if (res.success && responseData) {
        const { token: newAccessToken, refreshToken: newRefreshToken } = responseData
        
        // 获取当前用户名，确保Token刷新时使用正确的用户上下文
        const currentUsername = tokenManager.getCurrentUser()
        
        // 更新Token管理器，支持多用户
        tokenManager.setTokens(newAccessToken, newRefreshToken, null, currentUsername)
        
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
        const res = await http.post('/auth/refresh-token', {
          refreshToken: tokenManager.getRefreshToken()
        })
        
        // 处理后端返回的数据结构 {success: true, data: {xxx: []}}
        if (res.success && res.data) {
          return res.data
        } else {
          throw new Error(res.message || '刷新令牌失败')
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
      console.log('尝试连接WebSocket...')
      websocketClient.connect(accessToken.value).catch(error => {
        console.error('WebSocket连接失败:', error)
        // WebSocket连接失败不应该影响登录流程
        console.log('WebSocket连接失败，但登录流程继续')
      })
    } else {
      console.log('没有accessToken，跳过WebSocket连接')
    }
  }

  // 断开WebSocket连接
  const disconnectWebSocket = () => {
    websocketClient.disconnect()
  }

  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据或包含token和user的对象
   * @param {string} username - 用户名，用于多用户Token管理
   * @returns {Promise} 登录结果
   */
  const login = async (credentials, username) => {
    try {
      // 检查是否已经处理过的登录结果（直接包含token和user）
      if (credentials.token && credentials.user) {
        console.log('使用已处理的登录结果:', credentials)
        
        const { token: accessToken, refreshToken: refreshTkn, user: userData } = credentials
        
        console.log('登录成功，收到Token:', {
          hasToken: !!accessToken,
          hasRefreshToken: !!refreshTkn,
          userData,
        })
        
        // 存储Token到Token管理器，支持多用户
        tokenManager.setTokens(accessToken, refreshTkn, null, username || userData?.username)
        
        // 更新状态
        accessToken.value = accessToken
        refreshToken.value = refreshTkn
        currentUser.value = userData
        
        // 确保角色信息正确设置 - 优先从roles数组获取
        if (Array.isArray(userData?.roles) && userData.roles.length > 0) {
          roles.value = userData.roles
        } else if (userData?.role) {
          roles.value = [userData.role]
        } else {
          roles.value = []
        }
        
        // 确保权限信息正确设置
        if (Array.isArray(userData?.permissions)) {
          permissions.value = userData.permissions
        } else {
          permissions.value = []
        }
        
        // 设置Token管理器的刷新回调
        tokenManager.setRefreshCallback(refreshTokens)
        
        // 同步最新角色信息
        await syncUserRoles()
        
        // 连接WebSocket
        connectWebSocket()
        
        console.log('登录状态设置完成:', {
          isAuthenticated: isAuthenticated.value,
          currentUser: currentUser.value,
          hasAccessToken: !!accessToken.value,
          hasRefreshToken: !!refreshToken.value
        })
        
        // 返回完整的响应信息给前端组件
        return { 
          success: true, 
          user: userData,
          message: '登录成功'
        }
      }
      
      // 调用登录API
      console.log('调用登录API:', credentials)
      
      // 使用http客户端调用后端登录接口
      console.log('发送登录请求...')
      const res = await http.post('/auth/login', credentials)
      console.log('收到完整响应:', JSON.stringify(res, null, 2))
      console.log('响应类型:', typeof res)
      console.log('响应success属性:', res.success)
      console.log('响应data属性:', res.data)
      
      // 处理后端返回的数据结构 {success: true, data: {user, accessToken, refreshToken}}
      console.log('登录API响应:', res)
      
      // 后端返回的是单层嵌套：res.data 包含 {user, accessToken, refreshToken}
      let responseData = res.data
      console.log('使用res.data作为响应数据:', responseData)
      
      if (res.success && responseData) {
        const { accessToken: token, refreshToken: refreshTkn, user: userData } = responseData
        
        console.log('登录成功，收到Token:', {
          hasToken: !!token,
          hasRefreshToken: !!refreshTkn,
          userData,
          fullResponse: res
        })
        
        // 存储Token到Token管理器，支持多用户
        tokenManager.setTokens(token, refreshTkn, null, username || userData?.username)
        
        // 更新状态
        accessToken.value = token
        refreshToken.value = refreshTkn
        currentUser.value = userData
        
        // 确保角色信息正确设置 - 优先从roles数组获取
        if (Array.isArray(userData?.roles) && userData.roles.length > 0) {
          roles.value = userData.roles
        } else if (userData?.role) {
          roles.value = [userData.role]
        } else {
          roles.value = []
        }
        
        // 确保权限信息正确设置
        if (Array.isArray(userData?.permissions)) {
          permissions.value = userData.permissions
        } else {
          permissions.value = []
        }
        
        // 设置Token管理器的刷新回调
        tokenManager.setRefreshCallback(refreshTokens)
        
        // 如果登录返回的权限数据为空，则异步同步
        if (!permissions.value || permissions.value.length === 0) {
          console.log('登录返回的权限为空，异步同步权限数据')
          syncUserRoles().catch(error => {
            console.error('同步用户角色信息失败:', error)
          })
        } else {
          console.log('使用登录返回的权限数据:', permissions.value)
        }
        
        // 连接WebSocket
        connectWebSocket()
        
        console.log('登录状态设置完成:', {
          isAuthenticated: isAuthenticated.value,
          currentUser: currentUser.value,
          hasAccessToken: !!accessToken.value,
          hasRefreshToken: !!refreshToken.value
        })
        
        // 返回完整的响应信息给前端组件
        return { 
          success: true, 
          user: userData,
          message: '登录成功'
        }
      } else {
        throw new Error(res.message || '登录失败')
      }
    } catch (error) {
      console.error('登录失败:', error)
      
      // 处理后端错误响应的双层嵌套结构
      let errorMessage = '登录失败，请稍后重试'
      
      if (error.response?.data) {
        let errorData = error.response.data
        
        // 如果是双层嵌套结构，尝试访问 res.data.data
        if (errorData && errorData.data) {
          errorData = errorData.data
        }
        
        if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      }
      
      throw new Error(errorMessage)
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
        await http.post('/auth/logout')
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
   * 同步用户角色信息
   * 从后端获取最新的用户角色和权限信息
   * @returns {Promise<void>}
   */
  const syncUserRoles = async () => {
    try {
      console.log('开始同步用户角色信息...')
      console.log('同步前的角色信息:', roles.value)
      
      // 获取最新角色信息
      const rolesResponse = await http.get('/users/roles')
      console.log('获取角色响应:', rolesResponse)
      
      // 处理后端返回的数据结构 {success: true, data: {roles: []}}
      let rolesData = rolesResponse.data
      
      // 如果数据是双层嵌套，尝试访问 res.data.data
      if (rolesData && rolesData.data) {
        rolesData = rolesData.data
        console.log('检测到双层嵌套数据结构，使用res.data.data')
      }
      
      if (rolesData && Array.isArray(rolesData.roles) && rolesData.roles.length > 0) {
        roles.value = rolesData.roles
        console.log('成功同步角色信息:', roles.value)
      } else {
        console.warn('角色信息格式异常或为空，保持原有角色:', rolesData)
        // 不清空 roles.value，保持原有值
      }
      
      // 获取最新权限信息
      const permissionsResponse = await http.get('/users/permissions')
      console.log('获取权限响应:', permissionsResponse)
      
      // 处理后端返回的数据结构 {success: true, data: {permissions: []}}
      let permissionsData = permissionsResponse.data
      
      // 如果数据是双层嵌套，尝试访问 res.data.data
      if (permissionsData && permissionsData.data) {
        permissionsData = permissionsData.data
        console.log('检测到双层嵌套数据结构，使用res.data.data')
      }
      
      if (permissionsData && Array.isArray(permissionsData.permissions) && permissionsData.permissions.length > 0) {
        permissions.value = permissionsData.permissions
        console.log('成功同步权限信息:', permissions.value)
      } else {
        console.warn('权限信息格式异常或为空，保持原有权限:', permissionsData)
        // 不清空 permissions.value，保持原有值
      }
      
      // 同时更新currentUser中的角色和权限信息
      if (currentUser.value) {
        currentUser.value = {
          ...currentUser.value,
          roles: roles.value,
          permissions: permissions.value
        }
        console.log('更新currentUser角色权限信息:', currentUser.value)
      }
      
    } catch (error) {
      console.error('同步用户角色信息失败，保持原有角色和权限:', error)
      // 同步失败不影响主流程，记录错误信息即可，不清空现有数据
    }
  }

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
    checkPermission, // 添加checkPermission到导出对象
    syncUserRoles,
    getTokenStatus
  }
})
