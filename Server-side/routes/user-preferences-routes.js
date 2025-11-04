/**
 * 用户偏好设置路由
 */

const express = require('express');
const router = express.Router();
const userPreferencesController = require('../controllers/user-preferences-controller');
const { authenticateToken } = require('../middleware/auth');

// 获取用户所有偏好设置
router.get('/', authenticateToken, userPreferencesController.getUserPreferences);

// 获取用户特定偏好设置
router.get('/:category/:key', authenticateToken, userPreferencesController.getUserPreference);

// 更新用户偏好设置
router.put('/:category/:key', authenticateToken, userPreferencesController.updateUserPreference);

// 批量更新用户偏好设置
router.put('/:category', authenticateToken, userPreferencesController.batchUpdateUserPreferences);

// 删除用户偏好设置
router.delete('/:category/:key', authenticateToken, userPreferencesController.deleteUserPreference);

module.exports = router;