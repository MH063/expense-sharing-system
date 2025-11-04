import request from '../request'

/**
 * 角色管理相关API
 */
export const roleApi = {
  // 获取角色列表
  getRoleList: () => {
    return request({
      url: '/api/admin/roles',
      method: 'get'
    })
  },
  
  // 获取角色详情
  getRoleDetail: (id) => {
    return request({
      url: `/api/admin/roles/${id}`,
      method: 'get'
    })
  },
  
  // 创建角色
  createRole: (data) => {
    return request({
      url: '/api/admin/roles',
      method: 'post',
      data
    })
  },
  
  // 更新角色
  updateRole: (id, data) => {
    return request({
      url: `/api/admin/roles/${id}`,
      method: 'put',
      data
    })
  },
  
  // 删除角色
  deleteRole: (id) => {
    return request({
      url: `/api/admin/roles/${id}`,
      method: 'delete'
    })
  },
  
  // 获取用户角色列表
  getUserRoleList: (params) => {
    return request({
      url: '/api/admin/user-roles',
      method: 'get',
      params
    })
  },
  
  // 分配角色
  assignRole: (data) => {
    return request({
      url: '/api/admin/user-roles/assign',
      method: 'post',
      data
    })
  },
  
  // 更改用户角色
  changeUserRole: (userId, roleId) => {
    return request({
      url: `/api/admin/user-roles/${userId}/change`,
      method: 'put',
      data: { roleId }
    })
  },
  
  // 移除用户角色
  removeUserRole: (userId) => {
    return request({
      url: `/api/admin/user-roles/${userId}`,
      method: 'delete'
    })
  },
  
  // 获取可分配用户列表
  getAvailableUsers: () => {
    return request({
      url: '/api/admin/users/available',
      method: 'get'
    })
  }
}

/**
 * 用户管理相关API
 */
export const userApi = {
  // 获取用户列表
  getUserList: (params) => {
    return request({
      url: '/api/admin/users',
      method: 'get',
      params
    })
  },
  
  // 获取用户详情
  getUserDetail: (id) => {
    return request({
      url: `/api/admin/users/${id}`,
      method: 'get'
    })
  },
  
  // 创建用户
  createUser: (data) => {
    return request({
      url: '/api/admin/users',
      method: 'post',
      data
    })
  },
  
  // 更新用户
  updateUser: (id, data) => {
    return request({
      url: `/api/admin/users/${id}`,
      method: 'put',
      data
    })
  },
  
  // 删除用户
  deleteUser: (id) => {
    return request({
      url: `/api/admin/users/${id}`,
      method: 'delete'
    })
  },
  
  // 重置用户密码
  resetUserPassword: (id) => {
    return request({
      url: `/api/admin/users/${id}/reset-password`,
      method: 'post'
    })
  },
  
  // 更新用户状态
  updateUserStatus: (id, status) => {
    return request({
      url: `/api/admin/users/${id}/status`,
      method: 'put',
      data: { status }
    })
  }
}

/**
 * 费用审核相关API
 */
export const expenseApi = {
  // 获取待审核费用列表
  getPendingExpenses: (params) => {
    return request({
      url: '/api/admin/expenses/pending',
      method: 'get',
      params
    })
  },
  
  // 获取费用审核历史
  getExpenseReviewHistory: (params) => {
    return request({
      url: '/api/admin/expenses/review-history',
      method: 'get',
      params
    })
  },
  
  // 审核费用
  reviewExpense: (id, data) => {
    return request({
      url: `/api/admin/expenses/${id}/review`,
      method: 'post',
      data
    })
  },
  
  // 批量审核费用
  batchReviewExpenses: (data) => {
    return request({
      url: '/api/admin/expenses/batch-review',
      method: 'post',
      data
    })
  },
  
  // 获取异常费用列表
  getAbnormalExpenses: (params) => {
    return request({
      url: '/api/admin/expenses/abnormal',
      method: 'get',
      params
    })
  }
}

/**
 * 数据统计相关API
 */
export const statisticsApi = {
  // 获取系统概览数据
  getSystemOverview: () => {
    return request({
      url: '/api/admin/statistics/overview',
      method: 'get'
    })
  },
  
  // 获取用户统计数据
  getUserStatistics: (params) => {
    return request({
      url: '/api/admin/statistics/users',
      method: 'get',
      params
    })
  },
  
  // 获取费用统计数据
  getExpenseStatistics: (params) => {
    return request({
      url: '/api/admin/statistics/expenses',
      method: 'get',
      params
    })
  },
  
  // 获取寝室统计数据
  getDormStatistics: (params) => {
    return request({
      url: '/api/admin/statistics/dorms',
      method: 'get',
      params
    })
  },
  
  // 获取系统使用趋势
  getSystemTrends: (params) => {
    return request({
      url: '/api/admin/statistics/trends',
      method: 'get',
      params
    })
  }
}

/**
 * 系统设置相关API
 */
export const systemApi = {
  // 获取系统配置
  getSystemConfig: () => {
    return request({
      url: '/api/admin/system/config',
      method: 'get'
    })
  },
  
  // 更新系统配置
  updateSystemConfig: (data) => {
    return request({
      url: '/api/admin/system/config',
      method: 'put',
      data
    })
  },
  
  // 获取分摊规则
  getSharingRules: () => {
    return request({
      url: '/api/admin/system/sharing-rules',
      method: 'get'
    })
  },
  
  // 更新分摊规则
  updateSharingRules: (data) => {
    return request({
      url: '/api/admin/system/sharing-rules',
      method: 'put',
      data
    })
  },
  
  // 获取通知模板
  getNotificationTemplates: () => {
    return request({
      url: '/api/admin/system/notification-templates',
      method: 'get'
    })
  },
  
  // 更新通知模板
  updateNotificationTemplates: (data) => {
    return request({
      url: '/api/admin/system/notification-templates',
      method: 'put',
      data
    })
  },
  
  // 备份系统数据
  backupSystem: () => {
    return request({
      url: '/api/admin/system/backup',
      method: 'post'
    })
  },
  
  // 恢复系统数据
  restoreSystem: (data) => {
    return request({
      url: '/api/admin/system/restore',
      method: 'post',
      data
    })
  }
}