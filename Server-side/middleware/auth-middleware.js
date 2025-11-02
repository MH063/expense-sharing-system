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
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('认证中间件 - JWT验证错误:', err.message);
      return res.status(403).json({
        success: false,
        message: '访问令牌无效或已过期'
      });
    }

    console.log('认证中间件 - JWT验证成功，用户信息:', user);
    req.user = user;
    next();
  });
}

/**
 * 角色权限检查中间件
 * @param {Array} allowedRoles - 允许访问的角色列表
 */
function checkRole(allowedRoles) {
  return (req, res, next) => {
    // 这里应该从数据库获取用户角色，暂时从token中获取
    const userRole = req.user.roles && req.user.roles[0]; // 简化处理，实际应该从数据库获取

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
}

/**
 * 权限检查中间件
 * @param {Array} requiredPermissions - 需要的权限列表
 */
function checkPermission(requiredPermissions) {
  return (req, res, next) => {
    // 这里应该从数据库获取用户权限，暂时从token中获取
    const userPermissions = req.user.permissions || []; // 简化处理，实际应该从数据库获取

    // 检查用户是否拥有所有需要的权限
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  checkRole,
  checkPermission
};