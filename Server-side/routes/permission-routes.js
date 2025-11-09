const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission-controller');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');

/**
 * 权限管理路由
 * 处理系统权限的增删改查操作
 */

// 获取权限列表 - 需要管理员权限
router.get('/', authenticateToken, checkRole(['admin']), permissionController.getPermissions);

// 获取权限详情 - 需要管理员权限
router.get('/:id', authenticateToken, checkRole(['admin']), permissionController.getPermissionById);

// 创建权限 - 需要超级管理员权限
router.post('/', authenticateToken, checkRole(['super_admin']), permissionController.createPermission);

// 更新权限 - 需要超级管理员权限
router.put('/:id', authenticateToken, checkRole(['super_admin']), permissionController.updatePermission);

// 删除权限 - 需要超级管理员权限
router.delete('/:id', authenticateToken, checkRole(['super_admin']), permissionController.deletePermission);

// 批量更新权限状态 - 需要超级管理员权限
router.patch('/batch-status', authenticateToken, checkRole(['super_admin']), permissionController.batchUpdatePermissionStatus);

// 获取角色权限映射 - 需要管理员权限
router.get('/role-mapping', authenticateToken, checkRole(['admin']), permissionController.getRolePermissionMapping);

// 更新角色权限映射 - 需要超级管理员权限
router.put('/role-mapping/:roleId', authenticateToken, checkRole(['super_admin']), permissionController.updateRolePermissionMapping);

// 获取用户权限 - 需要管理员权限或查看自己
router.get('/user/:userId', authenticateToken, permissionController.getUserPermissions);

// 分配权限给用户 - 需要管理员权限
router.post('/user/:userId/assign', authenticateToken, checkRole(['admin']), permissionController.assignPermissionsToUser);

// 移除用户权限 - 需要管理员权限
router.delete('/user/:userId/revoke', authenticateToken, checkRole(['admin']), permissionController.revokePermissionsFromUser);

// 获取权限使用统计 - 需要管理员权限
router.get('/stats/usage', authenticateToken, checkRole(['admin']), permissionController.getPermissionUsageStats);

module.exports = router;