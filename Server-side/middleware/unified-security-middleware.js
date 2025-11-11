/**
 * 统一安全中间件
 * 整合JWT认证、RBAC权限验证、审计日志等安全功能
 */

const UnifiedTokenService = require('../services/unified-token-service');
const RBACService = require('../services/rbac-service');
const SecurityAuditService = require('../services/security-audit-service');
const { LogHelper } = require('../utils/log-helpers');

/**
 * JWT认证中间件
 * 验证访问令牌并设置用户信息
 */
const authenticateToken = async (req, res, next) => {
  try {
    // 提取令牌
    const token = UnifiedTokenService.extractTokenFromHeaders(req.headers);
    
    if (!token) {
      // 记录未授权访问
      await SecurityAuditService.logUnauthorizedAccess(
        req.path,
        req.ip,
        req.get('User-Agent')
      );
      
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失',
        code: 'AUTH_MISSING_TOKEN'
      });
    }
    
    // 验证令牌
    const decoded = await UnifiedTokenService.verifyAccessToken(token);
    
    if (!decoded) {
      // 记录无效令牌
      await SecurityAuditService.log({
        eventType: SecurityAuditService.AuditEventType.INVALID_TOKEN,
        eventDescription: '无效或已过期的访问令牌',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        result: 'failure',
        severity: 'medium'
      });
      
      return res.status(401).json({
        success: false,
        message: '访问令牌无效或已过期',
        code: 'AUTH_INVALID_TOKEN'
      });
    }
    
    // 设置用户信息
    req.user = decoded;
    req.userId = decoded.sub;
    req.userRoles = decoded.roles || [];
    req.userPermissions = decoded.permissions || [];
    
    next();
  } catch (error) {
    LogHelper.error('令牌认证失败', error, {
      path: req.path,
      ip: req.ip
    });
    
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * 可选认证中间件
 * 如果提供了token则验证,否则继续执行
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = UnifiedTokenService.extractTokenFromHeaders(req.headers);
    
    if (token) {
      const decoded = await UnifiedTokenService.verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
        req.userId = decoded.sub;
        req.userRoles = decoded.roles || [];
        req.userPermissions = decoded.permissions || [];
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不阻塞请求
    LogHelper.error('可选认证失败', error);
    next();
  }
};

/**
 * 角色验证中间件
 * @param {string|Array} roles - 允许的角色
 */
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        return res.status(401).json({
          success: false,
          message: '未认证',
          code: 'AUTH_REQUIRED'
        });
      }
      
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      const hasRole = await RBACService.hasRole(req.userId, requiredRoles);
      
      if (!hasRole) {
        // 记录权限拒绝
        await SecurityAuditService.logPermissionDenied(
          req.userId,
          req.user.username,
          req.path,
          req.method,
          req.ip
        );
        
        LogHelper.security('角色权限不足', {
          userId: req.userId,
          username: req.user.username,
          requiredRoles,
          userRoles: req.userRoles
        });
        
        return res.status(403).json({
          success: false,
          message: '权限不足',
          code: 'PERMISSION_DENIED'
        });
      }
      
      next();
    } catch (error) {
      LogHelper.error('角色验证失败', error, {
        userId: req.userId,
        roles
      });
      
      return res.status(500).json({
        success: false,
        message: '服务器内部错误',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * 权限验证中间件
 * @param {string|Array} permissions - 需要的权限
 * @param {boolean} requireAll - 是否需要所有权限(默认false,只需一个)
 */
const requirePermission = (permissions, requireAll = false) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        return res.status(401).json({
          success: false,
          message: '未认证',
          code: 'AUTH_REQUIRED'
        });
      }
      
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
      
      let hasPermission;
      if (requireAll) {
        hasPermission = await RBACService.hasAllPermissions(req.userId, requiredPermissions);
      } else {
        hasPermission = await RBACService.hasPermission(req.userId, requiredPermissions);
      }
      
      if (!hasPermission) {
        // 记录权限拒绝
        await SecurityAuditService.logPermissionDenied(
          req.userId,
          req.user.username,
          req.path,
          req.method,
          req.ip
        );
        
        LogHelper.security('操作权限不足', {
          userId: req.userId,
          username: req.user.username,
          requiredPermissions,
          userPermissions: req.userPermissions
        });
        
        return res.status(403).json({
          success: false,
          message: '权限不足',
          code: 'PERMISSION_DENIED'
        });
      }
      
      next();
    } catch (error) {
      LogHelper.error('权限验证失败', error, {
        userId: req.userId,
        permissions
      });
      
      return res.status(500).json({
        success: false,
        message: '服务器内部错误',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * 组合权限中间件(角色或权限)
 * @param {Object} options - { roles: [], permissions: [] }
 */
const requireAccess = (options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        return res.status(401).json({
          success: false,
          message: '未认证',
          code: 'AUTH_REQUIRED'
        });
      }
      
      const { roles = [], permissions = [] } = options;
      
      // 检查角色
      if (roles.length > 0) {
        const hasRole = await RBACService.hasRole(req.userId, roles);
        if (hasRole) {
          return next();
        }
      }
      
      // 检查权限
      if (permissions.length > 0) {
        const hasPermission = await RBACService.hasPermission(req.userId, permissions);
        if (hasPermission) {
          return next();
        }
      }
      
      // 记录权限拒绝
      await SecurityAuditService.logPermissionDenied(
        req.userId,
        req.user.username,
        req.path,
        req.method,
        req.ip
      );
      
      LogHelper.security('访问权限不足', {
        userId: req.userId,
        username: req.user.username,
        requiredRoles: roles,
        requiredPermissions: permissions
      });
      
      return res.status(403).json({
        success: false,
        message: '权限不足',
        code: 'PERMISSION_DENIED'
      });
    } catch (error) {
      LogHelper.error('访问验证失败', error, {
        userId: req.userId,
        options
      });
      
      return res.status(500).json({
        success: false,
        message: '服务器内部错误',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * 审计日志中间件
 * 记录敏感操作
 */
const auditLog = (options = {}) => {
  return async (req, res, next) => {
    const {
      eventType,
      description,
      resource,
      action,
      severity = 'info'
    } = options;
    
    // 保存原始响应方法
    const originalJson = res.json;
    const startTime = Date.now();
    
    // 重写响应方法以记录结果
    res.json = function(data) {
      const duration = Date.now() - startTime;
      const success = data && data.success !== false;
      
      // 记录审计日志
      SecurityAuditService.log({
        userId: req.userId,
        username: req.user ? req.user.username : null,
        eventType: eventType || 'api_access',
        eventDescription: description || `${req.method} ${req.path}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: resource || req.path,
        action: action || req.method.toLowerCase(),
        result: success ? 'success' : 'failure',
        severity,
        metadata: {
          duration,
          statusCode: res.statusCode
        }
      }).catch(error => {
        LogHelper.error('记录审计日志失败', error);
      });
      
      // 调用原始方法
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  // 认证中间件
  authenticateToken,
  optionalAuth,
  
  // 权限中间件
  requireRole,
  requirePermission,
  requireAccess,
  
  // 审计中间件
  auditLog
};
