const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const rolePermissionController = require('../controllers/role-controller');

/**
 * @description 获取角色列表
 * @route GET /admin/roles
 * @access Private (Admin)
 */
router.get('/roles',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('name').optional().isString().withMessage('角色名称必须是字符串')
  ],
  handleValidationErrors,
  rolePermissionController.getRoles
);

/**
 * @description 获取角色详情
 * @route GET /admin/roles/:id
 * @access Private (Admin)
 */
router.get('/roles/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('角色ID格式无效')
  ],
  handleValidationErrors,
  rolePermissionController.getRoleById
);

/**
 * @description 创建角色
 * @route POST /admin/roles
 * @access Private (Admin)
 */
router.post('/roles',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('角色名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('permissions').optional().isArray().withMessage('权限列表必须是数组')
  ],
  handleValidationErrors,
  rolePermissionController.createRole
);

/**
 * @description 更新角色
 * @route PUT /admin/roles/:id
 * @access Private (Admin)
 */
router.put('/roles/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('角色ID格式无效'),
    body('name').optional().notEmpty().withMessage('角色名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('permissions').optional().isArray().withMessage('权限列表必须是数组')
  ],
  handleValidationErrors,
  rolePermissionController.updateRole
);

/**
 * @description 删除角色
 * @route DELETE /admin/roles/:id
 * @access Private (Admin)
 */
router.delete('/roles/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('角色ID格式无效')
  ],
  handleValidationErrors,
  rolePermissionController.deleteRole
);

/**
 * @description 获取权限列表
 * @route GET /admin/permissions
 * @access Private (Admin)
 */
router.get('/permissions',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('resource').optional().isString().withMessage('资源名称必须是字符串')
  ],
  handleValidationErrors,
  rolePermissionController.getAllPermissions
);

/**
 * @description 获取权限详情
 * @route GET /admin/permissions/:id
 * @access Private (Admin)
 */
router.get('/permissions/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('权限ID格式无效')
  ],
  handleValidationErrors,
  rolePermissionController.getPermissionById
);

/**
 * @description 创建权限
 * @route POST /admin/permissions
 * @access Private (Admin)
 */
router.post('/permissions',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('权限名称不能为空'),
    body('resource').notEmpty().withMessage('资源名称不能为空'),
    body('action').notEmpty().withMessage('操作名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串')
  ],
  handleValidationErrors,
  rolePermissionController.createPermission
);

/**
 * @description 更新权限
 * @route PUT /admin/permissions/:id
 * @access Private (Admin)
 */
router.put('/permissions/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('权限ID格式无效'),
    body('name').optional().notEmpty().withMessage('权限名称不能为空'),
    body('resource').optional().notEmpty().withMessage('资源名称不能为空'),
    body('action').optional().notEmpty().withMessage('操作名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串')
  ],
  handleValidationErrors,
  rolePermissionController.updatePermission
);

/**
 * @description 删除权限
 * @route DELETE /admin/permissions/:id
 * @access Private (Admin)
 */
router.delete('/permissions/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('权限ID格式无效')
  ],
  handleValidationErrors,
  rolePermissionController.deletePermission
);

/**
 * @description 获取角色权限关联列表
 * @route GET /admin/role-permissions
 * @access Private (Admin)
 */
router.get('/role-permissions',
  authenticateToken,
  checkRole(['admin']),
  [
    query('role_id').optional().isUUID().withMessage('角色ID格式无效'),
    query('permission_id').optional().isUUID().withMessage('权限ID格式无效')
  ],
  handleValidationErrors,
  rolePermissionController.getRolePermissionsList
);

/**
 * @description 创建角色权限关联
 * @route POST /admin/role-permissions
 * @access Private (Admin)
 */
router.post('/role-permissions',
  authenticateToken,
  checkRole(['admin']),
  [
    body('role_id').isUUID().withMessage('角色ID格式无效'),
    body('permission_id').isUUID().withMessage('权限ID格式无效')
  ],
  handleValidationErrors,
  rolePermissionController.createRolePermission
);

/**
 * @description 删除角色权限关联
 * @route DELETE /admin/role-permissions/:roleId/:permissionId
 * @access Private (Admin)
 */
router.delete('/role-permissions/:roleId/:permissionId',
  authenticateToken,
  checkRole(['admin']),
  [
    param('roleId').isUUID().withMessage('角色ID格式无效'),
    param('permissionId').isUUID().withMessage('权限ID格式无效')
  ],
  handleValidationErrors,
  rolePermissionController.removePermissionFromRole
);

module.exports = router;