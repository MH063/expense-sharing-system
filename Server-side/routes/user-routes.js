const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { 
  userValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');
const { userCache } = require('../middleware/cache-middleware');
const { 
  checkPermission, 
  checkRole, 
  checkOwnershipOrPermission 
} = require('../middleware/permission-middleware');

// 获取用户信息 - 需要认证
router.get('/profile', authenticateToken, userCache.getUser, userController.getProfile);

// 更新用户信息 - 需要认证
router.put(
  '/profile',
  authenticateToken,
  userCache.clearUser,
  userValidationRules.updateProfile,
  handleValidationErrors,
  userController.updateProfile
);

// 修改密码 - 需要认证
router.put(
  '/password',
  authenticateToken,
  userCache.clearUser,
  userValidationRules.changePassword,
  handleValidationErrors,
  userController.changePassword
);

// 获取用户列表 - 需要认证和查看用户权限
router.get('/', 
  authenticateToken, 
  checkPermission('user:view'), 
  userCache.getUser, 
  userController.getUsers
);

// 获取用户详情 - 需要认证和查看用户权限（或查看自己的信息）
router.get('/:id', 
  authenticateToken, 
  checkOwnershipOrPermission('id', 'user:view', 'user'), 
  userCache.getUser, 
  userController.getUserById
);

// 更新用户信息 - 需要认证和编辑用户权限（或编辑自己的信息）
router.put('/:id', 
  authenticateToken, 
  checkOwnershipOrPermission('id', 'user:edit', 'user'), 
  userCache.clearUser, 
  userController.updateUser
);

// 分配用户角色 - 需要认证和编辑用户权限
router.post('/:id/roles', 
  authenticateToken, 
  checkPermission('user:edit'), 
  userCache.clearUser, 
  userController.assignUserRole
);

// 更新用户角色 - 需要认证和编辑用户权限
router.put('/:id/roles', 
  authenticateToken, 
  checkPermission('user:edit'), 
  userCache.clearUser, 
  userController.updateUserRole
);

// 获取用户角色 - 需要认证和查看用户权限（或查看自己的角色）
router.get('/:id/roles', 
  authenticateToken, 
  checkOwnershipOrPermission('id', 'user:view', 'user'), 
  userCache.getUser, 
  userController.getUserRole
);

// 移除用户角色 - 需要认证和编辑用户权限
router.delete('/:id/roles/:roleId', 
  authenticateToken, 
  checkPermission('user:edit'), 
  userCache.clearUser, 
  userController.removeUserRole
);

// 获取当前用户角色 - 需要认证
router.get('/roles', authenticateToken, userCache.getUser, userController.getCurrentUserRoles);

// 获取当前用户权限 - 需要认证
router.get('/permissions', authenticateToken, userCache.getUser, userController.getCurrentUserPermissions);

// 获取当前用户会话列表 - 需要认证
router.get('/sessions', authenticateToken, userCache.getUser, userController.getCurrentUserSessions);

// 终止当前用户会话 - 需要认证
router.delete('/sessions/:sessionId', authenticateToken, userCache.clearUser, userController.terminateCurrentUserSession);

// 获取用户会话列表 - 需要认证和查看用户权限
router.get('/:id/sessions', 
  authenticateToken, 
  checkPermission('user:view'), 
  userCache.getUser, 
  userController.getUserSessions
);

// 终止用户会话 - 需要认证和编辑用户权限
router.delete('/:id/sessions/:sessionId', 
  authenticateToken, 
  checkPermission('user:edit'), 
  userCache.clearUser, 
  userController.terminateUserSession
);

// 获取当前用户通知渠道 - 需要认证
router.get('/notification-channels', authenticateToken, userCache.getUser, userController.getCurrentUserNotificationChannels);

// 添加通知渠道 - 需要认证
router.post('/notification-channels', authenticateToken, userCache.clearUser, userController.addNotificationChannel);

// 更新通知渠道 - 需要认证
router.put('/notification-channels/:channelId', authenticateToken, userCache.clearUser, userController.updateNotificationChannel);

// 删除通知渠道 - 需要认证
router.delete('/notification-channels/:channelId', authenticateToken, userCache.clearUser, userController.deleteNotificationChannel);

// 获取用户通知渠道 - 需要认证和查看用户权限
router.get('/:id/notification-channels', 
  authenticateToken, 
  checkPermission('user:view'), 
  userCache.getUser, 
  userController.getUserNotificationChannels
);

// 更新用户通知渠道 - 需要认证和编辑用户权限
router.put('/:id/notification-channels/:channelId', 
  authenticateToken, 
  checkPermission('user:edit'), 
  userCache.clearUser, 
  userController.updateUserNotificationChannel
);

module.exports = router;