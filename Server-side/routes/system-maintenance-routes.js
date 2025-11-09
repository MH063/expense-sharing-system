/**
 * 系统维护路由
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, checkRole } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');
const SystemMaintenanceController = require('../controllers/system-maintenance-controller');

// 系统维护任务相关路由
router.get('/tasks', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getMaintenanceTasks(req, res);
});

router.get('/tasks/:id', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getMaintenanceTaskById(req, res);
});

router.post('/tasks', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.createMaintenanceTask(req, res);
});

router.put('/tasks/:id', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.updateMaintenanceTask(req, res);
});

router.delete('/tasks/:id', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.deleteMaintenanceTask(req, res);
});

router.post('/tasks/:id/execute', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.executeMaintenanceTask(req, res);
});

// 维护报告相关路由
router.get('/reports', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getMaintenanceReports(req, res);
});

router.get('/reports/:id', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getMaintenanceReportById(req, res);
});

router.post('/reports/generate', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.generateMaintenanceReport(req, res);
});

router.get('/reports/:id/export', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.exportMaintenanceReport(req, res);
});

// 备份相关路由
router.get('/backups', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getBackups(req, res);
});

router.post('/backups/create', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.createBackup(req, res);
});

router.post('/backups/:id/restore', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.restoreBackup(req, res);
});

router.delete('/backups/:id', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.deleteBackup(req, res);
});

// 系统健康检查
router.get('/health', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getSystemHealth(req, res);
});

// 性能指标
router.get('/performance', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getPerformanceMetrics(req, res);
});

// 错误日志
router.get('/error-logs', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getErrorLogs(req, res);
});

// 警告管理
router.get('/warnings', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getWarnings(req, res);
});

router.post('/warnings/:id/resolve', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.resolveWarning(req, res);
});

// 系统配置
router.get('/config', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getSystemConfig(req, res);
});

router.put('/config', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.updateSystemConfig(req, res);
});

// 系统信息
router.get('/info', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getSystemInfo(req, res);
});

// 系统维护日志
router.get('/logs', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  SystemMaintenanceController.getMaintenanceLogs(req, res);
});

// 清理系统缓存
router.post('/clear-cache', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.clearSystemCache(req, res);
});

// 清理临时文件
router.post('/cleanup-temp', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.cleanupTempFiles(req, res);
});

// 数据库优化
router.post('/optimize-database', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.optimizeDatabase(req, res);
});

// 系统重启
router.post('/restart', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  SystemMaintenanceController.restartSystem(req, res);
});

module.exports = router;