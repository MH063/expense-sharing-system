/**
 * 管理员操作统计API路由
 * 提供管理员操作统计相关的API端点
 */

const express = require('express');
const router = express.Router();
const adminOperationStatisticsController = require('../controllers/adminOperationStatisticsController');
const { authenticateToken } = require('../middleware/auth-middleware');
const { checkRole, checkPermission } = require('../middleware/permission-middleware');

// 获取管理员操作统计数据
router.get('/', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.getOperationStatistics);

// 获取管理员操作统计图表数据
router.get('/charts', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.getOperationChartStatistics);

// 获取管理员操作类型分布统计
router.get('/operation-types', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.getOperationTypeDistribution);

// 获取管理员活跃度统计
router.get('/admin-activity', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.getAdminActivityStatistics);

// 获取管理员操作高峰时段统计
router.get('/peak-hours', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.getOperationPeakHours);

// 获取管理员操作统计概览
router.get('/overview', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.getOperationOverview);

// 导出管理员操作统计数据
router.get('/export', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.exportOperationStatistics);

// 获取管理员操作详细日志
router.get('/logs', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.getOperationLogs);

// 获取管理员操作统计报告
router.get('/report', authenticateToken, checkRole(['admin']), adminOperationStatisticsController.getOperationReport);

module.exports = router;