const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');
const { handleValidationErrors } = require('../middleware/validation-middleware');
const { adminValidationRules } = require('../middleware/validation-middleware');

// 获取用户列表 - 需要管理员权限
router.get('/users', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  userController.getUsers
);

// 获取用户详情 - 需要管理员权限
router.get('/users/:id', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  adminValidationRules.getUserById,
  handleValidationErrors,
  userController.getUserById
);

// 创建用户 - 需要管理员权限
router.post('/users', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  adminValidationRules.createUser,
  handleValidationErrors,
  userController.createUser
);

// 更新用户信息 - 需要管理员权限
router.put('/users/:id', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  adminValidationRules.updateUser,
  handleValidationErrors,
  userController.updateUser
);

// 更新用户状态 - 需要管理员权限
router.patch('/users/:id/status', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  adminValidationRules.updateUserStatus,
  handleValidationErrors,
  userController.updateUserStatus
);

// 重置用户密码 - 需要管理员权限
router.post('/users/:id/reset-password', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  adminValidationRules.resetUserPassword,
  handleValidationErrors,
  userController.resetUserPassword
);

// 更新用户角色 - 需要管理员权限
router.put('/users/:id/role', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  adminValidationRules.updateUserRole,
  handleValidationErrors,
  userController.updateUserRole
);

// 删除用户 - 需要管理员权限
router.delete('/users/:id', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  adminValidationRules.deleteUser,
  handleValidationErrors,
  userController.deleteUser
);

// 批量更新用户状态 - 需要管理员权限
router.patch('/users/batch/status', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  adminValidationRules.batchUpdateUserStatus,
  handleValidationErrors,
  userController.batchUpdateUserStatus
);

// 获取用户统计信息 - 需要管理员权限
router.get('/users/statistics', 
  authenticateToken,
  checkRole(['admin', 'system_admin']),
  userController.getUserStatistics
);

module.exports = router;