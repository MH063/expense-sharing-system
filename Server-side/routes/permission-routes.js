const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission-controller');
const { auth, authorize } = require('../middleware/auth');

/**
 * 权限管理路由
 * 处理系统权限的增删改查操作
 */

// 获取权限列表 - 需要管理员权限
router.get('/', auth, authorize('admin', 'permissions:read'), permissionController.getPermissions);

// 获取权限详情 - 需要管理员权限
router.get('/:id', auth, authorize('admin', 'permissions:read'), permissionController.getPermissionById);

// 创建权限 - 需要超级管理员权限
router.post('/', auth, authorize('super_admin', 'permissions:create'), permissionController.createPermission);

// 更新权限 - 需要超级管理员权限
router.put('/:id', auth, authorize('super_admin', 'permissions:update'), permissionController.updatePermission);

// 删除权限 - 需要超级管理员权限
router.delete('/:id', auth, authorize('super_admin', 'permissions:delete'), permissionController.deletePermission);

// 批量更新权限状态 - 需要超级管理员权限
router.patch('/batch-status', auth, authorize('super_admin', 'permissions:update'), permissionController.batchUpdatePermissionStatus);

// 获取角色权限映射 - 需要管理员权限
router.get('/role-mapping', auth, authorize('admin', 'permissions:read'), permissionController.getRolePermissionMapping);

// 更新角色权限映射 - 需要超级管理员权限
router.put('/role-mapping/:roleId', auth, authorize('super_admin', 'permissions:update'), permissionController.updateRolePermissionMapping);

// 获取用户权限 - 需要管理员权限或查看自己
router.get('/user/:userId', auth, permissionController.getUserPermissions);

// 分配权限给用户 - 需要管理员权限
router.post('/user/:userId/assign', auth, authorize('admin', 'permissions:update'), permissionController.assignPermissionsToUser);

// 移除用户权限 - 需要管理员权限
router.delete('/user/:userId/revoke', auth, authorize('admin', 'permissions:update'), permissionController.revokePermissionsFromUser);

// 获取权限使用统计 - 需要管理员权限
router.get('/stats/usage', auth, authorize('admin', 'permissions:read'), permissionController.getPermissionUsageStats);

module.exports = router;