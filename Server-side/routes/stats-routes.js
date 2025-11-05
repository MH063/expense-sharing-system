const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats-controller');
const { authenticateToken, checkRole } = require('../middleware/tokenManager');
const { 
  statsValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');

// 获取用户统计信息 - 需要认证
router.get(
  '/user',
  authenticateToken,
  statsValidationRules.userStats,
  handleValidationErrors,
  statsController.getUserStats
);

// 获取寝室统计信息 - 需要认证
router.get(
  '/room',
  authenticateToken,
  statsValidationRules.roomStats,
  handleValidationErrors,
  statsController.getRoomStats
);

// 获取系统统计信息（管理员） - 需要管理员权限
router.get(
  '/system',
  authenticateToken,
  checkRole(['admin']),
  statsValidationRules.systemStats,
  handleValidationErrors,
  statsController.getSystemStats
);

// 获取费用预测分析 - 需要认证
router.get(
  '/forecast',
  authenticateToken,
  statsValidationRules.forecast,
  handleValidationErrors,
  statsController.getExpenseForecast
);

module.exports = router;