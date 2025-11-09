const request = require('../utils/request');

/**
 * 管理员权限变更历史API
 */
const adminPermissionHistoryApi = {
  // 获取权限变更历史列表
  getPermissionHistory: (params = {}) => {
    return request.get('/api/admin/permission-history', { params });
  },

  // 获取权限变更历史详情
  getPermissionHistoryDetail: (id) => {
    return request.get(`/api/admin/permission-history/${id}`);
  },

  // 获取用户权限变更历史
  getUserPermissionHistory: (userId, params = {}) => {
    return request.get(`/api/admin/permission-history/user/${userId}`, { params });
  },

  // 获取管理员操作历史
  getAdminOperationHistory: (adminId, params = {}) => {
    return request.get(`/api/admin/permission-history/admin/${adminId}`, { params });
  },

  // 获取权限类型变更历史
  getPermissionTypeHistory: (permissionType, params = {}) => {
    return request.get(`/api/admin/permission-history/type/${permissionType}`, { params });
  },

  // 获取时间范围内的权限变更历史
  getPermissionHistoryByDateRange: (startDate, endDate, params = {}) => {
    return request.get('/api/admin/permission-history/date-range', {
      params: { startDate, endDate, ...params }
    });
  },

  // 获取权限变更统计
  getPermissionChangeStats: (params = {}) => {
    return request.get('/api/admin/permission-history/stats', { params });
  },

  // 获取权限变更趋势
  getPermissionChangeTrends: (params = {}) => {
    return request.get('/api/admin/permission-history/trends', { params });
  },

  // 获取最频繁的权限变更
  getMostFrequentChanges: (params = {}) => {
    return request.get('/api/admin/permission-history/frequent', { params });
  },

  // 获取权限变更影响分析
  getPermissionChangeImpact: (id) => {
    return request.get(`/api/admin/permission-history/${id}/impact`);
  },

  // 导出权限变更历史
  exportPermissionHistory: (params = {}) => {
    return request.get('/api/admin/permission-history/export', { 
      params,
      responseType: 'blob'
    });
  },

  // 批量审核权限变更
  batchReviewPermissionChanges: (data) => {
    return request.post('/api/admin/permission-history/batch-review', data);
  },

  // 撤销权限变更
  revertPermissionChange: (id, reason) => {
    return request.post(`/api/admin/permission-history/${id}/revert`, { reason });
  },

  // 获取权限变更审计日志
  getPermissionAuditLogs: (id, params = {}) => {
    return request.get(`/api/admin/permission-history/${id}/audit-logs`, { params });
  },

  // 获取权限变更风险评估
  getPermissionChangeRiskAssessment: (id) => {
    return request.get(`/api/admin/permission-history/${id}/risk-assessment`);
  },

  // 获取权限变更建议
  getPermissionChangeRecommendations: (id) => {
    return request.get(`/api/admin/permission-history/${id}/recommendations`);
  },

  // 获取权限变更模板
  getPermissionChangeTemplates: (params = {}) => {
    return request.get('/api/admin/permission-history/templates', { params });
  },

  // 创建权限变更模板
  createPermissionChangeTemplate: (data) => {
    return request.post('/api/admin/permission-history/templates', data);
  },

  // 更新权限变更模板
  updatePermissionChangeTemplate: (id, data) => {
    return request.put(`/api/admin/permission-history/templates/${id}`, data);
  },

  // 删除权限变更模板
  deletePermissionChangeTemplate: (id) => {
    return request.delete(`/api/admin/permission-history/templates/${id}`);
  },

  // 获取权限变更自动化规则
  getPermissionAutomationRules: (params = {}) => {
    return request.get('/api/admin/permission-history/automation-rules', { params });
  },

  // 创建权限变更自动化规则
  createPermissionAutomationRule: (data) => {
    return request.post('/api/admin/permission-history/automation-rules', data);
  },

  // 更新权限变更自动化规则
  updatePermissionAutomationRule: (id, data) => {
    return request.put(`/api/admin/permission-history/automation-rules/${id}`, data);
  },

  // 删除权限变更自动化规则
  deletePermissionAutomationRule: (id) => {
    return request.delete(`/api/admin/permission-history/automation-rules/${id}`);
  },

  // 启用/禁用权限变更自动化规则
  togglePermissionAutomationRule: (id, enabled) => {
    return request.patch(`/api/admin/permission-history/automation-rules/${id}/toggle`, { enabled });
  },

  // 获取权限变更通知设置
  getPermissionNotificationSettings: () => {
    return request.get('/api/admin/permission-history/notification-settings');
  },

  // 更新权限变更通知设置
  updatePermissionNotificationSettings: (data) => {
    return request.put('/api/admin/permission-history/notification-settings', data);
  },

  // 测试权限变更通知
  testPermissionNotification: (data) => {
    return request.post('/api/admin/permission-history/test-notification', data);
  },

  // 获取权限变更备份
  getPermissionChangeBackups: (params = {}) => {
    return request.get('/api/admin/permission-history/backups', { params });
  },

  // 创建权限变更备份
  createPermissionChangeBackup: (data) => {
    return request.post('/api/admin/permission-history/backups', data);
  },

  // 恢复权限变更备份
  restorePermissionChangeBackup: (id) => {
    return request.post(`/api/admin/permission-history/backups/${id}/restore`);
  },

  // 删除权限变更备份
  deletePermissionChangeBackup: (id) => {
    return request.delete(`/api/admin/permission-history/backups/${id}`);
  }
};

module.exports = adminPermissionHistoryApi;