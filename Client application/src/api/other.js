import request from '@/utils/request';

/**
 * 获取系统信息
 * @returns {Promise} 系统信息
 */
export function getSystemInfo() {
  return request({
    url: '/api/other/system-info',
    method: 'get'
  });
}

/**
 * 获取应用版本信息
 * @returns {Promise} 版本信息
 */
export function getVersionInfo() {
  return request({
    url: '/api/other/version',
    method: 'get'
  });
}

/**
 * 上传文件
 * @param {FormData} formData 文件数据
 * @returns {Promise} 上传结果
 */
export function uploadFile(formData) {
  return request({
    url: '/api/other/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

/**
 * 获取上传文件列表
 * @param {Object} params 查询参数
 * @returns {Promise} 文件列表
 */
export function getUploadList(params) {
  return request({
    url: '/api/other/uploads',
    method: 'get',
    params
  });
}

/**
 * 删除上传的文件
 * @param {string} fileId 文件ID
 * @returns {Promise} 删除结果
 */
export function deleteUpload(fileId) {
  return request({
    url: `/api/other/uploads/${fileId}`,
    method: 'delete'
  });
}

/**
 * 获取系统公告
 * @param {Object} params 查询参数
 * @returns {Promise} 公告列表
 */
export function getAnnouncements(params) {
  return request({
    url: '/api/other/announcements',
    method: 'get',
    params
  });
}

/**
 * 获取公告详情
 * @param {string} announcementId 公告ID
 * @returns {Promise} 公告详情
 */
export function getAnnouncementDetail(announcementId) {
  return request({
    url: `/api/other/announcements/${announcementId}`,
    method: 'get'
  });
}

/**
 * 创建公告
 * @param {Object} data 公告数据
 * @returns {Promise} 创建结果
 */
export function createAnnouncement(data) {
  return request({
    url: '/api/other/announcements',
    method: 'post',
    data
  });
}

/**
 * 更新公告
 * @param {string} announcementId 公告ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新结果
 */
export function updateAnnouncement(announcementId, data) {
  return request({
    url: `/api/other/announcements/${announcementId}`,
    method: 'put',
    data
  });
}

/**
 * 删除公告
 * @param {string} announcementId 公告ID
 * @returns {Promise} 删除结果
 */
export function deleteAnnouncement(announcementId) {
  return request({
    url: `/api/other/announcements/${announcementId}`,
    method: 'delete'
  });
}

/**
 * 获取帮助文档列表
 * @param {Object} params 查询参数
 * @returns {Promise} 帮助文档列表
 */
export function getHelpDocuments(params) {
  return request({
    url: '/api/other/help-docs',
    method: 'get',
    params
  });
}

/**
 * 获取帮助文档详情
 * @param {string} docId 文档ID
 * @returns {Promise} 帮助文档详情
 */
export function getHelpDocumentDetail(docId) {
  return request({
    url: `/api/other/help-docs/${docId}`,
    method: 'get'
  });
}

/**
 * 搜索帮助文档
 * @param {Object} params 搜索参数
 * @returns {Promise} 搜索结果
 */
export function searchHelpDocuments(params) {
  return request({
    url: '/api/other/help-docs/search',
    method: 'get',
    params
  });
}

/**
 * 获取反馈列表
 * @param {Object} params 查询参数
 * @returns {Promise} 反馈列表
 */
export function getFeedbackList(params) {
  return request({
    url: '/api/other/feedback',
    method: 'get',
    params
  });
}

/**
 * 提交反馈
 * @param {Object} data 反馈数据
 * @returns {Promise} 提交结果
 */
export function submitFeedback(data) {
  return request({
    url: '/api/other/feedback',
    method: 'post',
    data
  });
}

/**
 * 获取反馈详情
 * @param {string} feedbackId 反馈ID
 * @returns {Promise} 反馈详情
 */
export function getFeedbackDetail(feedbackId) {
  return request({
    url: `/api/other/feedback/${feedbackId}`,
    method: 'get'
  });
}

/**
 * 回复反馈
 * @param {string} feedbackId 反馈ID
 * @param {Object} data 回复数据
 * @returns {Promise} 回复结果
 */
export function replyFeedback(feedbackId, data) {
  return request({
    url: `/api/other/feedback/${feedbackId}/reply`,
    method: 'post',
    data
  });
}

/**
 * 获取常用链接
 * @param {Object} params 查询参数
 * @returns {Promise} 常用链接列表
 */
export function getCommonLinks(params) {
  return request({
    url: '/api/other/common-links',
    method: 'get',
    params
  });
}

/**
 * 创建常用链接
 * @param {Object} data 链接数据
 * @returns {Promise} 创建结果
 */
export function createCommonLink(data) {
  return request({
    url: '/api/other/common-links',
    method: 'post',
    data
  });
}

/**
 * 更新常用链接
 * @param {string} linkId 链接ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新结果
 */
export function updateCommonLink(linkId, data) {
  return request({
    url: `/api/other/common-links/${linkId}`,
    method: 'put',
    data
  });
}

/**
 * 删除常用链接
 * @param {string} linkId 链接ID
 * @returns {Promise} 删除结果
 */
export function deleteCommonLink(linkId) {
  return request({
    url: `/api/other/common-links/${linkId}`,
    method: 'delete'
  });
}

/**
 * 导出数据
 * @param {Object} params 导出参数
 * @returns {Promise} 导出结果
 */
export function exportData(params) {
  return request({
    url: '/api/other/export',
    method: 'get',
    params,
    responseType: 'blob'
  });
}

/**
 * 导入数据
 * @param {FormData} formData 导入数据
 * @returns {Promise} 导入结果
 */
export function importData(formData) {
  return request({
    url: '/api/other/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

/**
 * 获取导入历史
 * @param {Object} params 查询参数
 * @returns {Promise} 导入历史
 */
export function getImportHistory(params) {
  return request({
    url: '/api/other/import/history',
    method: 'get',
    params
  });
}

/**
 * 清理缓存
 * @param {Object} data 清理参数
 * @returns {Promise} 清理结果
 */
export function clearCache(data) {
  return request({
    url: '/api/other/cache/clear',
    method: 'post',
    data
  });
}

/**
 * 获取缓存状态
 * @returns {Promise} 缓存状态
 */
export function getCacheStatus() {
  return request({
    url: '/api/other/cache/status',
    method: 'get'
  });
}

// 导出所有API
const otherApi = {
  getSystemInfo,
  getVersionInfo,
  uploadFile,
  getUploadList,
  deleteUpload,
  getAnnouncements,
  getAnnouncementDetail,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getHelpDocuments,
  getHelpDocumentDetail,
  searchHelpDocuments,
  getFeedbackList,
  submitFeedback,
  getFeedbackDetail,
  replyFeedback,
  getCommonLinks,
  createCommonLink,
  updateCommonLink,
  deleteCommonLink,
  exportData,
  importData,
  getImportHistory,
  clearCache,
  getCacheStatus
};

export default otherApi;