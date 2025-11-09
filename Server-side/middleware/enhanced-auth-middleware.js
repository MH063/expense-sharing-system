/**
 * 增强的认证中间件
 * 支持非对称加密算法（RS256）和增强的密钥管理
 */

const { EnhancedTokenManager, tokenConfig } = require('./enhanced-tokenManager');
const { logger } = require('../config/logger');
const { performance } = require('perf_hooks');

/**
 * 增强的JWT认证中间件
 * 验证请求头中的Authorization字段中的JWT token
 */
function authenticateToken(req, res, next) {
  const startTime = performance.now();
  
  // 提取token
  const token = EnhancedTokenManager.extractTokenFromHeaders(req.headers);
  
  if (!token) {
    logger.warn('访问令牌缺失', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  // 验证token
  const decoded = EnhancedTokenManager.verifyAccessToken(token);
  
  if (!decoded) {
    logger.warn('访问令牌无效或已过期', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(401).json({
      success: false,
      message: '访问令牌无效或已过期'
    });
  }

  // 设置用户信息
  req.user = decoded;
  
  const endTime = performance.now();
  logger.debug('Token验证成功', {
    userId: decoded.sub,
    username: decoded.username,
    url: req.url,
    method: req.method,
    duration: `${(endTime - startTime).toFixed(2)}ms`
  });
  
  next();
}

/**
 * 检查请求体大小的中间件
 */
function checkRequestBodySize(req, res, next) {
  // 只对特定路径和方法检查请求体大小
  const isProtectedPath = tokenConfig.lengthLimits.protectedPaths.some(path => 
    req.path.startsWith(path)
  );
  
  const isProtectedMethod = tokenConfig.lengthLimits.protectedMethods.includes(req.method);
  
  if (isProtectedPath && isProtectedMethod) {
    const sizeCheck = EnhancedTokenManager.checkRequestBodySize(req);
    
    if (!sizeCheck.valid) {
      logger.warn('请求体过大', {
        url: req.url,
        method: req.method,
        contentLength: req.get('Content-Length'),
        ip: req.ip
      });
      
      return res.status(413).json({
        success: false,
        message: sizeCheck.error,
        code: sizeCheck.code
      });
    }
  }
  
  next();
}

/**
 * 角色授权中间件
 * @param {Array<string>} allowedRoles - 允许的角色列表
 * @returns {Function} 中间件函数
 */
function authorizeRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }
    
    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      logger.warn('权限不足', {
        userId: req.user.sub,
        username: req.user.username,
        userRoles,
        requiredRoles: allowedRoles,
        url: req.url,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    next();
  };
}

/**
 * 权限授权中间件
 * @param {Array<string>} requiredPermissions - 需要的权限列表
 * @returns {Function} 中间件函数
 */
function authorizePermissions(requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }
    
    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      logger.warn('权限不足', {
        userId: req.user.sub,
        username: req.user.username,
        userPermissions,
        requiredPermissions,
        url: req.url,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    next();
  };
}

/**
 * 组合授权中间件（角色和权限）
 * @param {Object} options - 授权选项
 * @param {Array<string>} options.roles - 允许的角色列表
 * @param {Array<string>} options.permissions - 需要的权限列表
 * @returns {Function} 中间件函数
 */
function authorize({ roles = [], permissions = [] } = {}) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }
    
    const userRoles = req.user.roles || [];
    const userPermissions = req.user.permissions || [];
    
    // 检查角色
    if (roles.length > 0) {
      const hasRole = roles.some(role => userRoles.includes(role));
      if (!hasRole) {
        logger.warn('角色权限不足', {
          userId: req.user.sub,
          username: req.user.username,
          userRoles,
          requiredRoles: roles,
          url: req.url,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          message: '角色权限不足'
        });
      }
    }
    
    // 检查权限
    if (permissions.length > 0) {
      const hasPermission = permissions.some(permission => 
        userPermissions.includes(permission)
      );
      if (!hasPermission) {
        logger.warn('操作权限不足', {
          userId: req.user.sub,
          username: req.user.username,
          userPermissions,
          requiredPermissions,
          url: req.url,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          message: '操作权限不足'
        });
      }
    }
    
    next();
  };
}

/**
 * 可选认证中间件
 * 如果提供了token，则验证并设置用户信息；否则继续执行
 */
function optionalAuth(req, res, next) {
  const token = EnhancedTokenManager.extractTokenFromHeaders(req.headers);
  
  if (token) {
    const decoded = EnhancedTokenManager.verifyAccessToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

module.exports = {
  authenticateToken,
  checkRequestBodySize,
  authorizeRoles,
  authorizePermissions,
  authorize,
  optionalAuth,
  EnhancedTokenManager
};