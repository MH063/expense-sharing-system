const express = require('express');
const router = express.Router();
const adminPermissionHistoryController = require('../controllers/adminPermissionHistory-controller');
const { authenticateToken, checkRole, checkPermission } = require('../middleware/tokenManager');

// 获取权限变更历史列表
router.get('/', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionHistory
);

// 获取权限变更历史详情
router.get('/:id', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionHistoryDetail
);

// 获取用户权限变更历史
router.get('/user/:userId', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getUserPermissionHistory
);

// 获取管理员操作历史
router.get('/admin/:adminId', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getAdminOperationHistory
);

// 获取权限类型变更历史
router.get('/type/:permissionType', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionTypeHistory
);

// 获取时间范围内的权限变更历史
router.get('/date-range', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionHistoryByDateRange
);

// 获取权限变更统计
router.get('/stats', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionChangeStats
);

// 获取权限变更趋势
router.get('/trends', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionChangeTrends
);

// 获取最频繁的权限变更
router.get('/frequent', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getMostFrequentChanges
);

// 获取权限变更影响分析
router.get('/:id/impact', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionChangeImpact
);

// 导出权限变更历史
router.get('/export', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.exportPermissionHistory
);

// 批量审核权限变更
router.post('/batch-review', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.batchReviewPermissionChanges
);

// 撤销权限变更
router.post('/:id/revert', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.revertPermissionChange
);

// 获取权限变更审计日志
router.get('/:id/audit-logs', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionAuditLogs
);

// 获取权限变更风险评估
router.get('/:id/risk-assessment', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionChangeRiskAssessment
);

// 获取权限变更建议
router.get('/:id/recommendations', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionChangeRecommendations
);

// 权限变更模板路由
router.get('/templates', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionChangeTemplates
);

router.post('/templates', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.createPermissionChangeTemplate
);

router.put('/templates/:id', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.updatePermissionChangeTemplate
);

router.delete('/templates/:id', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.deletePermissionChangeTemplate
);

// 权限变更自动化规则路由
router.get('/automation-rules', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionAutomationRules
);

router.post('/automation-rules', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.createPermissionAutomationRule
);

router.put('/automation-rules/:id', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.updatePermissionAutomationRule
);

router.delete('/automation-rules/:id', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.deletePermissionAutomationRule
);

router.patch('/automation-rules/:id/toggle', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.togglePermissionAutomationRule
);

// 权限变更通知设置路由
router.get('/notification-settings', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionNotificationSettings
);

router.put('/notification-settings', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.updatePermissionNotificationSettings
);

router.post('/test-notification', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.testPermissionNotification
);

// 权限变更备份路由
router.get('/backups', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.getPermissionChangeBackups
);

router.post('/backups', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.createPermissionChangeBackup
);

router.post('/backups/:id/restore', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.restorePermissionChangeBackup
);

router.delete('/backups/:id', 
  authenticateToken, 
  checkRole('admin'), 
  adminPermissionHistoryController.deletePermissionChangeBackup
);

module.exports = router;