const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { 
  userValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');
const { userCache } = require('../middleware/cache-middleware');

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

// 获取用户列表 - 需要认证（管理员功能）
router.get('/', authenticateToken, userCache.getUser, userController.getUsers);

// 获取用户详情 - 需要认证
router.get('/:id', authenticateToken, userCache.getUser, userController.getUserById);

// 更新用户信息 - 需要认证（管理员功能）
router.put('/:id', authenticateToken, userCache.clearUser, userController.updateUser);

// 分配用户角色 - 需要认证（管理员功能）
router.post('/:id/roles', authenticateToken, userCache.clearUser, userController.assignUserRole);

// 更新用户角色 - 需要认证（管理员功能）
router.put('/:id/roles', authenticateToken, userCache.clearUser, userController.updateUserRole);

// 获取用户角色 - 需要认证
router.get('/:id/roles', authenticateToken, userCache.getUser, userController.getUserRole);

module.exports = router;