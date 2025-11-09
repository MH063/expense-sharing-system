const express = require('express');
const router = express.Router();
const adminOperationRestrictionController = require('../controllers/adminOperationRestriction-controller');
const { authenticateToken, checkRole, checkPermission } = require('../middleware/tokenManager');

// 获取操作限制列表
router.get('/', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictions);

// 获取操作限制详情
router.get('/:id', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictionById);

// 创建操作限制
router.post('/', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.createRestriction);

// 更新操作限制
router.put('/:id', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.updateRestriction);

// 删除操作限制
router.delete('/:id', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.deleteRestriction);

// 启用/禁用操作限制
router.patch('/:id/toggle', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.toggleRestriction);

// 获取操作限制统计
router.get('/stats', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictionStats);

// 获取操作限制日志
router.get('/logs', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictionLogs);

// 获取操作限制类型
router.get('/types', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictionTypes);

// 批量更新操作限制
router.put('/batch', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.batchUpdateRestrictions);

// 获取用户操作限制
router.get('/user/:userId', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getUserRestrictions);

// 设置用户操作限制
router.post('/user/:userId', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.setUserRestrictions);

// 获取操作限制模板
router.get('/templates', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictionTemplates);

// 应用操作限制模板
router.post('/templates/:templateId/apply', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.applyRestrictionTemplate);

// 获取操作限制违规记录
router.get('/violations', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictionViolations);

// 处理操作限制违规
router.post('/violations/:violationId/handle', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.handleRestrictionViolation);

// 获取操作限制趋势
router.get('/trends', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictionTrends);

// 导出操作限制数据
router.get('/export', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['export_data']), adminOperationRestrictionController.exportRestrictions);

// 导入操作限制数据
router.post('/import', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['import_data']), adminOperationRestrictionController.importRestrictions);

// 获取操作限制配置
router.get('/config', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.getRestrictionConfig);

// 更新操作限制配置
router.put('/config', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.updateRestrictionConfig);

// 测试操作限制
router.post('/test', authenticateToken, checkRole(['admin', 'superadmin']), adminOperationRestrictionController.testRestriction);

// 重置操作限制统计
router.post('/stats/reset', authenticateToken, checkRole(['admin', 'superadmin']), checkPermission(['manage_restrictions']), adminOperationRestrictionController.resetRestrictionStats);

module.exports = router;