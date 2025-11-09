import request from '../utils/request';

/**
 * 权限管理API
 * 提供权限相关的接口调用方法
 */
const permissionApi = {
  /**
   * 获取权限列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.search - 搜索关键词
   * @param {string} params.module - 模块名称
   * @param {boolean} params.status - 状态
   * @returns {Promise} 返回权限列表
   */
  getPermissions(params = {}) {
    console.log('获取权限列表，参数:', params);
    return request.get('/permissions', { params });
  },

  /**
   * 获取权限详情
   * @param {string} id - 权限ID
   * @returns {Promise} 返回权限详情
   */
  getPermissionById(id) {
    console.log('获取权限详情，ID:', id);
    return request.get(`/permissions/${id}`);
  },

  /**
   * 创建权限
   * @param {Object} data - 权限数据
   * @param {string} data.name - 权限名称
   * @param {string} data.description - 权限描述
   * @param {string} data.module - 所属模块
   * @param {boolean} data.status - 状态
   * @returns {Promise} 返回创建结果
   */
  createPermission(data) {
    console.log('创建权限，数据:', data);
    return request.post('/permissions', data);
  },

  /**
   * 更新权限
   * @param {string} id - 权限ID
   * @param {Object} data - 权限数据
   * @param {string} data.name - 权限名称
   * @param {string} data.description - 权限描述
   * @param {string} data.module - 所属模块
   * @param {boolean} data.status - 状态
   * @returns {Promise} 返回更新结果
   */
  updatePermission(id, data) {
    console.log('更新权限，ID:', id, '数据:', data);
    return request.put(`/permissions/${id}`, data);
  },

  /**
   * 删除权限
   * @param {string} id - 权限ID
   * @returns {Promise} 返回删除结果
   */
  deletePermission(id) {
    console.log('删除权限，ID:', id);
    return request.delete(`/permissions/${id}`);
  },

  /**
   * 批量更新权限状态
   * @param {Array} permissionIds - 权限ID列表
   * @param {boolean} status - 状态
   * @returns {Promise} 返回更新结果
   */
  batchUpdatePermissionStatus(permissionIds, status) {
    console.log('批量更新权限状态，权限ID:', permissionIds, '状态:', status);
    return request.patch('/permissions/batch-status', { permissionIds, status });
  },

  /**
   * 获取角色权限映射
   * @param {string} roleId - 角色ID（可选）
   * @returns {Promise} 返回角色权限映射
   */
  getRolePermissionMapping(roleId) {
    console.log('获取角色权限映射，角色ID:', roleId);
    const params = roleId ? { roleId } : {};
    return request.get('/permissions/role-mapping', { params });
  },

  /**
   * 更新角色权限映射
   * @param {string} roleId - 角色ID
   * @param {Array} permissionIds - 权限ID列表
   * @returns {Promise} 返回更新结果
   */
  updateRolePermissionMapping(roleId, permissionIds) {
    console.log('更新角色权限映射，角色ID:', roleId, '权限ID:', permissionIds);
    return request.put(`/permissions/role-mapping/${roleId}`, { permissionIds });
  },

  /**
   * 获取用户权限
   * @param {string} userId - 用户ID
   * @returns {Promise} 返回用户权限
   */
  getUserPermissions(userId) {
    console.log('获取用户权限，用户ID:', userId);
    return request.get(`/permissions/user/${userId}`);
  },

  /**
   * 分配权限给用户
   * @param {string} userId - 用户ID
   * @param {Array} permissionIds - 权限ID列表
   * @returns {Promise} 返回分配结果
   */
  assignPermissionsToUser(userId, permissionIds) {
    console.log('分配权限给用户，用户ID:', userId, '权限ID:', permissionIds);
    return request.post(`/permissions/user/${userId}/assign`, { permissionIds });
  },

  /**
   * 移除用户权限
   * @param {string} userId - 用户ID
   * @param {Array} permissionIds - 权限ID列表（可选，不提供则移除所有权限）
   * @returns {Promise} 返回移除结果
   */
  revokePermissionsFromUser(userId, permissionIds) {
    console.log('移除用户权限，用户ID:', userId, '权限ID:', permissionIds);
    const data = permissionIds ? { permissionIds } : {};
    return request.delete(`/permissions/user/${userId}/revoke`, { data });
  },

  /**
   * 获取权限使用统计
   * @returns {Promise} 返回权限使用统计
   */
  getPermissionUsageStats() {
    console.log('获取权限使用统计');
    return request.get('/permissions/stats/usage');
  }
};

// 导出API对象
export default permissionApi;

// 单独导出各个方法，保持向后兼容
export const {
  getPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  batchUpdatePermissionStatus,
  getRolePermissionMapping,
  updateRolePermissionMapping,
  getUserPermissions,
  assignPermissionsToUser,
  revokePermissionsFromUser,
  getPermissionUsageStats
} = permissionApi;