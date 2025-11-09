const jwt = require('jsonwebtoken');

/**
 * JWT认证中间件
 * 验证请求头中的Authorization字段中的JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('认证中间件 - 收到的请求头:', req.headers);
  console.log('认证中间件 - 提取的令牌:', token ? token.substring(0, 20) + '...' : 'null');

  if (!token) {
    return res.unauthorized('访问令牌缺失');
  }

  try {
    const { TokenManager } = require('./tokenManager');
    const decoded = TokenManager.verifyAccessToken(token);
    if (!decoded) {
      return res.unauthorized('访问令牌无效或已过期');
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.unauthorized('访问令牌无效或已过期');
  }
}

/**
 * 角色权限检查中间件
 * @param {Array} allowedRoles - 允许访问的角色列表
 */
function checkRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      // 从数据库获取用户角色
      const { TokenManager } = require('./tokenManager');
      const userRole = await TokenManager.getUserRole(req.user.sub);

      if (!allowedRoles.includes(userRole)) {
        return res.forbidden('权限不足');
      }

      // 更新req.user中的角色信息
      req.user.roles = [userRole];
      next();
    } catch (error) {
      console.error('角色验证失败:', error);
      return res.error(500, '服务器内部错误');
    }
  };
}

/**
 * 权限检查中间件
 * @param {Array} requiredPermissions - 需要的权限列表
 */
function checkPermission(requiredPermissions) {
  return async (req, res, next) => {
    try {
      // 从数据库获取用户权限
      const { TokenManager } = require('./tokenManager');
      const userPermissions = await TokenManager.getUserPermissions(req.user.sub);

      // 检查用户是否拥有所有需要的权限
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.forbidden('权限不足');
      }

      // 更新req.user中的权限信息
      req.user.permissions = userPermissions;
      next();
    } catch (error) {
      console.error('权限验证失败:', error);
      return res.error(500, '服务器内部错误');
    }
  };
}

module.exports = {
  authenticateToken,
  checkRole,
  checkPermission
};