/**
 * 管理员操作统计API服务
 * 提供管理员操作统计相关的API调用方法
 */

const API_BASE_URL = '/api/admin/operation-statistics';

/**
 * 获取管理员操作统计数据
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @param {number} params.adminId - 管理员ID (可选)
 * @param {string} params.operationType - 操作类型 (可选)
 * @param {number} params.page - 页码 (默认为1)
 * @param {number} params.limit - 每页数量 (默认为20)
 * @returns {Promise} 返回API响应
 */
export const getOperationStatistics = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取操作统计数据失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('获取操作统计数据成功:', data);
    return data;
  } catch (error) {
    console.error('获取操作统计数据错误:', error);
    throw error;
  }
};

/**
 * 获取管理员操作统计图表数据
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @param {string} params.chartType - 图表类型 (daily, weekly, monthly, operation-type, admin)
 * @returns {Promise} 返回API响应
 */
export const getOperationChartStatistics = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/charts?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取操作统计图表数据失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('获取操作统计图表数据成功:', data);
    return data;
  } catch (error) {
    console.error('获取操作统计图表数据错误:', error);
    throw error;
  }
};

/**
 * 获取管理员操作类型分布统计
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @returns {Promise} 返回API响应
 */
export const getOperationTypeDistribution = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/operation-types?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取操作类型分布统计失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('获取操作类型分布统计成功:', data);
    return data;
  } catch (error) {
    console.error('获取操作类型分布统计错误:', error);
    throw error;
  }
};

/**
 * 获取管理员活跃度统计
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @returns {Promise} 返回API响应
 */
export const getAdminActivityStatistics = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/admin-activity?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取管理员活跃度统计失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('获取管理员活跃度统计成功:', data);
    return data;
  } catch (error) {
    console.error('获取管理员活跃度统计错误:', error);
    throw error;
  }
};

/**
 * 获取管理员操作高峰时段统计
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @returns {Promise} 返回API响应
 */
export const getOperationPeakHours = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/peak-hours?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取操作高峰时段统计失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('获取操作高峰时段统计成功:', data);
    return data;
  } catch (error) {
    console.error('获取操作高峰时段统计错误:', error);
    throw error;
  }
};

/**
 * 获取管理员操作统计概览
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @returns {Promise} 返回API响应
 */
export const getOperationOverview = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/overview?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取操作统计概览失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('获取操作统计概览成功:', data);
    return data;
  } catch (error) {
    console.error('获取操作统计概览错误:', error);
    throw error;
  }
};

/**
 * 导出管理员操作统计数据
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @param {string} params.format - 导出格式 (excel, csv, pdf)
 * @param {number} params.adminId - 管理员ID (可选)
 * @param {string} params.operationType - 操作类型 (可选)
 * @returns {Promise} 返回下载链接
 */
export const exportOperationStatistics = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/export?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`导出操作统计数据失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('导出操作统计数据成功:', data);
    return data;
  } catch (error) {
    console.error('导出操作统计数据错误:', error);
    throw error;
  }
};

/**
 * 获取管理员操作详细日志
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @param {number} params.adminId - 管理员ID (可选)
 * @param {string} params.operationType - 操作类型 (可选)
 * @param {number} params.page - 页码 (默认为1)
 * @param {number} params.limit - 每页数量 (默认为20)
 * @returns {Promise} 返回API响应
 */
export const getOperationLogs = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/logs?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取操作详细日志失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('获取操作详细日志成功:', data);
    return data;
  } catch (error) {
    console.error('获取操作详细日志错误:', error);
    throw error;
  }
};

/**
 * 获取管理员操作统计报告
 * @param {Object} params - 查询参数
 * @param {string} params.timeRange - 时间范围 (today, week, month, year, custom)
 * @param {string} params.startDate - 自定义开始日期 (YYYY-MM-DD)
 * @param {string} params.endDate - 自定义结束日期 (YYYY-MM-DD)
 * @param {string} params.reportType - 报告类型 (daily, weekly, monthly, custom)
 * @returns {Promise} 返回API响应
 */
export const getOperationReport = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/report?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`获取操作统计报告失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('获取操作统计报告成功:', data);
    return data;
  } catch (error) {
    console.error('获取操作统计报告错误:', error);
    throw error;
  }
};