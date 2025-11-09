const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const { authenticateToken } = require('../middleware/auth-middleware');
const { checkPermission } = require('../middleware/permission-middleware');
const { adminValidationRules, handleValidationErrors } = require('../middleware/validation-middleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { auditLogger } = require('../middleware/auditLogger');
// 管理员登录
router.post('/login', 
  loginRateLimiter, 
  adminValidationRules.login, 
  handleValidationErrors,
  auditLogger('管理员登录'),
  userController.adminLogin
);

// 管理员登出
router.post('/logout', 
  authenticateToken, 
  auditLogger('管理员登出'),
  userController.adminLogout
);

// 刷新令牌
router.post('/refresh', 
  adminValidationRules.refreshToken,
  handleValidationErrors,
  auditLogger('刷新令牌'),
  userController.refreshToken
);

// 获取当前登录管理员信息
router.get('/profile', 
  authenticateToken, 
  auditLogger('获取管理员信息'),
  userController.getCurrentAdminInfo
);

// 修改管理员密码
router.put('/change-password', 
  authenticateToken, 
  adminValidationRules.changePassword,
  handleValidationErrors,
  auditLogger('修改管理员密码'),
  userController.changeAdminPassword
);

// 获取管理员操作日志
router.get('/operation-logs', 
  authenticateToken, 
  checkPermission('view_admin_logs'),
  auditLogger('查看管理员操作日志'),
  userController.getAdminOperationLogs
);

// 获取管理员权限列表
router.get('/permissions', 
  authenticateToken, 
  auditLogger('获取管理员权限列表'),
  userController.getAdminPermissions
);

// 获取管理员会话信息
router.get('/sessions', 
  authenticateToken, 
  auditLogger('获取管理员会话信息'),
  userController.getAdminSessions
);

// 验证管理员权限
router.post('/verify-permission', 
  authenticateToken, 
  adminValidationRules.verifyPermission,
  handleValidationErrors,
  auditLogger('验证管理员权限'),
  userController.verifyAdminPermission
);

module.exports = router;