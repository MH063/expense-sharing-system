/**
 * 系统性能监控API服务
 * 提供系统性能监控相关的API调用方法
 */

import axios from 'axios';

// 获取API基础URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * 获取系统性能概览
 * @returns {Promise} 返回系统性能概览数据
 */
export const getSystemPerformanceOverview = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/overview`);
    console.log('获取系统性能概览:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取系统性能概览失败:', error);
    throw error;
  }
};

/**
 * 获取CPU使用率数据
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d, 30d)
 * @param {number} params.interval - 数据间隔 (分钟)
 * @returns {Promise} 返回CPU使用率数据
 */
export const getCpuUsageData = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/cpu`, { params });
    console.log('获取CPU使用率数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取CPU使用率数据失败:', error);
    throw error;
  }
};

/**
 * 获取内存使用率数据
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d, 30d)
 * @param {number} params.interval - 数据间隔 (分钟)
 * @returns {Promise} 返回内存使用率数据
 */
export const getMemoryUsageData = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/memory`, { params });
    console.log('获取内存使用率数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取内存使用率数据失败:', error);
    throw error;
  }
};

/**
 * 获取磁盘使用情况
 * @returns {Promise} 返回磁盘使用情况数据
 */
export const getDiskUsageData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/disk`);
    console.log('获取磁盘使用情况:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取磁盘使用情况失败:', error);
    throw error;
  }
};

/**
 * 获取网络流量数据
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d, 30d)
 * @param {number} params.interval - 数据间隔 (分钟)
 * @returns {Promise} 返回网络流量数据
 */
export const getNetworkTrafficData = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/network`, { params });
    console.log('获取网络流量数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取网络流量数据失败:', error);
    throw error;
  }
};

/**
 * 获取数据库性能数据
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d, 30d)
 * @returns {Promise} 返回数据库性能数据
 */
export const getDatabasePerformanceData = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/database`, { params });
    console.log('获取数据库性能数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取数据库性能数据失败:', error);
    throw error;
  }
};

/**
 * 获取应用程序性能数据
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d, 30d)
 * @returns {Promise} 返回应用程序性能数据
 */
export const getApplicationPerformanceData = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/application`, { params });
    console.log('获取应用程序性能数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取应用程序性能数据失败:', error);
    throw error;
  }
};

/**
 * 获取性能警报列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @param {string} params.severity - 严重程度 (low, medium, high, critical)
 * @param {string} params.status - 状态 (active, resolved, acknowledged)
 * @returns {Promise} 返回性能警报列表
 */
export const getPerformanceAlerts = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/alerts`, { params });
    console.log('获取性能警报列表:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取性能警报列表失败:', error);
    throw error;
  }
};

/**
 * 获取性能警报详情
 * @param {string} alertId - 警报ID
 * @returns {Promise} 返回性能警报详情
 */
export const getPerformanceAlertDetail = async (alertId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/alerts/${alertId}`);
    console.log('获取性能警报详情:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取性能警报详情失败:', error);
    throw error;
  }
};

/**
 * 确认性能警报
 * @param {string} alertId - 警报ID
 * @param {Object} data - 确认数据
 * @param {string} data.comment - 确认备注
 * @returns {Promise} 返回确认结果
 */
export const acknowledgePerformanceAlert = async (alertId, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/admin/system-performance/alerts/${alertId}/acknowledge`, data);
    console.log('确认性能警报:', response.data);
    return response.data;
  } catch (error) {
    console.error('确认性能警报失败:', error);
    throw error;
  }
};

/**
 * 解决性能警报
 * @param {string} alertId - 警报ID
 * @param {Object} data - 解决数据
 * @param {string} data.resolution - 解决方案
 * @param {string} data.comment - 解决备注
 * @returns {Promise} 返回解决结果
 */
export const resolvePerformanceAlert = async (alertId, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/admin/system-performance/alerts/${alertId}/resolve`, data);
    console.log('解决性能警报:', response.data);
    return response.data;
  } catch (error) {
    console.error('解决性能警报失败:', error);
    throw error;
  }
};

/**
 * 获取性能报告列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @param {string} params.type - 报告类型 (daily, weekly, monthly, custom)
 * @returns {Promise} 返回性能报告列表
 */
export const getPerformanceReports = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/reports`, { params });
    console.log('获取性能报告列表:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取性能报告列表失败:', error);
    throw error;
  }
};

/**
 * 生成性能报告
 * @param {Object} data - 报告数据
 * @param {string} data.type - 报告类型 (daily, weekly, monthly, custom)
 * @param {string} data.startDate - 开始日期
 * @param {string} data.endDate - 结束日期
 * @param {Array} data.metrics - 指标列表
 * @param {string} data.format - 报告格式 (pdf, excel, csv)
 * @returns {Promise} 返回生成结果
 */
export const generatePerformanceReport = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/system-performance/reports`, data);
    console.log('生成性能报告:', response.data);
    return response.data;
  } catch (error) {
    console.error('生成性能报告失败:', error);
    throw error;
  }
};

/**
 * 下载性能报告
 * @param {string} reportId - 报告ID
 * @returns {Promise} 返回下载链接
 */
export const downloadPerformanceReport = async (reportId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/reports/${reportId}/download`);
    console.log('下载性能报告:', response.data);
    return response.data;
  } catch (error) {
    console.error('下载性能报告失败:', error);
    throw error;
  }
};

