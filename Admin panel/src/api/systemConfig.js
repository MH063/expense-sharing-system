import request from '@/utils/request'

/**
 * 系统配置相关API接口
 */

// 1. 获取系统配置
export function getSystemConfig() {
  return request({
    url: '/admin/system/config',
    method: 'get'
  })
}

// 2. 更新系统配置
export function updateSystemConfig(data) {
  return request({
    url: '/admin/system/config',
    method: 'put',
    data
  })
}

// 3. 获取功能开关列表
export function getFeatureFlags() {
  return request({
    url: '/admin/system/feature-flags',
    method: 'get'
  })
}

// 4. 更新功能开关
export function updateFeatureFlag(id, data) {
  return request({
    url: `/admin/system/feature-flags/${id}`,
    method: 'put',
    data
  })
}

// 5. 获取维护窗口列表
export function getMaintenanceWindows(params = {}) {
  return request({
    url: '/admin/system/maintenance-windows',
    method: 'get',
    params
  })
}

// 6. 创建维护窗口
export function createMaintenanceWindow(data) {
  return request({
    url: '/admin/system/maintenance-windows',
    method: 'post',
    data
  })
}

// 7. 更新维护窗口
export function updateMaintenanceWindow(id, data) {
  return request({
    url: `/admin/system/maintenance-windows/${id}`,
    method: 'put',
    data
  })
}

// 8. 删除维护窗口
export function deleteMaintenanceWindow(id) {
  return request({
    url: `/admin/system/maintenance-windows/${id}`,
    method: 'delete'
  })
}

// 9. 获取公告列表
export function getAnnouncements(params = {}) {
  return request({
    url: '/admin/system/announcements',
    method: 'get',
    params
  })
}

// 10. 创建公告
export function createAnnouncement(data) {
  return request({
    url: '/admin/system/announcements',
    method: 'post',
    data
  })
}

// 11. 更新公告
export function updateAnnouncement(id, data) {
  return request({
    url: `/admin/system/announcements/${id}`,
    method: 'put',
    data
  })
}

// 12. 删除公告
export function deleteAnnouncement(id) {
  return request({
    url: `/admin/system/announcements/${id}`,
    method: 'delete'
  })
}