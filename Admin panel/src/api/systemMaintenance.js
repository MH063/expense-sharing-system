import request from '@/utils/request'

/**
 * 系统维护相关API接口
 */

// 1. 获取系统维护任务列表
export function getMaintenanceTasks(params = {}) {
  return request({
    url: '/api/system-maintenance/tasks',
    method: 'get',
    params
  })
}

// 2. 根据ID获取系统维护任务
export function getMaintenanceTaskById(id) {
  return request({
    url: `/api/system-maintenance/tasks/${id}`,
    method: 'get'
  })
}

// 3. 创建系统维护任务
export function createMaintenanceTask(data) {
  return request({
    url: '/api/system-maintenance/tasks',
    method: 'post',
    data
  })
}

// 4. 更新系统维护任务
export function updateMaintenanceTask(id, data) {
  return request({
    url: `/api/system-maintenance/tasks/${id}`,
    method: 'put',
    data
  })
}

// 5. 删除系统维护任务
export function deleteMaintenanceTask(id) {
  return request({
    url: `/api/system-maintenance/tasks/${id}`,
    method: 'delete'
  })
}

// 6. 执行系统维护任务
export function executeMaintenanceTask(id) {
  return request({
    url: `/api/system-maintenance/tasks/${id}/execute`,
    method: 'post'
  })
}

// 7. 获取维护报告列表
export function getMaintenanceReports(params = {}) {
  return request({
    url: '/api/system-maintenance/reports',
    method: 'get',
    params
  })
}

// 8. 根据ID获取维护报告
export function getMaintenanceReportById(id) {
  return request({
    url: `/api/system-maintenance/reports/${id}`,
    method: 'get'
  })
}

// 9. 生成维护报告
export function generateMaintenanceReport(data) {
  return request({
    url: '/api/system-maintenance/reports/generate',
    method: 'post',
    data
  })
}

// 10. 导出维护报告
export function exportMaintenanceReport(id, params = {}) {
  return request({
    url: `/api/system-maintenance/reports/${id}/export`,
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 11. 获取备份列表
export function getBackups(params = {}) {
  return request({
    url: '/api/system-maintenance/backups',
    method: 'get',
    params
  })
}

// 12. 创建备份
export function createBackup(data) {
  return request({
    url: '/api/system-maintenance/backups/create',
    method: 'post',
    data
  })
}

// 13. 恢复备份
export function restoreBackup(id) {
  return request({
    url: `/api/system-maintenance/backups/${id}/restore`,
    method: 'post'
  })
}

// 14. 删除备份
export function deleteBackup(id) {
  return request({
    url: `/api/system-maintenance/backups/${id}`,
    method: 'delete'
  })
}

// 15. 获取系统健康状态
export function getSystemHealth() {
  return request({
    url: '/api/system-maintenance/health',
    method: 'get'
  })
}

// 16. 获取性能指标
export function getPerformanceMetrics(params = {}) {
  return request({
    url: '/api/system-maintenance/performance',
    method: 'get',
    params
  })
}

// 17. 获取错误日志
export function getErrorLogs(params = {}) {
  return request({
    url: '/api/system-maintenance/error-logs',
    method: 'get',
    params
  })
}

// 18. 获取警告列表
export function getWarnings(params = {}) {
  return request({
    url: '/api/system-maintenance/warnings',
    method: 'get',
    params
  })
}

// 19. 解决警告
export function resolveWarning(id, data) {
  return request({
    url: `/api/system-maintenance/warnings/${id}/resolve`,
    method: 'post',
    data
  })
}

// 20. 获取系统配置
export function getSystemConfig() {
  return request({
    url: '/api/system-maintenance/config',
    method: 'get'
  })
}

// 21. 更新系统配置
export function updateSystemConfig(data) {
  return request({
    url: '/api/system-maintenance/config',
    method: 'put',
    data
  })
}

// 22. 获取系统信息
export function getSystemInfo() {
  return request({
    url: '/api/system-maintenance/info',
    method: 'get'
  })
}

// 23. 获取维护日志
export function getMaintenanceLogs(params = {}) {
  return request({
    url: '/api/system-maintenance/logs',
    method: 'get',
    params
  })
}

// 24. 清理系统缓存
export function clearSystemCache() {
  return request({
    url: '/api/system-maintenance/clear-cache',
    method: 'post'
  })
}

// 25. 清理临时文件
export function cleanupTempFiles() {
  return request({
    url: '/api/system-maintenance/cleanup-temp',
    method: 'post'
  })
}

// 26. 数据库优化
export function optimizeDatabase() {
  return request({
    url: '/api/system-maintenance/optimize-database',
    method: 'post'
  })
}

// 27. 系统重启
export function restartSystem() {
  return request({
    url: '/api/system-maintenance/restart',
    method: 'post'
  })
}