/**
 * 管理员操作统计API路由
 * 提供管理员操作统计相关的API端点
 */

const express = require('express');
const router = express.Router();
const adminOperationStatisticsController = require('../controllers/adminOperationStatisticsController');
const { authenticateAdmin, authorizeAdmin } = require('../middleware/adminAuthMiddleware');

// 获取管理员操作统计数据
router.get('/', authenticateAdmin, authorizeAdmin('view_operation_statistics'), adminOperationStatisticsController.getOperationStatistics);

// 获取管理员操作统计图表数据
router.get('/charts', authenticateAdmin, authorizeAdmin('view_operation_statistics'), adminOperationStatisticsController.getOperationChartStatistics);

// 获取管理员操作类型分布统计
router.get('/operation-types', authenticateAdmin, authorizeAdmin('view_operation_statistics'), adminOperationStatisticsController.getOperationTypeDistribution);

// 获取管理员活跃度统计
router.get('/admin-activity', authenticateAdmin, authorizeAdmin('view_operation_statistics'), adminOperationStatisticsController.getAdminActivityStatistics);

// 获取管理员操作高峰时段统计
router.get('/peak-hours', authenticateAdmin, authorizeAdmin('view_operation_statistics'), adminOperationStatisticsController.getOperationPeakHours);

// 获取管理员操作统计概览
router.get('/overview', authenticateAdmin, authorizeAdmin('view_operation_statistics'), adminOperationStatisticsController.getOperationOverview);

// 导出管理员操作统计数据
router.get('/export', authenticateAdmin, authorizeAdmin('export_operation_statistics'), adminOperationStatisticsController.exportOperationStatistics);

// 获取管理员操作详细日志
router.get('/logs', authenticateAdmin, authorizeAdmin('view_operation_logs'), adminOperationStatisticsController.getOperationLogs);

// 获取管理员操作统计报告
router.get('/report', authenticateAdmin, authorizeAdmin('view_operation_statistics'), adminOperationStatisticsController.getOperationReport);

module.exports = router;