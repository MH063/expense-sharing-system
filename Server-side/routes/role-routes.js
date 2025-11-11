const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { 
  roleValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');
const { roleCache } = require('../middleware/cache-middleware');
const { 
  checkPermission, 
  checkRole, 
  checkAnyPermission 
} = require('../middleware/enhanced-permission-middleware');

// 获取角色列表 - 需要认证和查看角色权限
router.get('/', 
  authenticateToken, 
  checkPermission('role:view'), 
  roleCache.getRoles, 
  roleController.getRoles
);

// 获取角色详情 - 需要认证和查看角色权限
router.get('/:id', 
  authenticateToken, 
  checkPermission('role:view'), 
  roleCache.getRole, 
  roleController.getRoleById
);

// 创建角色 - 需要认证和创建角色权限
router.post(
  '/',
  authenticateToken,
  checkPermission('role:create'),
  roleCache.clearRoles,
  roleValidationRules.createRole,
  handleValidationErrors,
  roleController.createRole
);

// 更新角色 - 需要认证和编辑角色权限
router.put(
  '/:id',
  authenticateToken,
  checkPermission('role:edit'),
  roleCache.clearRole,
  roleValidationRules.updateRole,
  handleValidationErrors,
  roleController.updateRole
);

// 删除角色 - 需要认证和删除角色权限
router.delete('/:id', 
  authenticateToken, 
  checkPermission('role:delete'), 
  roleCache.clearRole, 
  roleController.deleteRole
);

// 获取角色权限 - 需要认证和查看角色权限
router.get('/:id/permissions', 
  authenticateToken, 
  checkPermission('role:view'), 
  roleCache.getRole, 
  roleController.getRolePermissions
);

// 分配权限给角色 - 需要认证和编辑角色权限
router.post(
  '/:id/permissions',
  authenticateToken,
  checkPermission('role:edit'),
  roleCache.clearRole,
  roleValidationRules.assignPermission,
  handleValidationErrors,
  roleController.assignPermissionToRole
);

// 移除角色权限 - 需要认证和编辑角色权限
router.delete('/:id/permissions/:permissionId', 
  authenticateToken, 
  checkPermission('role:edit'), 
  roleCache.clearRole, 
  roleController.removePermissionFromRole
);

// 获取所有权限 - 需要认证和查看权限权限
router.get('/permissions/all', 
  authenticateToken, 
  checkPermission('permission:view'), 
  roleController.getAllPermissions
);

// 获取权限详情 - 需要认证和查看权限权限
router.get('/permissions/:id', 
  authenticateToken, 
  checkPermission('permission:view'), 
  roleController.getPermissionById
);

// 创建权限 - 需要认证和创建权限权限
router.post('/permissions', 
  authenticateToken, 
  checkPermission('permission:create'), 
  roleValidationRules.createPermission,
  handleValidationErrors,
  roleController.createPermission
);

// 更新权限 - 需要认证和编辑权限权限
router.put('/permissions/:id', 
  authenticateToken, 
  checkPermission('permission:edit'), 
  roleValidationRules.updatePermission,
  handleValidationErrors,
  roleController.updatePermission
);

// 删除权限 - 需要认证和删除权限权限
router.delete('/permissions/:id', 
  authenticateToken, 
  checkPermission('permission:delete'), 
  roleController.deletePermission
);

// 获取角色权限关联列表 - 需要认证和查看角色权限
router.get('/role-permissions', 
  authenticateToken, 
  checkPermission('role:view'), 
  roleCache.getRoles,
  roleController.getRolePermissionsList
);

// 创建角色权限关联 - 需要认证和编辑角色权限
router.post('/role-permissions', 
  authenticateToken, 
  checkPermission('role:edit'), 
  roleCache.clearRoles,
  roleValidationRules.createRolePermission,
  handleValidationErrors,
  roleController.createRolePermission
);

module.exports = router;