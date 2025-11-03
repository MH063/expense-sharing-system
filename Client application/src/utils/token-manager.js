// 令牌管理工具
import jwtTokenManager from './jwt-token-manager'

// 导出统一的令牌管理接口
export const tokenManager = {
  // 获取令牌
  getToken: () => jwtTokenManager.getToken(),
  
  // 设置令牌
  setToken: (token) => jwtTokenManager.setToken(token),
  
  // 刷新令牌
  refreshToken: (refreshFunction) => jwtTokenManager.refreshToken(refreshFunction),
  
  // 移除令牌
  removeToken: () => jwtTokenManager.clearTokens(),
  
  // 检查令牌是否有效
  isTokenValid: () => jwtTokenManager.isTokenValid(),
  
  // 获取令牌剩余有效时间
  getTokenTimeLeft: () => jwtTokenManager.getTokenTimeToLive()
}

export default tokenManager