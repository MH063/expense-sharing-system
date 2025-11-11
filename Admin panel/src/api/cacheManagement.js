/**
 * 缓存管理API
 * 提供与后端缓存管理功能交互的API接口
 */

import request from '@/utils/request';

/**
 * 获取缓存统计信息
 * @returns {Promise} 缓存统计信息
 */
export function getCacheStats() {
  return request({
    url: '/api/cache-management/stats',
    method: 'get'
  });
}

/**
 * 获取所有缓存键
 * @param {Object} params - 查询参数
 * @param {string} params.pattern - 键模式
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @returns {Promise} 缓存键列表
 */
export function getAllCacheKeys(params) {
  return request({
    url: '/api/cache-management/keys',
    method: 'get',
    params
  });
}

/**
 * 获取指定键的缓存值
 * @param {string} key - 缓存键
 * @returns {Promise} 缓存值
 */
export function getCacheValue(key) {
  return request({
    url: `/api/cache-management/keys/${key}`,
    method: 'get'
  });
}

/**
 * 设置缓存值
 * @param {Object} data - 缓存数据
 * @param {string} data.key - 缓存键
 * @param {any} data.value - 缓存值
 * @param {number} data.ttl - 过期时间（秒）
 * @returns {Promise} 设置结果
 */
export function setCacheValue(data) {
  return request({
    url: '/api/cache-management/keys',
    method: 'post',
    data
  });
}

/**
 * 删除指定键的缓存
 * @param {string} key - 缓存键
 * @returns {Promise} 删除结果
 */
export function deleteCacheKey(key) {
  return request({
    url: `/api/cache-management/keys/${key}`,
    method: 'delete'
  });
}

/**
 * 清空缓存
 * @returns {Promise} 清空结果
 */
export function clearCache() {
  return request({
    url: '/api/cache-management/clear',
    method: 'post'
  });
}

/**
 * 根据模式清空缓存
 * @param {Object} data - 清空参数
 * @param {string} data.pattern - 键模式
 * @returns {Promise} 清空结果
 */
export function clearCacheByPattern(data) {
  return request({
    url: '/api/cache-management/clear-by-pattern',
    method: 'post',
    data
  });
}

/**
 * 获取内存使用情况
 * @returns {Promise} 内存使用情况
 */
export function getMemoryUsage() {
  return request({
    url: '/api/cache-management/memory',
    method: 'get'
  });
}

/**
 * 预热缓存
 * @returns {Promise} 预热结果
 */
export function warmupCache() {
  return request({
    url: '/api/cache-management/warmup',
    method: 'post'
  });
}

/**
 * 获取缓存配置
 * @returns {Promise} 缓存配置
 */
export function getCacheConfig() {
  return request({
    url: '/api/cache-management/config',
    method: 'get'
  });
}

/**
 * 更新缓存配置
 * @param {Object} data - 配置数据
 * @returns {Promise} 更新结果
 */
export function updateCacheConfig(data) {
  return request({
    url: '/api/cache-management/config',
    method: 'put',
    data
  });
}

/**
 * 获取缓存服务器信息
 * @returns {Promise} 缓存服务器信息
 */
export function getCacheInfo() {
  return request({
    url: '/api/cache-management/info',
    method: 'get'
  });
}

/**
 * 备份缓存数据
 * @returns {Promise} 备份结果
 */
export function backupCache() {
  return request({
    url: '/api/cache-management/backup',
    method: 'post'
  });
}

/**
 * 恢复缓存数据
 * @param {Object} data - 恢复参数
 * @returns {Promise} 恢复结果
 */
export function restoreCache(data) {
  return request({
    url: '/api/cache-management/restore',
    method: 'post',
    data
  });
}

/**
 * 获取慢查询日志
 * @returns {Promise} 慢查询日志
 */
export function getSlowLogs() {
  return request({
    url: '/api/cache-management/slow-logs',
    method: 'get'
  });
}

/**
 * 清空慢查询日志
 * @returns {Promise} 清空结果
 */
export function clearSlowLogs() {
  return request({
    url: '/api/cache-management/slow-logs/clear',
    method: 'post'
  });
}

/**
 * 检查缓存健康状态
 * @returns {Promise} 健康状态
 */
export function checkCacheHealth() {
  return request({
    url: '/api/cache-management/health',
    method: 'get'
  });
}

export default {
  getCacheStats,
  getAllCacheKeys,
  getCacheValue,
  setCacheValue,
  deleteCacheKey,
  clearCache,
  clearCacheByPattern,
  getMemoryUsage,
  warmupCache,
  getCacheConfig,
  updateCacheConfig,
  getCacheInfo,
  backupCache,
  restoreCache,
  getSlowLogs,
  clearSlowLogs,
  checkCacheHealth
};