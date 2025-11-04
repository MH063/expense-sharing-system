const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats-controller');
const { authenticateToken, checkRole } = require('../middleware/tokenManager');

// 获取用户统计信息
router.get('/user', authenticateToken, statsController.getUserStats);

// 获取寝室统计信息
router.get('/room', authenticateToken, statsController.getRoomStats);

// 获取系统统计信息（管理员）
router.get('/system', authenticateToken, checkRole(['admin']), statsController.getSystemStats);

// 获取费用预测分析
router.get('/forecast', authenticateToken, statsController.getExpenseForecast);

module.exports = router;