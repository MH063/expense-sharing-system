/**
 * 数据导出API
 * 提供与后端数据导出功能交互的API接口
 */

import request from '@/utils/request';

/**
 * 导出账单数据
 * @param {Object} params - 导出参数
 * @returns {Promise} 导出结果
 */
export function exportBills(params) {
  return request({
    url: '/api/data-export/bills',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

/**
 * 导出费用数据
 * @param {Object} params - 导出参数
 * @returns {Promise} 导出结果
 */
export function exportExpenses(params) {
  return request({
    url: '/api/data-export/expenses',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

/**
 * 导出支付记录数据
 * @param {Object} params - 导出参数
 * @returns {Promise} 导出结果
 */
export function exportPayments(params) {
  return request({
    url: '/api/data-export/payments',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

/**
 * 导出活动数据
 * @param {Object} params - 导出参数
 * @returns {Promise} 导出结果
 */
export function exportActivities(params) {
  return request({
    url: '/api/data-export/activities',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

/**
 * 导出房间汇总数据
 * @param {Object} params - 导出参数
 * @returns {Promise} 导出结果
 */
export function exportRoomSummary(params) {
  return request({
    url: '/api/data-export/room-summary',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

/**
 * 导出用户汇总数据
 * @param {Object} params - 导出参数
 * @returns {Promise} 导出结果
 */
export function exportUserSummary(params) {
  return request({
    url: '/api/data-export/user-summary',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

/**
 * 获取导出模板列表
 * @returns {Promise} 模板列表
 */
export function getExportTemplates() {
  return request({
    url: '/api/data-export/templates',
    method: 'get'
  });
}

/**
 * 创建导出模板
 * @param {Object} data - 模板数据
 * @returns {Promise} 创建结果
 */
export function createExportTemplate(data) {
  return request({
    url: '/api/data-export/templates',
    method: 'post',
    data
  });
}

/**
 * 更新导出模板
 * @param {string} id - 模板ID
 * @param {Object} data - 模板数据
 * @returns {Promise} 更新结果
 */
export function updateExportTemplate(id, data) {
  return request({
    url: `/api/data-export/templates/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除导出模板
 * @param {string} id - 模板ID
 * @returns {Promise} 删除结果
 */
export function deleteExportTemplate(id) {
  return request({
    url: `/api/data-export/templates/${id}`,
    method: 'delete'
  });
}

/**
 * 获取导出历史记录
 * @param {Object} params - 查询参数
 * @returns {Promise} 历史记录列表
 */
export function getExportHistory(params) {
  return request({
    url: '/api/data-export/history',
    method: 'get',
    params
  });
}

/**
 * 获取导出配置
 * @returns {Promise} 导出配置
 */
export function getExportConfig() {
  return request({
    url: '/api/data-export/config',
    method: 'get'
  });
}

/**
 * 更新导出配置
 * @param {Object} data - 配置数据
 * @returns {Promise} 更新结果
 */
export function updateExportConfig(data) {
  return request({
    url: '/api/data-export/config',
    method: 'put',
    data
  });
}

/**
 * 获取支持的导出格式列表
 * @returns {Promise} 格式列表
 */
export function getSupportedFormats() {
  return request({
    url: '/api/data-export/formats',
    method: 'get'
  });
}

/**
 * 预览导出数据
 * @param {Object} data - 预览参数
 * @returns {Promise} 预览结果
 */
export function previewExportData(data) {
  return request({
    url: '/api/data-export/preview',
    method: 'post',
    data
  });
}

/**
 * 取消导出任务
 * @param {string} taskId - 任务ID
 * @returns {Promise} 取消结果
 */
export function cancelExportTask(taskId) {
  return request({
    url: `/api/data-export/tasks/${taskId}/cancel`,
    method: 'post'
  });
}

/**
 * 获取导出任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise} 任务状态
 */
export function getExportTaskStatus(taskId) {
  return request({
    url: `/api/data-export/tasks/${taskId}/status`,
    method: 'get'
  });
}

export default {
  exportBills,
  exportExpenses,
  exportPayments,
  exportActivities,
  exportRoomSummary,
  exportUserSummary,
  getExportTemplates,
  createExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  getExportHistory,
  getExportConfig,
  updateExportConfig,
  getSupportedFormats,
  previewExportData,
  cancelExportTask,
  getExportTaskStatus
};