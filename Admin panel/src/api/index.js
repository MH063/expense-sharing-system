import request from '../request'

/**
 * 管理员认证相关API
 */
export const adminAuthApi = {
  // 管理员登录
  login: (data) => {
    return request({
      url: '/admin/auth/login',  // 移除了 /api 前缀，因为 baseURL 已设置为 /api
      method: 'post',
      data
    })
  }
}

/**
 * 角色管理相关API
 */
export const roleApi = {
  // 获取角色列表
  getRoleList: () => {
    return request({
      url: '/admin/roles',  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 获取角色详情
  getRoleDetail: (id) => {
    return request({
      url: `/admin/roles/${id}`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 创建角色
  createRole: (data) => {
    return request({
      url: '/admin/roles',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 更新角色
  updateRole: (id, data) => {
    return request({
      url: `/admin/roles/${id}`,  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 删除角色
  deleteRole: (id) => {
    return request({
      url: `/admin/roles/${id}`,  // 移除了 /api 前缀
      method: 'delete'
    })
  },
  
  // 获取权限列表
  getPermissionList: () => {
    return request({
      url: '/admin/permissions',  // 移除了 /api 前缀
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
      url: '/admin/users',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取用户详情
  getUserDetail: (id) => {
    return request({
      url: `/admin/users/${id}`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 创建用户
  createUser: (data) => {
    return request({
      url: '/admin/users',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 更新用户
  updateUser: (id, data) => {
    return request({
      url: `/admin/users/${id}`,  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 更新用户状态
  updateUserStatus: (id, status) => {
    return request({
      url: `/admin/users/${id}/status`,  // 移除了 /api 前缀
      method: 'put',
      data: { status }
    })
  },
  
  // 重置用户密码
  resetUserPassword: (id) => {
    return request({
      url: `/admin/users/${id}/reset-password`,  // 移除了 /api 前缀
      method: 'post'
    })
  },
  
  // 删除用户
  deleteUser: (id) => {
    return request({
      url: `/admin/users/${id}`,  // 移除了 /api 前缀
      method: 'delete'
    })
  },
  
  // 分配角色
  assignRole: (userId, data) => {
    return request({
      url: `/admin/users/${userId}/roles`,  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 获取用户角色
  getUserRoles: (userId) => {
    return request({
      url: `/admin/users/${userId}/roles`,  // 移除了 /api 前缀
      method: 'get'
    })
  }
}

/**
 * 账单管理相关API
 */
export const billApi = {
  // 获取账单列表
  getBillList: (params) => {
    return request({
      url: '/admin/bills',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取账单详情
  getBillDetail: (id) => {
    return request({
      url: `/admin/bills/${id}`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 更新账单
  updateBill: (id, data) => {
    return request({
      url: `/admin/bills/${id}`,  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 删除账单
  deleteBill: (id) => {
    return request({
      url: `/admin/bills/${id}`,  // 移除了 /api 前缀
      method: 'delete'
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
      url: '/admin/expenses',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取费用详情
  getExpenseDetail: (id) => {
    return request({
      url: `/admin/expenses/${id}`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 审核费用
  reviewExpense: (id, data) => {
    return request({
      url: `/admin/expenses/${id}/review`,  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 获取异常支出列表
  getAbnormalExpenses: (params) => {
    return request({
      url: '/abnormal-expenses',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 更新异常支出状态
  updateAbnormalExpenseStatus: (id, data) => {
    return request({
      url: `/abnormal-expenses/${id}/status`,  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 获取异常支出统计
  getAbnormalExpenseStats: (params) => {
    return request({
      url: '/abnormal-expenses/stats',  // 移除了 /api 前缀
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
      url: '/stats/system',  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 获取用户统计数据
  getUserStatistics: (params) => {
    return request({
      url: '/stats/user',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取寝室统计数据
  getDormStatistics: (params) => {
    return request({
      url: '/stats/room',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取预测数据
  getForecastData: (params) => {
    return request({
      url: '/stats/forecast',  // 移除了 /api 前缀
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
      url: '/admin/system/config',  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 更新系统配置
  updateSystemConfig: (data) => {
    return request({
      url: '/admin/system/config',  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 获取功能开关
  getFeatureFlags: () => {
    return request({
      url: '/admin/feature-flags',  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 更新功能开关
  updateFeatureFlag: (id, data) => {
    return request({
      url: `/admin/feature-flags/${id}`,  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 获取维护窗口
  getMaintenanceWindows: () => {
    return request({
      url: '/admin/maintenance-windows',  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 创建维护窗口
  createMaintenanceWindow: (data) => {
    return request({
      url: '/admin/maintenance-windows',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 获取公告列表
  getAnnouncements: () => {
    return request({
      url: '/admin/announcements',  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 创建公告
  createAnnouncement: (data) => {
    return request({
      url: '/admin/announcements',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  }
}

/**
 * 操作日志相关API
 */
export const auditLogApi = {
  // 获取操作日志
  getOperationLogs: (params) => {
    return request({
      url: '/admin/operation-logs',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取数据变更审计日志
  getDataChangeAudits: (params) => {
    return request({
      url: '/admin/data-change-audits',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  }
}

/**
 * 批量任务与报表相关API
 */
export const batchJobApi = {
  // 获取批量任务列表
  getBatchJobs: (params) => {
    return request({
      url: '/admin/batch-jobs',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 创建批量任务
  createBatchJob: (data) => {
    return request({
      url: '/admin/batch-jobs',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 获取任务详情
  getBatchJobDetail: (id) => {
    return request({
      url: `/admin/batch-jobs/${id}`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 获取报表定义列表
  getReportDefinitions: () => {
    return request({
      url: '/admin/reports',  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 创建报表定义
  createReportDefinition: (data) => {
    return request({
      url: '/admin/reports',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 获取报表快照
  getReportSnapshots: (id) => {
    return request({
      url: `/admin/reports/${id}/snapshots`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 生成报表
  generateReport: (id) => {
    return request({
      url: `/admin/reports/${id}/generate`,  // 移除了 /api 前缀
      method: 'post'
    })
  },
  
  // 获取导出任务列表
  getExportTasks: (params) => {
    return request({
      url: '/admin/exports',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 创建导出任务
  createExportTask: (data) => {
    return request({
      url: '/admin/exports',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  }
}

/**
 * 内容审核与工单相关API
 */
export const moderationApi = {
  // 获取审核队列
  getModerationQueue: (params) => {
    return request({
      url: '/admin/moderation-queue',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 处理审核
  processModeration: (id, data) => {
    return request({
      url: `/admin/moderation/${id}/process`,  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 获取工单列表
  getTickets: (params) => {
    return request({
      url: '/admin/tickets',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取工单详情
  getTicketDetail: (id) => {
    return request({
      url: `/admin/tickets/${id}`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 更新工单状态
  updateTicketStatus: (id, data) => {
    return request({
      url: `/admin/tickets/${id}/status`,  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 添加工单备注
  addTicketComment: (id, data) => {
    return request({
      url: `/admin/tickets/${id}/comments`,  // 移除了 /api 前缀
      method: 'post',
      data
    })
  }
}

/**
 * 集成与回调相关API
 */
export const webhookApi = {
  // 获取Webhook列表
  getWebhooks: () => {
    return request({
      url: '/admin/webhooks',  // 移除了 /api 前缀
      method: 'get'
       })
  },
  
  // 创建Webhook
  createWebhook: (data) => {
    return request({
      url: '/admin/webhooks',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 获取Webhook事件
  getWebhookEvents: (id) => {
    return request({
      url: `/admin/webhooks/${id}/events`,  // 移除了 /api 前缀
      method: 'get'
    })
  }
}

/**
 * 争议管理相关API
 */
export const disputeApi = {
  // 获取争议列表
  getDisputeList: (params) => {
    return request({
      url: '/admin/disputes',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取争议详情
  getDisputeDetail: (id) => {
    return request({
      url: `/admin/disputes/${id}`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 创建争议
  createDispute: (data) => {
    return request({
      url: '/admin/disputes',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 更新争议
  updateDispute: (id, data) => {
    return request({
      url: `/admin/disputes/${id}`,  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 删除争议
  deleteDispute: (id) => {
    return request({
      url: `/admin/disputes/${id}`,  // 移除了 /api 前缀
      method: 'delete'
    })
  },
  
  // 分配处理人
  assignHandler: (id, data) => {
    return request({
      url: `/admin/disputes/${id}/assign`,  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 处理争议
  handleDispute: (id, data) => {
    return request({
      url: `/admin/disputes/${id}/handle`,  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 解决争议
  resolveDispute: (id, data) => {
    return request({
      url: `/admin/disputes/${id}/resolve`,  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 获取可分配的处理人列表
  getAvailableHandlers: () => {
    return request({
      url: '/admin/disputes/handlers',  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 获取争议统计数据
  getDisputeStats: () => {
    return request({
      url: '/admin/disputes/stats',  // 移除了 /api 前缀
      method: 'get'
    })
  }
}

/**
 * 寝室管理相关API
 */
export const dormApi = {
  // 获取寝室列表
  getDormList: (params) => {
    return request({
      url: '/admin/dorms',  // 移除了 /api 前缀
      method: 'get',
      params
    })
  },
  
  // 获取寝室详情
  getDormDetail: (id) => {
    return request({
      url: `/admin/dorms/${id}`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 创建寝室
  createDorm: (data) => {
    return request({
      url: '/admin/dorms',  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 更新寝室
  updateDorm: (id, data) => {
    return request({
      url: `/admin/dorms/${id}`,  // 移除了 /api 前缀
      method: 'put',
      data
    })
  },
  
  // 删除寝室
  deleteDorm: (id) => {
    return request({
      url: `/admin/dorms/${id}`,  // 移除了 /api 前缀
      method: 'delete'
    })
  },
  
  // 获取寝室成员列表
  getDormMembers: (id) => {
    return request({
      url: `/admin/dorms/${id}/members`,  // 移除了 /api 前缀
      method: 'get'
    })
  },
  
  // 添加寝室成员
  addDormMember: (id, data) => {
    return request({
      url: `/admin/dorms/${id}/members`,  // 移除了 /api 前缀
      method: 'post',
      data
    })
  },
  
  // 移除寝室成员
  removeDormMember: (id, memberId) => {
    return request({
      url: `/admin/dorms/${id}/members/${memberId}`,  // 移除了 /api 前缀
      method: 'delete'
    })
  },
  
  // 设置寝室长
  setDormLeader: (id, memberId) => {
    return request({
      url: `/admin/dorms/${id}/leader`,  // 移除了 /api 前缀
      method: 'put',
      data: { memberId }
    })
  },
  
  // 获取可分配用户列表
  getAvailableUsers: () => {
    return request({
      url: '/admin/users/available',  // 移除了 /api 前缀
      method: 'get'
    })
  }
}