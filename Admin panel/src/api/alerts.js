import request from '@/utils/request'

/**
 * 获取告警统计信息
 * @returns {Promise} 返回包含告警统计信息的Promise对象
 */
export function getAlertStats() {
  return request({
    url: '/api/alerts/stats',
    method: 'get'
  })
}

/**
 * 获取未解决的告警列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码，默认为1
 * @param {number} params.limit - 每页数量，默认为20
 * @param {string} params.type - 告警类型过滤
 * @param {string} params.level - 告警级别过滤
 * @returns {Promise} 返回包含未解决告警列表的Promise对象
 */
export function getUnresolvedAlerts(params = {}) {
  return request({
    url: '/api/alerts/unresolved',
    method: 'get',
    params
  })
}

/**
 * 获取所有告警列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码，默认为1
 * @param {number} params.limit - 每页数量，默认为20
 * @param {string} params.type - 告警类型过滤
 * @param {string} params.level - 告警级别过滤
 * @param {string} params.status - 告警状态过滤
 * @returns {Promise} 返回包含告警列表的Promise对象
 */
export function getAllAlerts(params = {}) {
  return request({
    url: '/api/alerts',
    method: 'get',
    params
  })
}

/**
 * 获取告警详情
 * @param {string|number} id - 告警ID
 * @returns {Promise} 返回包含告警详情的Promise对象
 */
export function getAlertById(id) {
  return request({
    url: `/api/alerts/${id}`,
    method: 'get'
  })
}

/**
 * 解决告警
 * @param {string|number} id - 告警ID
 * @param {Object} data - 解决数据
 * @param {string} data.resolved_by - 解决人
 * @param {string} data.resolution_note - 解决备注
 * @returns {Promise} 返回操作结果的Promise对象
 */
export function resolveAlert(id, data) {
  return request({
    url: `/api/alerts/${id}/resolve`,
    method: 'post',
    data
  })
}

/**
 * 忽略告警
 * @param {string|number} id - 告警ID
 * @param {Object} data - 忽略数据
 * @param {string} data.ignored_by - 忽略人
 * @param {string} data.ignore_reason - 忽略原因
 * @returns {Promise} 返回操作结果的Promise对象
 */
export function ignoreAlert(id, data) {
  return request({
    url: `/api/alerts/${id}/ignore`,
    method: 'post',
    data
  })
}

/**
 * 批量解决告警
 * @param {Array} ids - 告警ID数组
 * @param {Object} data - 解决数据
 * @param {string} data.resolved_by - 解决人
 * @param {string} data.resolution_note - 解决备注
 * @returns {Promise} 返回操作结果的Promise对象
 */
export function batchResolveAlerts(ids, data) {
  return request({
    url: '/api/alerts/batch/resolve',
    method: 'post',
    data: {
      ids,
      ...data
    }
  })
}

/**
 * 批量忽略告警
 * @param {Array} ids - 告警ID数组
 * @param {Object} data - 忽略数据
 * @param {string} data.ignored_by - 忽略人
 * @param {string} data.ignore_reason - 忽略原因
 * @returns {Promise} 返回操作结果的Promise对象
 */
export function batchIgnoreAlerts(ids, data) {
  return request({
    url: '/api/alerts/batch/ignore',
    method: 'post',
    data: {
      ids,
      ...data
    }
  })
}

/**
 * 获取告警阈值配置
 * @returns {Promise} 返回包含告警阈值配置的Promise对象
 */
export function getAlertThresholds() {
  return request({
    url: '/api/alerts/thresholds',
    method: 'get'
  })
}

/**
 * 更新告警阈值配置
 * @param {Object} data - 阈值配置数据
 * @returns {Promise} 返回操作结果的Promise对象
 */
export function updateAlertThresholds(data) {
  return request({
    url: '/api/alerts/thresholds',
    method: 'put',
    data
  })
}

/**
 * 执行系统检查
 * @returns {Promise} 返回系统检查结果的Promise对象
 */
export function executeSystemCheck() {
  return request({
    url: '/api/alerts/check',
    method: 'post'
  })
}

/**
 * 获取告警历史趋势
 * @param {Object} params - 查询参数
 * @param {number} params.days - 天数，默认为7
 * @returns {Promise} 返回包含告警历史趋势的Promise对象
 */
export function getAlertTrends(params = {}) {
  return request({
    url: '/api/alerts/trends',
    method: 'get',
    params
  })
}

/**
 * 获取告警类型分布
 * @param {Object} params - 查询参数
 * @param {number} params.days - 天数，默认为7
 * @returns {Promise} 返回包含告警类型分布的Promise对象
 */
export function getAlertTypeDistribution(params = {}) {
  return request({
    url: '/api/alerts/distribution',
    method: 'get',
    params
  })
}

/**
 * 获取监控指标
 * @returns {Promise} 返回监控指标数据
 */
export function getMetrics() {
  return request({
    url: '/api/metrics',
    method: 'get'
  })
}

/**
 * 获取API性能指标
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d)
 * @returns {Promise} 返回API性能指标
 */
export function getApiMetrics(params) {
  return request({
    url: '/api/metrics/api',
    method: 'get',
    params
  })
}

/**
 * 获取缓存性能指标
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d)
 * @returns {Promise} 返回缓存性能指标
 */
export function getCacheMetrics(params) {
  return request({
    url: '/api/metrics/cache',
    method: 'get',
    params
  })
}

/**
 * 获取安全事件统计
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d)
 * @returns {Promise} 返回安全事件统计
 */
export function getSecurityMetrics(params) {
  return request({
    url: '/api/metrics/security',
    method: 'get',
    params
  })
}

/**
 * 获取系统资源使用情况
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d)
 * @returns {Promise} 返回系统资源使用情况
 */
export function getSystemMetrics(params) {
  return request({
    url: '/api/metrics/system',
    method: 'get',
    params
  })
}

/**
 * 获取历史监控指标
 * @param {Object} params - 查询参数
 * @param {string} params.metric - 指标类型
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d)
 * @param {number} params.interval - 数据间隔 (分钟)
 * @returns {Promise} 返回历史监控指标
 */
export function getHistoricalMetrics(params) {
  return request({
    url: '/api/metrics/history',
    method: 'get',
    params
  })
}