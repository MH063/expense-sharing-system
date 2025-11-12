// 令牌管理工具
import jwtTokenManager from './jwt-token-manager'

// 导出统一的令牌管理接口
export const tokenManager = {
  // 初始化
  init: () => jwtTokenManager.init(),
  
  // 获取令牌
  getToken: () => jwtTokenManager.getToken(),
  
  // 设置令牌
  setToken: (token) => jwtTokenManager.setToken(token),
  
  // 设置多个令牌
  setTokens: (token, refreshToken, tokenExpiry, username) => jwtTokenManager.setTokens(token, refreshToken, tokenExpiry, username),
  
  // 获取刷新令牌
  getRefreshToken: () => jwtTokenManager.getRefreshToken(),
  
  // 设置刷新令牌
  setRefreshToken: (refreshToken) => jwtTokenManager.setRefreshToken(refreshToken),
  
  // 刷新令牌
  refreshToken: (refreshFunction) => jwtTokenManager.refreshToken(refreshFunction),
  
  // 移除令牌
  removeToken: () => jwtTokenManager.clearTokens(),
  
  // 清除令牌
  clearTokens: () => jwtTokenManager.clearTokens(),
  
  // 检查令牌是否有效
  isTokenValid: () => jwtTokenManager.isTokenValid(),
  
  // 检查令牌状态
  checkTokenStatus: () => jwtTokenManager.checkTokenStatus(),
  
  // 检查令牌是否过期
  isTokenExpired: () => jwtTokenManager.isTokenExpired(),
  
  // 检查令牌是否即将过期
  isTokenExpiringSoon: () => jwtTokenManager.isTokenExpiringSoon(),
  
  // 获取令牌剩余有效时间
  getTokenTimeLeft: () => jwtTokenManager.getTokenTimeToLive(),
  
  // 获取令牌过期时间
  getTokenExpiresIn: () => jwtTokenManager.getTokenExpiresIn(),
  
  // 获取令牌签发时间
  getTokenIssuedAt: () => jwtTokenManager.getTokenIssuedAt(),
  
  // 获取令牌过期时间戳
  getTokenExpiresAt: () => jwtTokenManager.getTokenExpiresAt(),
  
  // 解析令牌
  parseToken: (token) => jwtTokenManager.parseToken(token),
  
  // 获取当前用户
  getCurrentUser: () => jwtTokenManager.getCurrentUser(),
  
  // 设置刷新回调
  setRefreshCallback: (callback) => jwtTokenManager.setRefreshCallback(callback)
}

export default tokenManager