/**
 * 获取性能配置
 * @returns {Promise} 返回性能配置数据
 */
export const getPerformanceConfig = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/config`);
    console.log('获取性能配置:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取性能配置失败:', error);
    throw error;
  }
};

/**
 * 更新性能配置
 * @param {Object} data - 配置数据
 * @param {Object} data.alerts - 警报配置
 * @param {Object} data.monitoring - 监控配置
 * @param {Object} data.reports - 报告配置
 * @returns {Promise} 返回更新结果
 */
export const updatePerformanceConfig = async (data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/admin/system-performance/config`, data);
    console.log('更新性能配置:', response.data);
    return response.data;
  } catch (error) {
    console.error('更新性能配置失败:', error);
    throw error;
  }
};

/**
 * 获取性能趋势数据
 * @param {Object} params - 查询参数
 * @param {string} params.metric - 指标名称 (cpu, memory, disk, network)
 * @param {string} params.timeRange - 时间范围 (1h, 6h, 24h, 7d, 30d)
 * @param {number} params.interval - 数据间隔 (分钟)
 * @returns {Promise} 返回性能趋势数据
 */
export const getPerformanceTrends = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/trends`, { params });
    console.log('获取性能趋势数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取性能趋势数据失败:', error);
    throw error;
  }
};

/**
 * 获取性能基准数据
 * @param {Object} params - 查询参数
 * @param {string} params.baselineType - 基准类型 (daily, weekly, monthly)
 * @returns {Promise} 返回性能基准数据
 */
export const getPerformanceBaselines = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/baselines`, { params });
    console.log('获取性能基准数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取性能基准数据失败:', error);
    throw error;
  }
};

/**
 * 创建性能基准
 * @param {Object} data - 基准数据
 * @param {string} data.name - 基准名称
 * @param {string} data.type - 基准类型 (daily, weekly, monthly)
 * @param {Object} data.metrics - 指标数据
 * @returns {Promise} 返回创建结果
 */
export const createPerformanceBaseline = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/system-performance/baselines`, data);
    console.log('创建性能基准:', response.data);
    return response.data;
  } catch (error) {
    console.error('创建性能基准失败:', error);
    throw error;
  }
};

/**
 * 删除性能基准
 * @param {string} baselineId - 基准ID
 * @returns {Promise} 返回删除结果
 */
export const deletePerformanceBaseline = async (baselineId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/admin/system-performance/baselines/${baselineId}`);
    console.log('删除性能基准:', response.data);
    return response.data;
  } catch (error) {
    console.error('删除性能基准失败:', error);
    throw error;
  }
};

/**
 * 导出性能数据
 * @param {Object} data - 导出数据
 * @param {string} data.type - 数据类型 (cpu, memory, disk, network, all)
 * @param {string} data.timeRange - 时间范围 (1h, 6h, 24h, 7d, 30d)
 * @param {string} data.format - 导出格式 (json, csv, excel)
 * @returns {Promise} 返回导出结果
 */
export const exportPerformanceData = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/system-performance/export`, data);
    console.log('导出性能数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('导出性能数据失败:', error);
    throw error;
  }
};

/**
 * 获取系统负载预测
 * @param {Object} params - 查询参数
 * @param {string} params.metric - 指标名称 (cpu, memory, disk, network)
 * @param {string} params.timeRange - 预测时间范围 (1h, 6h, 24h, 7d)
 * @returns {Promise} 返回系统负载预测数据
 */
export const getSystemLoadForecast = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/forecast`, { params });
    console.log('获取系统负载预测:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取系统负载预测失败:', error);
    throw error;
  }
};

/**
 * 获取性能优化建议
 * @param {Object} params - 查询参数
 * @param {string} params.category - 优化类别 (system, database, application, network)
 * @returns {Promise} 返回性能优化建议
 */
export const getPerformanceOptimizationSuggestions = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/system-performance/optimization`, { params });
    console.log('获取性能优化建议:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取性能优化建议失败:', error);
    throw error;
  }
};

/**
 * 应用性能优化建议
 * @param {string} suggestionId - 建议ID
 * @param {Object} data - 应用数据
 * @returns {Promise} 返回应用结果
 */
export const applyPerformanceOptimization = async (suggestionId, data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/system-performance/optimization/${suggestionId}/apply`, data);
    console.log('应用性能优化建议:', response.data);
    return response.data;
  } catch (error) {
    console.error('应用性能优化建议失败:', error);
    throw error;
  }
};

export default {
  getSystemPerformanceOverview,
  getCpuUsageData,
  getMemoryUsageData,
  getDiskUsageData,
  getNetworkTrafficData,
  getDatabasePerformanceData,
  getApplicationPerformanceData,
  getPerformanceAlerts,
  getPerformanceAlertDetail,
  acknowledgePerformanceAlert,
  resolvePerformanceAlert,
  getPerformanceReports,
  generatePerformanceReport,
  downloadPerformanceReport,
  getPerformanceConfig,
  updatePerformanceConfig,
  getPerformanceTrends,
  getPerformanceBaselines,
  createPerformanceBaseline,
  deletePerformanceBaseline,
  exportPerformanceData,
  getSystemLoadForecast,
  getPerformanceOptimizationSuggestions,
  applyPerformanceOptimization
};