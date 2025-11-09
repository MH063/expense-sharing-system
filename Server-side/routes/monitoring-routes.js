const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoring-controller');
const { authenticateToken } = require('../middleware/auth-middleware');

// 所有监控路由都需要管理员权限
router.use(authenticateToken);

// 系统性能指标相关路由
router.get('/performance-metrics', monitoringController.getSystemPerformanceMetrics);

// API使用统计相关路由
router.get('/api-usage-stats', monitoringController.getApiUsageStats);

// 用户活动日志相关路由
router.get('/user-activity-logs', monitoringController.getUserActivityLogs);

// 数据变更审计日志相关路由
router.get('/data-change-audits', monitoringController.getDataChangeAudits);

// 系统健康报告相关路由
router.get('/system-health-report', monitoringController.getSystemHealthReport);

// 系统审计日志相关路由
router.get('/system-audit-logs', monitoringController.getSystemAuditLogs);

module.exports = router;