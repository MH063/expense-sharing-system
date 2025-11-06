/**
 * 用户偏好设置路由
 */

const express = require('express');
const router = express.Router();
const userPreferencesController = require('../controllers/user-preferences-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../config/logger');

// 获取用户所有偏好设置（读接口：宽松限流）
router.get('/', authenticateToken, roleAwareRateLimiter('loose'), (req, res, next) => {
  logger.info('audit:preferences:list', { userId: req.user.sub });
  userPreferencesController.getUserPreferences(req, res, next);
});

// 获取用户特定偏好设置（读接口：宽松限流）
router.get('/:category/:key', authenticateToken, roleAwareRateLimiter('loose'), (req, res, next) => {
  logger.info('audit:preferences:get', { userId: req.user.sub, category: req.params.category, key: req.params.key });
  userPreferencesController.getUserPreference(req, res, next);
});

// 更新用户偏好设置（写接口：严格限流）
router.put('/:category/:key', authenticateToken, roleAwareRateLimiter('strict'), (req, res, next) => {
  logger.info('audit:preferences:update', { userId: req.user.sub, category: req.params.category, key: req.params.key });
  userPreferencesController.updateUserPreference(req, res, next);
});

// 批量更新用户偏好设置（写接口：严格限流）
router.put('/:category', authenticateToken, roleAwareRateLimiter('strict'), (req, res, next) => {
  logger.info('audit:preferences:batch_update', { userId: req.user.sub, category: req.params.category, keys: Object.keys(req.body || {}) });
  userPreferencesController.batchUpdateUserPreferences(req, res, next);
});

// 删除用户偏好设置（写接口：严格限流）
router.delete('/:category/:key', authenticateToken, roleAwareRateLimiter('strict'), (req, res, next) => {
  logger.info('audit:preferences:delete', { userId: req.user.sub, category: req.params.category, key: req.params.key });
  userPreferencesController.deleteUserPreference(req, res, next);
});

module.exports = router;