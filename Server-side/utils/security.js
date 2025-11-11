/**
 * 安全功能统一导出
 * 提供一站式安全服务和中间件导入
 */

// ==================== 服务层 ====================
const UnifiedTokenService = require('./services/unified-token-service');
const RBACService = require('./services/rbac-service');
const PasswordResetService = require('./services/password-reset-service');
const SecurityAuditService = require('./services/security-audit-service');

// ==================== 中间件层 ====================
const {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  requireAccess,
  auditLog
} = require('./middleware/unified-security-middleware');

// ==================== 导出 ====================
module.exports = {
  // JWT令牌服务
  Token: {
    generate: UnifiedTokenService.generateTokenPair.bind(UnifiedTokenService),
    verify: UnifiedTokenService.verifyAccessToken.bind(UnifiedTokenService),
    refresh: UnifiedTokenService.refreshTokens.bind(UnifiedTokenService),
    revoke: UnifiedTokenService.revokeToken.bind(UnifiedTokenService),
    extract: UnifiedTokenService.extractTokenFromHeaders.bind(UnifiedTokenService),
    stats: UnifiedTokenService.getBlacklistStats.bind(UnifiedTokenService)
  },
  
  // RBAC权限服务
  RBAC: {
    getUserRoles: RBACService.getUserRoles.bind(RBACService),
    getUserPermissions: RBACService.getUserPermissions.bind(RBACService),
    hasRole: RBACService.hasRole.bind(RBACService),
    hasPermission: RBACService.hasPermission.bind(RBACService),
    hasAllPermissions: RBACService.hasAllPermissions.bind(RBACService),
    assignRoles: RBACService.assignRoles.bind(RBACService),
    removeRoles: RBACService.removeRoles.bind(RBACService),
    getRolePermissions: RBACService.getRolePermissions.bind(RBACService),
    assignPermissions: RBACService.assignPermissionsToRole.bind(RBACService),
    removePermissions: RBACService.removePermissionsFromRole.bind(RBACService),
    createRole: RBACService.createRole.bind(RBACService),
    createPermission: RBACService.createPermission.bind(RBACService),
    clearCache: RBACService.clearAllCache.bind(RBACService)
  },
  
  // 密码重置服务
  PasswordReset: {
    generateToken: PasswordResetService.generateResetToken.bind(PasswordResetService),
    verifyToken: PasswordResetService.verifyResetToken.bind(PasswordResetService),
    resetPassword: PasswordResetService.resetPassword.bind(PasswordResetService),
    validateStrength: PasswordResetService.validatePasswordStrength.bind(PasswordResetService),
    cleanup: PasswordResetService.cleanupExpiredTokens.bind(PasswordResetService)
  },
  
  // 安全审计服务
  Audit: {
    log: SecurityAuditService.log.bind(SecurityAuditService),
    logLoginSuccess: SecurityAuditService.logLoginSuccess.bind(SecurityAuditService),
    logLoginFailure: SecurityAuditService.logLoginFailure.bind(SecurityAuditService),
    logLogout: SecurityAuditService.logLogout.bind(SecurityAuditService),
    logPasswordChange: SecurityAuditService.logPasswordChange.bind(SecurityAuditService),
    logPasswordResetRequest: SecurityAuditService.logPasswordResetRequest.bind(SecurityAuditService),
    logPermissionDenied: SecurityAuditService.logPermissionDenied.bind(SecurityAuditService),
    logUnauthorizedAccess: SecurityAuditService.logUnauthorizedAccess.bind(SecurityAuditService),
    logSuspiciousActivity: SecurityAuditService.logSuspiciousActivity.bind(SecurityAuditService),
    logBruteForceDetected: SecurityAuditService.logBruteForceDetected.bind(SecurityAuditService),
    logSensitiveDataAccess: SecurityAuditService.logSensitiveDataAccess.bind(SecurityAuditService),
    queryLogs: SecurityAuditService.queryLogs.bind(SecurityAuditService),
    getUserStats: SecurityAuditService.getUserAuditStats.bind(SecurityAuditService),
    cleanup: SecurityAuditService.cleanupOldLogs.bind(SecurityAuditService),
    EventTypes: SecurityAuditService.AuditEventType
  },
  
  // 认证中间件
  Auth: {
    required: authenticateToken,
    optional: optionalAuth
  },
  
  // 权限中间件
  Permission: {
    role: requireRole,
    permission: requirePermission,
    access: requireAccess,
    audit: auditLog
  }
};
