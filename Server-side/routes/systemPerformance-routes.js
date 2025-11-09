/**
 * 系统性能监控路由
 * 处理系统性能监控相关的API请求
 */

const express = require('express');
const router = express.Router();
const systemPerformanceController = require('../controllers/systemPerformanceController');
const { authenticateAdmin, authorizeAdmin } = require('../middleware/adminAuth');

// 应用管理员认证和授权中间件
router.use(authenticateAdmin);
router.use(authorizeAdmin('system_performance', 'read'));

/**
 * 系统性能概览
 * GET /api/admin/system-performance/overview
 */
router.get('/overview', systemPerformanceController.getSystemPerformanceOverview);

/**
 * CPU使用率数据
 * GET /api/admin/system-performance/cpu
 */
router.get('/cpu', systemPerformanceController.getCpuUsageData);

/**
 * 内存使用率数据
 * GET /api/admin/system-performance/memory
 */
router.get('/memory', systemPerformanceController.getMemoryUsageData);

/**
 * 磁盘使用情况
 * GET /api/admin/system-performance/disk
 */
router.get('/disk', systemPerformanceController.getDiskUsageData);

/**
 * 网络流量数据
 * GET /api/admin/system-performance/network
 */
router.get('/network', systemPerformanceController.getNetworkTrafficData);

/**
 * 数据库性能数据
 * GET /api/admin/system-performance/database
 */
router.get('/database', systemPerformanceController.getDatabasePerformanceData);

/**
 * 应用程序性能数据
 * GET /api/admin/system-performance/application
 */
router.get('/application', systemPerformanceController.getApplicationPerformanceData);

/**
 * 性能警报列表
 * GET /api/admin/system-performance/alerts
 */
router.get('/alerts', systemPerformanceController.getPerformanceAlerts);

/**
 * 性能警报详情
 * GET /api/admin/system-performance/alerts/:alertId
 */
router.get('/alerts/:alertId', systemPerformanceController.getPerformanceAlertDetail);

/**
 * 确认性能警报
 * PUT /api/admin/system-performance/alerts/:alertId/acknowledge
 */
router.put('/alerts/:alertId/acknowledge', 
  authorizeAdmin('system_performance', 'update'),
  systemPerformanceController.acknowledgePerformanceAlert
);

/**
 * 解决性能警报
 * PUT /api/admin/system-performance/alerts/:alertId/resolve
 */
router.put('/alerts/:alertId/resolve', 
  authorizeAdmin('system_performance', 'update'),
  systemPerformanceController.resolvePerformanceAlert
);

/**
 * 性能报告列表
 * GET /api/admin/system-performance/reports
 */
router.get('/reports', systemPerformanceController.getPerformanceReports);

/**
 * 生成性能报告
 * POST /api/admin/system-performance/reports
 */
router.post('/reports', 
  authorizeAdmin('system_performance', 'create'),
  systemPerformanceController.generatePerformanceReport
);

/**
 * 下载性能报告
 * GET /api/admin/system-performance/reports/:reportId/download
 */
router.get('/reports/:reportId/download', systemPerformanceController.downloadPerformanceReport);

/**
 * 获取性能配置
 * GET /api/admin/system-performance/config
 */
router.get('/config', systemPerformanceController.getPerformanceConfig);

/**
 * 更新性能配置
 * PUT /api/admin/system-performance/config
 */
router.put('/config', 
  authorizeAdmin('system_performance', 'update'),
  systemPerformanceController.updatePerformanceConfig
);

/**
 * 性能趋势数据
 * GET /api/admin/system-performance/trends
 */
router.get('/trends', systemPerformanceController.getPerformanceTrends);

/**
 * 性能基准数据
 * GET /api/admin/system-performance/baselines
 */
router.get('/baselines', systemPerformanceController.getPerformanceBaselines);

/**
 * 创建性能基准
 * POST /api/admin/system-performance/baselines
 */
router.post('/baselines', 
  authorizeAdmin('system_performance', 'create'),
  systemPerformanceController.createPerformanceBaseline
);

/**
 * 删除性能基准
 * DELETE /api/admin/system-performance/baselines/:baselineId
 */
router.delete('/baselines/:baselineId', 
  authorizeAdmin('system_performance', 'delete'),
  systemPerformanceController.deletePerformanceBaseline
);

/**
 * 导出性能数据
 * POST /api/admin/system-performance/export
 */
router.post('/export', 
  authorizeAdmin('system_performance', 'export'),
  systemPerformanceController.exportPerformanceData
);

/**
 * 系统负载预测
 * GET /api/admin/system-performance/forecast
 */
router.get('/forecast', systemPerformanceController.getSystemLoadForecast);

/**
 * 性能优化建议
 * GET /api/admin/system-performance/optimization
 */
router.get('/optimization', systemPerformanceController.getPerformanceOptimizationSuggestions);

/**
 * 应用性能优化建议
 * POST /api/admin/system-performance/optimization/:suggestionId/apply
 */
router.post('/optimization/:suggestionId/apply', 
  authorizeAdmin('system_performance', 'update'),
  systemPerformanceController.applyPerformanceOptimization
);

module.exports = router;