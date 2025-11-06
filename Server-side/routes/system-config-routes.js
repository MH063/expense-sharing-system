/**
 * 系统配置路由（占位）
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, checkRole } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');

// 读取配置（管理员）
const SystemConfigController = require('../controllers/system-config-controller');

router.get('/', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemConfigController.getConfig(req, res);
});

// 更新配置（管理员）
router.put('/', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemConfigController.updateConfig(req, res);
});

module.exports = router;