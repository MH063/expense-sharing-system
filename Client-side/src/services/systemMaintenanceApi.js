import axios from 'axios';
import { getToken } from './auth';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API请求] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
    return config;
  },
  error => {
    console.error('[API请求错误]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理响应和错误
api.interceptors.response.use(
  response => {
    console.log(`[API响应] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  error => {
    console.error('[API响应错误]', error.response?.data || error.message);
    
    // 如果token过期，重定向到登录页
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

/**
 * 系统维护相关API
 */

// 1. 获取系统维护状态
export const getMaintenanceStatus = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/status');
    return response.data;
  } catch (error) {
    console.error('获取系统维护状态失败:', error);
    throw error;
  }
};

// 2. 启动系统维护模式
export const startMaintenanceMode = async (maintenanceData) => {
  try {
    const response = await api.post('/admin/system-maintenance/start', maintenanceData);
    return response.data;
  } catch (error) {
    console.error('启动系统维护模式失败:', error);
    throw error;
  }
};

// 3. 停止系统维护模式
export const stopMaintenanceMode = async () => {
  try {
    const response = await api.post('/admin/system-maintenance/stop');
    return response.data;
  } catch (error) {
    console.error('停止系统维护模式失败:', error);
    throw error;
  }
};

// 4. 更新维护模式配置
export const updateMaintenanceConfig = async (configData) => {
  try {
    const response = await api.put('/admin/system-maintenance/config', configData);
    return response.data;
  } catch (error) {
    console.error('更新维护模式配置失败:', error);
    throw error;
  }
};

// 5. 获取维护模式配置
export const getMaintenanceConfig = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/config');
    return response.data;
  } catch (error) {
    console.error('获取维护模式配置失败:', error);
    throw error;
  }
};

// 6. 获取系统维护历史记录
export const getMaintenanceHistory = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/history', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护历史记录失败:', error);
    throw error;
  }
};

// 7. 获取系统维护日志
export const getMaintenanceLogs = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/logs', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护日志失败:', error);
    throw error;
  }
};

// 8. 获取系统维护统计信息
export const getMaintenanceStats = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/stats');
    return response.data;
  } catch (error) {
    console.error('获取系统维护统计信息失败:', error);
    throw error;
  }
};

// 9. 创建维护公告
export const createMaintenanceAnnouncement = async (announcementData) => {
  try {
    const response = await api.post('/admin/system-maintenance/announcement', announcementData);
    return response.data;
  } catch (error) {
    console.error('创建维护公告失败:', error);
    throw error;
  }
};

// 10. 更新维护公告
export const updateMaintenanceAnnouncement = async (id, announcementData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/announcement/${id}`, announcementData);
    return response.data;
  } catch (error) {
    console.error('更新维护公告失败:', error);
    throw error;
  }
};

// 11. 删除维护公告
export const deleteMaintenanceAnnouncement = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/announcement/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除维护公告失败:', error);
    throw error;
  }
};

// 12. 获取维护公告列表
export const getMaintenanceAnnouncements = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/announcements', { params });
    return response.data;
  } catch (error) {
    console.error('获取维护公告列表失败:', error);
    throw error;
  }
};

// 13. 获取系统维护通知设置
export const getMaintenanceNotificationSettings = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/notification-settings');
    return response.data;
  } catch (error) {
    console.error('获取系统维护通知设置失败:', error);
    throw error;
  }
};

// 14. 更新系统维护通知设置
export const updateMaintenanceNotificationSettings = async (settingsData) => {
  try {
    const response = await api.put('/admin/system-maintenance/notification-settings', settingsData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护通知设置失败:', error);
    throw error;
  }
};

// 15. 发送维护通知
export const sendMaintenanceNotification = async (notificationData) => {
  try {
    const response = await api.post('/admin/system-maintenance/send-notification', notificationData);
    return response.data;
  } catch (error) {
    console.error('发送维护通知失败:', error);
    throw error;
  }
};

// 16. 获取系统维护计划
export const getMaintenanceSchedule = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/schedule', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护计划失败:', error);
    throw error;
  }
};

// 17. 创建系统维护计划
export const createMaintenanceSchedule = async (scheduleData) => {
  try {
    const response = await api.post('/admin/system-maintenance/schedule', scheduleData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护计划失败:', error);
    throw error;
  }
};

// 18. 更新系统维护计划
export const updateMaintenanceSchedule = async (id, scheduleData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/schedule/${id}`, scheduleData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护计划失败:', error);
    throw error;
  }
};

// 19. 删除系统维护计划
export const deleteMaintenanceSchedule = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/schedule/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护计划失败:', error);
    throw error;
  }
};

// 20. 获取系统维护任务列表
export const getMaintenanceTasks = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/tasks', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护任务列表失败:', error);
    throw error;
  }
};

// 21. 创建系统维护任务
export const createMaintenanceTask = async (taskData) => {
  try {
    const response = await api.post('/admin/system-maintenance/tasks', taskData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护任务失败:', error);
    throw error;
  }
};

// 22. 更新系统维护任务
export const updateMaintenanceTask = async (id, taskData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/tasks/${id}`, taskData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护任务失败:', error);
    throw error;
  }
};

// 23. 删除系统维护任务
export const deleteMaintenanceTask = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/tasks/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护任务失败:', error);
    throw error;
  }
};

// 24. 执行系统维护任务
export const executeMaintenanceTask = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/tasks/${id}/execute`);
    return response.data;
  } catch (error) {
    console.error('执行系统维护任务失败:', error);
    throw error;
  }
};

// 25. 获取系统维护报告
export const getMaintenanceReports = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/reports', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护报告失败:', error);
    throw error;
  }
};

// 26. 生成系统维护报告
export const generateMaintenanceReport = async (reportData) => {
  try {
    const response = await api.post('/admin/system-maintenance/reports/generate', reportData);
    return response.data;
  } catch (error) {
    console.error('生成系统维护报告失败:', error);
    throw error;
  }
};

// 27. 导出系统维护报告
export const exportMaintenanceReport = async (id, format = 'pdf') => {
  try {
    const response = await api.get(`/admin/system-maintenance/reports/${id}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response;
  } catch (error) {
    console.error('导出系统维护报告失败:', error);
    throw error;
  }
};

// 28. 获取系统维护备份列表
export const getMaintenanceBackups = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/backups', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护备份列表失败:', error);
    throw error;
  }
};

// 29. 创建系统维护备份
export const createMaintenanceBackup = async (backupData) => {
  try {
    const response = await api.post('/admin/system-maintenance/backups', backupData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护备份失败:', error);
    throw error;
  }
};

// 30. 恢复系统维护备份
export const restoreMaintenanceBackup = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/backups/${id}/restore`);
    return response.data;
  } catch (error) {
    console.error('恢复系统维护备份失败:', error);
    throw error;
  }
};

// 31. 删除系统维护备份
export const deleteMaintenanceBackup = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/backups/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护备份失败:', error);
    throw error;
  }
};

// 32. 下载系统维护备份
export const downloadMaintenanceBackup = async (id) => {
  try {
    const response = await api.get(`/admin/system-maintenance/backups/${id}/download`, {
      responseType: 'blob'
    });
    return response;
  } catch (error) {
    console.error('下载系统维护备份失败:', error);
    throw error;
  }
};

// 33. 获取系统维护健康检查结果
export const getMaintenanceHealthCheck = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/health-check');
    return response.data;
  } catch (error) {
    console.error('获取系统维护健康检查结果失败:', error);
    throw error;
  }
};

// 34. 执行系统维护健康检查
export const executeMaintenanceHealthCheck = async () => {
  try {
    const response = await api.post('/admin/system-maintenance/health-check/execute');
    return response.data;
  } catch (error) {
    console.error('执行系统维护健康检查失败:', error);
    throw error;
  }
};

// 35. 获取系统维护性能指标
export const getMaintenancePerformanceMetrics = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/performance-metrics', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护性能指标失败:', error);
    throw error;
  }
};

// 36. 获取系统维护错误日志
export const getMaintenanceErrorLogs = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/error-logs', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护错误日志失败:', error);
    throw error;
  }
};

// 37. 清理系统维护错误日志
export const clearMaintenanceErrorLogs = async (params = {}) => {
  try {
    const response = await api.delete('/admin/system-maintenance/error-logs', { params });
    return response.data;
  } catch (error) {
    console.error('清理系统维护错误日志失败:', error);
    throw error;
  }
};

// 38. 获取系统维护警告列表
export const getMaintenanceWarnings = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/warnings', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护警告列表失败:', error);
    throw error;
  }
};

// 39. 忽略系统维护警告
export const ignoreMaintenanceWarning = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/warnings/${id}/ignore`);
    return response.data;
  } catch (error) {
    console.error('忽略系统维护警告失败:', error);
    throw error;
  }
};

// 40. 解决系统维护警告
export const resolveMaintenanceWarning = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/warnings/${id}/resolve`);
    return response.data;
  } catch (error) {
    console.error('解决系统维护警告失败:', error);
    throw error;
  }
};

// 41. 获取系统维护建议
export const getMaintenanceRecommendations = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/recommendations', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护建议失败:', error);
    throw error;
  }
};

// 42. 应用系统维护建议
export const applyMaintenanceRecommendation = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/recommendations/${id}/apply`);
    return response.data;
  } catch (error) {
    console.error('应用系统维护建议失败:', error);
    throw error;
  }
};

// 43. 获取系统维护依赖项
export const getMaintenanceDependencies = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/dependencies', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护依赖项失败:', error);
    throw error;
  }
};

// 44. 更新系统维护依赖项
export const updateMaintenanceDependency = async (id, dependencyData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/dependencies/${id}`, dependencyData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护依赖项失败:', error);
    throw error;
  }
};

// 45. 获取系统维护环境变量
export const getMaintenanceEnvironmentVariables = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/environment-variables', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护环境变量失败:', error);
    throw error;
  }
};

// 46. 更新系统维护环境变量
export const updateMaintenanceEnvironmentVariable = async (id, variableData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/environment-variables/${id}`, variableData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护环境变量失败:', error);
    throw error;
  }
};

// 47. 获取系统维护配置文件
export const getMaintenanceConfigFiles = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/config-files', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护配置文件失败:', error);
    throw error;
  }
};

// 48. 更新系统维护配置文件
export const updateMaintenanceConfigFile = async (id, fileData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/config-files/${id}`, fileData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护配置文件失败:', error);
    throw error;
  }
};

// 49. 获取系统维护服务状态
export const getMaintenanceServiceStatus = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/service-status', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护服务状态失败:', error);
    throw error;
  }
};

// 50. 重启系统维护服务
export const restartMaintenanceService = async (serviceName) => {
  try {
    const response = await api.post(`/admin/system-maintenance/service-restart/${serviceName}`);
    return response.data;
  } catch (error) {
    console.error('重启系统维护服务失败:', error);
    throw error;
  }
};

// 51. 获取系统维护数据库状态
export const getMaintenanceDatabaseStatus = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/database-status');
    return response.data;
  } catch (error) {
    console.error('获取系统维护数据库状态失败:', error);
    throw error;
  }
};

// 52. 优化系统维护数据库
export const optimizeMaintenanceDatabase = async () => {
  try {
    const response = await api.post('/admin/system-maintenance/database-optimize');
    return response.data;
  } catch (error) {
    console.error('优化系统维护数据库失败:', error);
    throw error;
  }
};

// 53. 修复系统维护数据库
export const repairMaintenanceDatabase = async () => {
  try {
    const response = await api.post('/admin/system-maintenance/database-repair');
    return response.data;
  } catch (error) {
    console.error('修复系统维护数据库失败:', error);
    throw error;
  }
};

// 54. 获取系统维护缓存状态
export const getMaintenanceCacheStatus = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/cache-status');
    return response.data;
  } catch (error) {
    console.error('获取系统维护缓存状态失败:', error);
    throw error;
  }
};

// 55. 清理系统维护缓存
export const clearMaintenanceCache = async (params = {}) => {
  try {
    const response = await api.delete('/admin/system-maintenance/cache', { params });
    return response.data;
  } catch (error) {
    console.error('清理系统维护缓存失败:', error);
    throw error;
  }
};

// 56. 获取系统维护日志文件列表
export const getMaintenanceLogFiles = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/log-files', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护日志文件列表失败:', error);
    throw error;
  }
};

// 57. 下载系统维护日志文件
export const downloadMaintenanceLogFile = async (id) => {
  try {
    const response = await api.get(`/admin/system-maintenance/log-files/${id}/download`, {
      responseType: 'blob'
    });
    return response;
  } catch (error) {
    console.error('下载系统维护日志文件失败:', error);
    throw error;
  }
};

// 58. 删除系统维护日志文件
export const deleteMaintenanceLogFile = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/log-files/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护日志文件失败:', error);
    throw error;
  }
};

// 59. 获取系统维护监控指标
export const getMaintenanceMonitoringMetrics = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/monitoring-metrics', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护监控指标失败:', error);
    throw error;
  }
};

// 60. 获取系统维护警报规则
export const getMaintenanceAlertRules = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/alert-rules', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护警报规则失败:', error);
    throw error;
  }
};

// 61. 创建系统维护警报规则
export const createMaintenanceAlertRule = async (ruleData) => {
  try {
    const response = await api.post('/admin/system-maintenance/alert-rules', ruleData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护警报规则失败:', error);
    throw error;
  }
};

// 62. 更新系统维护警报规则
export const updateMaintenanceAlertRule = async (id, ruleData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/alert-rules/${id}`, ruleData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护警报规则失败:', error);
    throw error;
  }
};

// 63. 删除系统维护警报规则
export const deleteMaintenanceAlertRule = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/alert-rules/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护警报规则失败:', error);
    throw error;
  }
};

// 64. 获取系统维护警报历史
export const getMaintenanceAlertHistory = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/alert-history', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护警报历史失败:', error);
    throw error;
  }
};

// 65. 获取系统维护仪表板数据
export const getMaintenanceDashboard = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/dashboard');
    return response.data;
  } catch (error) {
    console.error('获取系统维护仪表板数据失败:', error);
    throw error;
  }
};

// 66. 获取系统维护系统信息
export const getMaintenanceSystemInfo = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/system-info');
    return response.data;
  } catch (error) {
    console.error('获取系统维护系统信息失败:', error);
    throw error;
  }
};

// 67. 获取系统维护版本信息
export const getMaintenanceVersionInfo = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/version-info');
    return response.data;
  } catch (error) {
    console.error('获取系统维护版本信息失败:', error);
    throw error;
  }
};

// 68. 检查系统维护更新
export const checkMaintenanceUpdates = async () => {
  try {
    const response = await api.post('/admin/system-maintenance/check-updates');
    return response.data;
  } catch (error) {
    console.error('检查系统维护更新失败:', error);
    throw error;
  }
};

// 69. 应用系统维护更新
export const applyMaintenanceUpdates = async (updateData) => {
  try {
    const response = await api.post('/admin/system-maintenance/apply-updates', updateData);
    return response.data;
  } catch (error) {
    console.error('应用系统维护更新失败:', error);
    throw error;
  }
};

// 70. 获取系统维护更新历史
export const getMaintenanceUpdateHistory = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/update-history', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护更新历史失败:', error);
    throw error;
  }
};

// 71. 获取系统维护安全扫描结果
export const getMaintenanceSecurityScan = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/security-scan');
    return response.data;
  } catch (error) {
    console.error('获取系统维护安全扫描结果失败:', error);
    throw error;
  }
};

// 72. 执行系统维护安全扫描
export const executeMaintenanceSecurityScan = async () => {
  try {
    const response = await api.post('/admin/system-maintenance/security-scan/execute');
    return response.data;
  } catch (error) {
    console.error('执行系统维护安全扫描失败:', error);
    throw error;
  }
};

// 73. 获取系统维护许可证信息
export const getMaintenanceLicenseInfo = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/license-info');
    return response.data;
  } catch (error) {
    console.error('获取系统维护许可证信息失败:', error);
    throw error;
  }
};

// 74. 更新系统维护许可证
export const updateMaintenanceLicense = async (licenseData) => {
  try {
    const response = await api.put('/admin/system-maintenance/license-info', licenseData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护许可证失败:', error);
    throw error;
  }
};

// 75. 获取系统维护API使用统计
export const getMaintenanceApiUsageStats = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/api-usage-stats', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护API使用统计失败:', error);
    throw error;
  }
};

// 76. 获取系统维护用户活动统计
export const getMaintenanceUserActivityStats = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/user-activity-stats', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护用户活动统计失败:', error);
    throw error;
  }
};

// 77. 获取系统维护系统资源使用情况
export const getMaintenanceSystemResourceUsage = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/system-resource-usage');
    return response.data;
  } catch (error) {
    console.error('获取系统维护系统资源使用情况失败:', error);
    throw error;
  }
};

// 78. 获取系统维护网络状态
export const getMaintenanceNetworkStatus = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/network-status');
    return response.data;
  } catch (error) {
    console.error('获取系统维护网络状态失败:', error);
    throw error;
  }
};

// 79. 获取系统维护存储状态
export const getMaintenanceStorageStatus = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/storage-status');
    return response.data;
  } catch (error) {
    console.error('获取系统维护存储状态失败:', error);
    throw error;
  }
};

// 80. 获取系统维护备份策略
export const getMaintenanceBackupStrategy = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/backup-strategy');
    return response.data;
  } catch (error) {
    console.error('获取系统维护备份策略失败:', error);
    throw error;
  }
};

// 81. 更新系统维护备份策略
export const updateMaintenanceBackupStrategy = async (strategyData) => {
  try {
    const response = await api.put('/admin/system-maintenance/backup-strategy', strategyData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护备份策略失败:', error);
    throw error;
  }
};

// 82. 获取系统维护恢复策略
export const getMaintenanceRecoveryStrategy = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/recovery-strategy');
    return response.data;
  } catch (error) {
    console.error('获取系统维护恢复策略失败:', error);
    throw error;
  }
};

// 83. 更新系统维护恢复策略
export const updateMaintenanceRecoveryStrategy = async (strategyData) => {
  try {
    const response = await api.put('/admin/system-maintenance/recovery-strategy', strategyData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护恢复策略失败:', error);
    throw error;
  }
};

// 84. 获取系统维护灾难恢复计划
export const getMaintenanceDisasterRecoveryPlan = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/disaster-recovery-plan');
    return response.data;
  } catch (error) {
    console.error('获取系统维护灾难恢复计划失败:', error);
    throw error;
  }
};

// 85. 更新系统维护灾难恢复计划
export const updateMaintenanceDisasterRecoveryPlan = async (planData) => {
  try {
    const response = await api.put('/admin/system-maintenance/disaster-recovery-plan', planData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护灾难恢复计划失败:', error);
    throw error;
  }
};

// 86. 执行系统维护灾难恢复演练
export const executeMaintenanceDisasterRecoveryDrill = async () => {
  try {
    const response = await api.post('/admin/system-maintenance/disaster-recovery-drill/execute');
    return response.data;
  } catch (error) {
    console.error('执行系统维护灾难恢复演练失败:', error);
    throw error;
  }
};

// 87. 获取系统维护灾难恢复演练历史
export const getMaintenanceDisasterRecoveryDrillHistory = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/disaster-recovery-drill-history', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护灾难恢复演练历史失败:', error);
    throw error;
  }
};

// 88. 获取系统维护性能基准
export const getMaintenancePerformanceBenchmarks = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/performance-benchmarks', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护性能基准失败:', error);
    throw error;
  }
};

// 89. 更新系统维护性能基准
export const updateMaintenancePerformanceBenchmark = async (id, benchmarkData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/performance-benchmarks/${id}`, benchmarkData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护性能基准失败:', error);
    throw error;
  }
};

// 90. 获取系统维护性能趋势
export const getMaintenancePerformanceTrends = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/performance-trends', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护性能趋势失败:', error);
    throw error;
  }
};

// 91. 获取系统维护容量规划
export const getMaintenanceCapacityPlanning = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/capacity-planning', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护容量规划失败:', error);
    throw error;
  }
};

// 92. 更新系统维护容量规划
export const updateMaintenanceCapacityPlanning = async (planningData) => {
  try {
    const response = await api.put('/admin/system-maintenance/capacity-planning', planningData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护容量规划失败:', error);
    throw error;
  }
};

// 93. 获取系统维护自动扩展策略
export const getMaintenanceAutoScalingStrategy = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/auto-scaling-strategy');
    return response.data;
  } catch (error) {
    console.error('获取系统维护自动扩展策略失败:', error);
    throw error;
  }
};

// 94. 更新系统维护自动扩展策略
export const updateMaintenanceAutoScalingStrategy = async (strategyData) => {
  try {
    const response = await api.put('/admin/system-maintenance/auto-scaling-strategy', strategyData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护自动扩展策略失败:', error);
    throw error;
  }
};

// 95. 获取系统维护负载均衡配置
export const getMaintenanceLoadBalancingConfig = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/load-balancing-config');
    return response.data;
  } catch (error) {
    console.error('获取系统维护负载均衡配置失败:', error);
    throw error;
  }
};

// 96. 更新系统维护负载均衡配置
export const updateMaintenanceLoadBalancingConfig = async (configData) => {
  try {
    const response = await api.put('/admin/system-maintenance/load-balancing-config', configData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护负载均衡配置失败:', error);
    throw error;
  }
};

// 97. 获取系统维护CDN配置
export const getMaintenanceCdnConfig = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/cdn-config');
    return response.data;
  } catch (error) {
    console.error('获取系统维护CDN配置失败:', error);
    throw error;
  }
};

// 98. 更新系统维护CDN配置
export const updateMaintenanceCdnConfig = async (configData) => {
  try {
    const response = await api.put('/admin/system-maintenance/cdn-config', configData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护CDN配置失败:', error);
    throw error;
  }
};

// 99. 获取系统维护防火墙规则
export const getMaintenanceFirewallRules = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/firewall-rules', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护防火墙规则失败:', error);
    throw error;
  }
};

// 100. 创建系统维护防火墙规则
export const createMaintenanceFirewallRule = async (ruleData) => {
  try {
    const response = await api.post('/admin/system-maintenance/firewall-rules', ruleData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护防火墙规则失败:', error);
    throw error;
  }
};

// 101. 更新系统维护防火墙规则
export const updateMaintenanceFirewallRule = async (id, ruleData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/firewall-rules/${id}`, ruleData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护防火墙规则失败:', error);
    throw error;
  }
};

// 102. 删除系统维护防火墙规则
export const deleteMaintenanceFirewallRule = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/firewall-rules/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护防火墙规则失败:', error);
    throw error;
  }
};

// 103. 获取系统维护SSL证书
export const getMaintenanceSslCertificates = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/ssl-certificates', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护SSL证书失败:', error);
    throw error;
  }
};

// 104. 上传系统维护SSL证书
export const uploadMaintenanceSslCertificate = async (certificateData) => {
  try {
    const response = await api.post('/admin/system-maintenance/ssl-certificates', certificateData);
    return response.data;
  } catch (error) {
    console.error('上传系统维护SSL证书失败:', error);
    throw error;
  }
};

// 105. 更新系统维护SSL证书
export const updateMaintenanceSslCertificate = async (id, certificateData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/ssl-certificates/${id}`, certificateData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护SSL证书失败:', error);
    throw error;
  }
};

// 106. 删除系统维护SSL证书
export const deleteMaintenanceSslCertificate = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/ssl-certificates/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护SSL证书失败:', error);
    throw error;
  }
};

// 107. 获取系统维护域名配置
export const getMaintenanceDomainConfig = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/domain-config');
    return response.data;
  } catch (error) {
    console.error('获取系统维护域名配置失败:', error);
    throw error;
  }
};

// 108. 更新系统维护域名配置
export const updateMaintenanceDomainConfig = async (configData) => {
  try {
    const response = await api.put('/admin/system-maintenance/domain-config', configData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护域名配置失败:', error);
    throw error;
  }
};

// 109. 获取系统维护邮件配置
export const getMaintenanceEmailConfig = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/email-config');
    return response.data;
  } catch (error) {
    console.error('获取系统维护邮件配置失败:', error);
    throw error;
  }
};

// 110. 更新系统维护邮件配置
export const updateMaintenanceEmailConfig = async (configData) => {
  try {
    const response = await api.put('/admin/system-maintenance/email-config', configData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护邮件配置失败:', error);
    throw error;
  }
};

// 111. 测试系统维护邮件配置
export const testMaintenanceEmailConfig = async (testData) => {
  try {
    const response = await api.post('/admin/system-maintenance/email-config/test', testData);
    return response.data;
  } catch (error) {
    console.error('测试系统维护邮件配置失败:', error);
    throw error;
  }
};

// 112. 获取系统维护短信配置
export const getMaintenanceSmsConfig = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/sms-config');
    return response.data;
  } catch (error) {
    console.error('获取系统维护短信配置失败:', error);
    throw error;
  }
};

// 113. 更新系统维护短信配置
export const updateMaintenanceSmsConfig = async (configData) => {
  try {
    const response = await api.put('/admin/system-maintenance/sms-config', configData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护短信配置失败:', error);
    throw error;
  }
};

// 114. 测试系统维护短信配置
export const testMaintenanceSmsConfig = async (testData) => {
  try {
    const response = await api.post('/admin/system-maintenance/sms-config/test', testData);
    return response.data;
  } catch (error) {
    console.error('测试系统维护短信配置失败:', error);
    throw error;
  }
};

// 115. 获取系统维护推送通知配置
export const getMaintenancePushNotificationConfig = async () => {
  try {
    const response = await api.get('/admin/system-maintenance/push-notification-config');
    return response.data;
  } catch (error) {
    console.error('获取系统维护推送通知配置失败:', error);
    throw error;
  }
};

// 116. 更新系统维护推送通知配置
export const updateMaintenancePushNotificationConfig = async (configData) => {
  try {
    const response = await api.put('/admin/system-maintenance/push-notification-config', configData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护推送通知配置失败:', error);
    throw error;
  }
};

// 117. 测试系统维护推送通知配置
export const testMaintenancePushNotificationConfig = async (testData) => {
  try {
    const response = await api.post('/admin/system-maintenance/push-notification-config/test', testData);
    return response.data;
  } catch (error) {
    console.error('测试系统维护推送通知配置失败:', error);
    throw error;
  }
};

// 118. 获取系统维护集成配置
export const getMaintenanceIntegrationConfig = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/integration-config', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护集成配置失败:', error);
    throw error;
  }
};

// 119. 更新系统维护集成配置
export const updateMaintenanceIntegrationConfig = async (id, configData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/integration-config/${id}`, configData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护集成配置失败:', error);
    throw error;
  }
};

// 120. 测试系统维护集成配置
export const testMaintenanceIntegrationConfig = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/integration-config/${id}/test`);
    return response.data;
  } catch (error) {
    console.error('测试系统维护集成配置失败:', error);
    throw error;
  }
};

// 121. 获取系统维护自定义脚本
export const getMaintenanceCustomScripts = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/custom-scripts', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护自定义脚本失败:', error);
    throw error;
  }
};

// 122. 创建系统维护自定义脚本
export const createMaintenanceCustomScript = async (scriptData) => {
  try {
    const response = await api.post('/admin/system-maintenance/custom-scripts', scriptData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护自定义脚本失败:', error);
    throw error;
  }
};

// 123. 更新系统维护自定义脚本
export const updateMaintenanceCustomScript = async (id, scriptData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/custom-scripts/${id}`, scriptData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护自定义脚本失败:', error);
    throw error;
  }
};

// 124. 删除系统维护自定义脚本
export const deleteMaintenanceCustomScript = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/custom-scripts/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护自定义脚本失败:', error);
    throw error;
  }
};

// 125. 执行系统维护自定义脚本
export const executeMaintenanceCustomScript = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/custom-scripts/${id}/execute`);
    return response.data;
  } catch (error) {
    console.error('执行系统维护自定义脚本失败:', error);
    throw error;
  }
};

// 126. 获取系统维护自定义脚本执行历史
export const getMaintenanceCustomScriptExecutionHistory = async (id, params = {}) => {
  try {
    const response = await api.get(`/admin/system-maintenance/custom-scripts/${id}/execution-history`, { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护自定义脚本执行历史失败:', error);
    throw error;
  }
};

// 127. 获取系统维护自动化规则
export const getMaintenanceAutomationRules = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/automation-rules', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护自动化规则失败:', error);
    throw error;
  }
};

// 128. 创建系统维护自动化规则
export const createMaintenanceAutomationRule = async (ruleData) => {
  try {
    const response = await api.post('/admin/system-maintenance/automation-rules', ruleData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护自动化规则失败:', error);
    throw error;
  }
};

// 129. 更新系统维护自动化规则
export const updateMaintenanceAutomationRule = async (id, ruleData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/automation-rules/${id}`, ruleData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护自动化规则失败:', error);
    throw error;
  }
};

// 130. 删除系统维护自动化规则
export const deleteMaintenanceAutomationRule = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/automation-rules/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护自动化规则失败:', error);
    throw error;
  }
};

// 131. 启用系统维护自动化规则
export const enableMaintenanceAutomationRule = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/automation-rules/${id}/enable`);
    return response.data;
  } catch (error) {
    console.error('启用系统维护自动化规则失败:', error);
    throw error;
  }
};

// 132. 禁用系统维护自动化规则
export const disableMaintenanceAutomationRule = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/automation-rules/${id}/disable`);
    return response.data;
  } catch (error) {
    console.error('禁用系统维护自动化规则失败:', error);
    throw error;
  }
};

// 133. 获取系统维护自动化规则执行历史
export const getMaintenanceAutomationRuleExecutionHistory = async (id, params = {}) => {
  try {
    const response = await api.get(`/admin/system-maintenance/automation-rules/${id}/execution-history`, { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护自动化规则执行历史失败:', error);
    throw error;
  }
};

// 134. 获取系统维护模板
export const getMaintenanceTemplates = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/templates', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护模板失败:', error);
    throw error;
  }
};

// 135. 创建系统维护模板
export const createMaintenanceTemplate = async (templateData) => {
  try {
    const response = await api.post('/admin/system-maintenance/templates', templateData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护模板失败:', error);
    throw error;
  }
};

// 136. 更新系统维护模板
export const updateMaintenanceTemplate = async (id, templateData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/templates/${id}`, templateData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护模板失败:', error);
    throw error;
  }
};

// 137. 删除系统维护模板
export const deleteMaintenanceTemplate = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/templates/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护模板失败:', error);
    throw error;
  }
};

// 138. 应用系统维护模板
export const applyMaintenanceTemplate = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/templates/${id}/apply`);
    return response.data;
  } catch (error) {
    console.error('应用系统维护模板失败:', error);
    throw error;
  }
};

// 139. 获取系统维护工作流
export const getMaintenanceWorkflows = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/workflows', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护工作流失败:', error);
    throw error;
  }
};

// 140. 创建系统维护工作流
export const createMaintenanceWorkflow = async (workflowData) => {
  try {
    const response = await api.post('/admin/system-maintenance/workflows', workflowData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护工作流失败:', error);
    throw error;
  }
};

// 141. 更新系统维护工作流
export const updateMaintenanceWorkflow = async (id, workflowData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/workflows/${id}`, workflowData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护工作流失败:', error);
    throw error;
  }
};

// 142. 删除系统维护工作流
export const deleteMaintenanceWorkflow = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/workflows/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护工作流失败:', error);
    throw error;
  }
};

// 143. 执行系统维护工作流
export const executeMaintenanceWorkflow = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/workflows/${id}/execute`);
    return response.data;
  } catch (error) {
    console.error('执行系统维护工作流失败:', error);
    throw error;
  }
};

// 144. 获取系统维护工作流执行历史
export const getMaintenanceWorkflowExecutionHistory = async (id, params = {}) => {
  try {
    const response = await api.get(`/admin/system-maintenance/workflows/${id}/execution-history`, { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护工作流执行历史失败:', error);
    throw error;
  }
};

// 145. 获取系统维护知识库
export const getMaintenanceKnowledgeBase = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/knowledge-base', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护知识库失败:', error);
    throw error;
  }
};

// 146. 创建系统维护知识库条目
export const createMaintenanceKnowledgeBaseEntry = async (entryData) => {
  try {
    const response = await api.post('/admin/system-maintenance/knowledge-base', entryData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护知识库条目失败:', error);
    throw error;
  }
};

// 147. 更新系统维护知识库条目
export const updateMaintenanceKnowledgeBaseEntry = async (id, entryData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/knowledge-base/${id}`, entryData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护知识库条目失败:', error);
    throw error;
  }
};

// 148. 删除系统维护知识库条目
export const deleteMaintenanceKnowledgeBaseEntry = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/knowledge-base/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护知识库条目失败:', error);
    throw error;
  }
};

// 149. 获取系统维护常见问题
export const getMaintenanceFaq = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/faq', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护常见问题失败:', error);
    throw error;
  }
};

// 150. 创建系统维护常见问题
export const createMaintenanceFaq = async (faqData) => {
  try {
    const response = await api.post('/admin/system-maintenance/faq', faqData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护常见问题失败:', error);
    throw error;
  }
};

// 151. 更新系统维护常见问题
export const updateMaintenanceFaq = async (id, faqData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/faq/${id}`, faqData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护常见问题失败:', error);
    throw error;
  }
};

// 152. 删除系统维护常见问题
export const deleteMaintenanceFaq = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/faq/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护常见问题失败:', error);
    throw error;
  }
};

// 153. 获取系统维护文档
export const getMaintenanceDocumentation = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/documentation', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护文档失败:', error);
    throw error;
  }
};

// 154. 创建系统维护文档
export const createMaintenanceDocumentation = async (docData) => {
  try {
    const response = await api.post('/admin/system-maintenance/documentation', docData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护文档失败:', error);
    throw error;
  }
};

// 155. 更新系统维护文档
export const updateMaintenanceDocumentation = async (id, docData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/documentation/${id}`, docData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护文档失败:', error);
    throw error;
  }
};

// 156. 删除系统维护文档
export const deleteMaintenanceDocumentation = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/documentation/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护文档失败:', error);
    throw error;
  }
};

// 157. 获取系统维护培训材料
export const getMaintenanceTrainingMaterials = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/training-materials', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护培训材料失败:', error);
    throw error;
  }
};

// 158. 创建系统维护培训材料
export const createMaintenanceTrainingMaterial = async (materialData) => {
  try {
    const response = await api.post('/admin/system-maintenance/training-materials', materialData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护培训材料失败:', error);
    throw error;
  }
};

// 159. 更新系统维护培训材料
export const updateMaintenanceTrainingMaterial = async (id, materialData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/training-materials/${id}`, materialData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护培训材料失败:', error);
    throw error;
  }
};

// 160. 删除系统维护培训材料
export const deleteMaintenanceTrainingMaterial = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/training-materials/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护培训材料失败:', error);
    throw error;
  }
};

// 161. 获取系统维护视频教程
export const getMaintenanceVideoTutorials = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/video-tutorials', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护视频教程失败:', error);
    throw error;
  }
};

// 162. 创建系统维护视频教程
export const createMaintenanceVideoTutorial = async (tutorialData) => {
  try {
    const response = await api.post('/admin/system-maintenance/video-tutorials', tutorialData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护视频教程失败:', error);
    throw error;
  }
};

// 163. 更新系统维护视频教程
export const updateMaintenanceVideoTutorial = async (id, tutorialData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/video-tutorials/${id}`, tutorialData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护视频教程失败:', error);
    throw error;
  }
};

// 164. 删除系统维护视频教程
export const deleteMaintenanceVideoTutorial = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/video-tutorials/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护视频教程失败:', error);
    throw error;
  }
};

// 165. 获取系统维护最佳实践
export const getMaintenanceBestPractices = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/best-practices', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护最佳实践失败:', error);
    throw error;
  }
};

// 166. 创建系统维护最佳实践
export const createMaintenanceBestPractice = async (practiceData) => {
  try {
    const response = await api.post('/admin/system-maintenance/best-practices', practiceData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护最佳实践失败:', error);
    throw error;
  }
};

// 167. 更新系统维护最佳实践
export const updateMaintenanceBestPractice = async (id, practiceData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/best-practices/${id}`, practiceData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护最佳实践失败:', error);
    throw error;
  }
};

// 168. 删除系统维护最佳实践
export const deleteMaintenanceBestPractice = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/best-practices/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护最佳实践失败:', error);
    throw error;
  }
};

// 169. 获取系统维护检查清单
export const getMaintenanceChecklist = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/checklist', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护检查清单失败:', error);
    throw error;
  }
};

// 170. 创建系统维护检查清单
export const createMaintenanceChecklist = async (checklistData) => {
  try {
    const response = await api.post('/admin/system-maintenance/checklist', checklistData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护检查清单失败:', error);
    throw error;
  }
};

// 171. 更新系统维护检查清单
export const updateMaintenanceChecklist = async (id, checklistData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/checklist/${id}`, checklistData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护检查清单失败:', error);
    throw error;
  }
};

// 172. 删除系统维护检查清单
export const deleteMaintenanceChecklist = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/checklist/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护检查清单失败:', error);
    throw error;
  }
};

// 173. 获取系统维护检查清单模板
export const getMaintenanceChecklistTemplates = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/checklist-templates', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护检查清单模板失败:', error);
    throw error;
  }
};

// 174. 创建系统维护检查清单模板
export const createMaintenanceChecklistTemplate = async (templateData) => {
  try {
    const response = await api.post('/admin/system-maintenance/checklist-templates', templateData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护检查清单模板失败:', error);
    throw error;
  }
};

// 175. 更新系统维护检查清单模板
export const updateMaintenanceChecklistTemplate = async (id, templateData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/checklist-templates/${id}`, templateData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护检查清单模板失败:', error);
    throw error;
  }
};

// 176. 删除系统维护检查清单模板
export const deleteMaintenanceChecklistTemplate = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/checklist-templates/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护检查清单模板失败:', error);
    throw error;
  }
};

// 177. 应用系统维护检查清单模板
export const applyMaintenanceChecklistTemplate = async (id) => {
  try {
    const response = await api.post(`/admin/system-maintenance/checklist-templates/${id}/apply`);
    return response.data;
  } catch (error) {
    console.error('应用系统维护检查清单模板失败:', error);
    throw error;
  }
};

// 178. 获取系统维护供应商信息
export const getMaintenanceVendorInfo = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/vendor-info', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护供应商信息失败:', error);
    throw error;
  }
};

// 179. 创建系统维护供应商信息
export const createMaintenanceVendorInfo = async (vendorData) => {
  try {
    const response = await api.post('/admin/system-maintenance/vendor-info', vendorData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护供应商信息失败:', error);
    throw error;
  }
};

// 180. 更新系统维护供应商信息
export const updateMaintenanceVendorInfo = async (id, vendorData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/vendor-info/${id}`, vendorData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护供应商信息失败:', error);
    throw error;
  }
};

// 181. 删除系统维护供应商信息
export const deleteMaintenanceVendorInfo = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/vendor-info/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护供应商信息失败:', error);
    throw error;
  }
};

// 182. 获取系统维护合同信息
export const getMaintenanceContractInfo = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/contract-info', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护合同信息失败:', error);
    throw error;
  }
};

// 183. 创建系统维护合同信息
export const createMaintenanceContractInfo = async (contractData) => {
  try {
    const response = await api.post('/admin/system-maintenance/contract-info', contractData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护合同信息失败:', error);
    throw error;
  }
};

// 184. 更新系统维护合同信息
export const updateMaintenanceContractInfo = async (id, contractData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/contract-info/${id}`, contractData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护合同信息失败:', error);
    throw error;
  }
};

// 185. 删除系统维护合同信息
export const deleteMaintenanceContractInfo = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/contract-info/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护合同信息失败:', error);
    throw error;
  }
};

// 186. 获取系统维护许可证信息
export const getMaintenanceLicenseInfo = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/license-info', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护许可证信息失败:', error);
    throw error;
  }
};

// 187. 创建系统维护许可证信息
export const createMaintenanceLicenseInfo = async (licenseData) => {
  try {
    const response = await api.post('/admin/system-maintenance/license-info', licenseData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护许可证信息失败:', error);
    throw error;
  }
};

// 188. 更新系统维护许可证信息
export const updateMaintenanceLicenseInfo = async (id, licenseData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/license-info/${id}`, licenseData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护许可证信息失败:', error);
    throw error;
  }
};

// 189. 删除系统维护许可证信息
export const deleteMaintenanceLicenseInfo = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/license-info/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护许可证信息失败:', error);
    throw error;
  }
};

// 190. 获取系统维护保修信息
export const getMaintenanceWarrantyInfo = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/warranty-info', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护保修信息失败:', error);
    throw error;
  }
};

// 191. 创建系统维护保修信息
export const createMaintenanceWarrantyInfo = async (warrantyData) => {
  try {
    const response = await api.post('/admin/system-maintenance/warranty-info', warrantyData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护保修信息失败:', error);
    throw error;
  }
};

// 192. 更新系统维护保修信息
export const updateMaintenanceWarrantyInfo = async (id, warrantyData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/warranty-info/${id}`, warrantyData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护保修信息失败:', error);
    throw error;
  }
};

// 193. 删除系统维护保修信息
export const deleteMaintenanceWarrantyInfo = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/warranty-info/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护保修信息失败:', error);
    throw error;
  }
};

// 194. 获取系统维护资产信息
export const getMaintenanceAssetInfo = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/asset-info', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护资产信息失败:', error);
    throw error;
  }
};

// 195. 创建系统维护资产信息
export const createMaintenanceAssetInfo = async (assetData) => {
  try {
    const response = await api.post('/admin/system-maintenance/asset-info', assetData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护资产信息失败:', error);
    throw error;
  }
};

// 196. 更新系统维护资产信息
export const updateMaintenanceAssetInfo = async (id, assetData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/asset-info/${id}`, assetData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护资产信息失败:', error);
    throw error;
  }
};

// 197. 删除系统维护资产信息
export const deleteMaintenanceAssetInfo = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/asset-info/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护资产信息失败:', error);
    throw error;
  }
};

// 198. 获取系统维护库存信息
export const getMaintenanceInventoryInfo = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/inventory-info', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护库存信息失败:', error);
    throw error;
  }
};

// 199. 创建系统维护库存信息
export const createMaintenanceInventoryInfo = async (inventoryData) => {
  try {
    const response = await api.post('/admin/system-maintenance/inventory-info', inventoryData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护库存信息失败:', error);
    throw error;
  }
};

// 200. 更新系统维护库存信息
export const updateMaintenanceInventoryInfo = async (id, inventoryData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/inventory-info/${id}`, inventoryData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护库存信息失败:', error);
    throw error;
  }
};

// 201. 删除系统维护库存信息
export const deleteMaintenanceInventoryInfo = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/inventory-info/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护库存信息失败:', error);
    throw error;
  }
};

// 202. 获取系统维护采购信息
export const getMaintenancePurchaseInfo = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/purchase-info', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护采购信息失败:', error);
    throw error;
  }
};

// 203. 创建系统维护采购信息
export const createMaintenancePurchaseInfo = async (purchaseData) => {
  try {
    const response = await api.post('/admin/system-maintenance/purchase-info', purchaseData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护采购信息失败:', error);
    throw error;
  }
};

// 204. 更新系统维护采购信息
export const updateMaintenancePurchaseInfo = async (id, purchaseData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/purchase-info/${id}`, purchaseData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护采购信息失败:', error);
    throw error;
  }
};

// 205. 删除系统维护采购信息
export const deleteMaintenancePurchaseInfo = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/purchase-info/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护采购信息失败:', error);
    throw error;
  }
};

// 206. 获取系统维护成本分析
export const getMaintenanceCostAnalysis = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/cost-analysis', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护成本分析失败:', error);
    throw error;
  }
};

// 207. 创建系统维护成本分析
export const createMaintenanceCostAnalysis = async (analysisData) => {
  try {
    const response = await api.post('/admin/system-maintenance/cost-analysis', analysisData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护成本分析失败:', error);
    throw error;
  }
};

// 208. 更新系统维护成本分析
export const updateMaintenanceCostAnalysis = async (id, analysisData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/cost-analysis/${id}`, analysisData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护成本分析失败:', error);
    throw error;
  }
};

// 209. 删除系统维护成本分析
export const deleteMaintenanceCostAnalysis = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/cost-analysis/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护成本分析失败:', error);
    throw error;
  }
};

// 210. 获取系统维护预算信息
export const getMaintenanceBudgetInfo = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/budget-info', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护预算信息失败:', error);
    throw error;
  }
};

// 211. 创建系统维护预算信息
export const createMaintenanceBudgetInfo = async (budgetData) => {
  try {
    const response = await api.post('/admin/system-maintenance/budget-info', budgetData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护预算信息失败:', error);
    throw error;
  }
};

// 212. 更新系统维护预算信息
export const updateMaintenanceBudgetInfo = async (id, budgetData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/budget-info/${id}`, budgetData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护预算信息失败:', error);
    throw error;
  }
};

// 213. 删除系统维护预算信息
export const deleteMaintenanceBudgetInfo = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/budget-info/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护预算信息失败:', error);
    throw error;
  }
};

// 214. 获取系统维护费用报告
export const getMaintenanceExpenseReports = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/expense-reports', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护费用报告失败:', error);
    throw error;
  }
};

// 215. 创建系统维护费用报告
export const createMaintenanceExpenseReport = async (reportData) => {
  try {
    const response = await api.post('/admin/system-maintenance/expense-reports', reportData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护费用报告失败:', error);
    throw error;
  }
};

// 216. 更新系统维护费用报告
export const updateMaintenanceExpenseReport = async (id, reportData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/expense-reports/${id}`, reportData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护费用报告失败:', error);
    throw error;
  }
};

// 217. 删除系统维护费用报告
export const deleteMaintenanceExpenseReport = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/expense-reports/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护费用报告失败:', error);
    throw error;
  }
};

// 218. 获取系统维护费用统计
export const getMaintenanceExpenseStats = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/expense-stats', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护费用统计失败:', error);
    throw error;
  }
};

// 219. 获取系统维护费用趋势
export const getMaintenanceExpenseTrends = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/expense-trends', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护费用趋势失败:', error);
    throw error;
  }
};

// 220. 获取系统维护费用预测
export const getMaintenanceExpenseForecast = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/expense-forecast', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护费用预测失败:', error);
    throw error;
  }
};

// 221. 获取系统维护ROI分析
export const getMaintenanceRoiAnalysis = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/roi-analysis', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护ROI分析失败:', error);
    throw error;
  }
};

// 222. 创建系统维护ROI分析
export const createMaintenanceRoiAnalysis = async (analysisData) => {
  try {
    const response = await api.post('/admin/system-maintenance/roi-analysis', analysisData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护ROI分析失败:', error);
    throw error;
  }
};

// 223. 更新系统维护ROI分析
export const updateMaintenanceRoiAnalysis = async (id, analysisData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/roi-analysis/${id}`, analysisData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护ROI分析失败:', error);
    throw error;
  }
};

// 224. 删除系统维护ROI分析
export const deleteMaintenanceRoiAnalysis = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/roi-analysis/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护ROI分析失败:', error);
    throw error;
  }
};

// 225. 获取系统维护投资回报率
export const getMaintenanceInvestmentReturn = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/investment-return', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护投资回报率失败:', error);
    throw error;
  }
};

// 226. 获取系统维护成本效益分析
export const getMaintenanceCostBenefitAnalysis = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/cost-benefit-analysis', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护成本效益分析失败:', error);
    throw error;
  }
};

// 227. 创建系统维护成本效益分析
export const createMaintenanceCostBenefitAnalysis = async (analysisData) => {
  try {
    const response = await api.post('/admin/system-maintenance/cost-benefit-analysis', analysisData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护成本效益分析失败:', error);
    throw error;
  }
};

// 228. 更新系统维护成本效益分析
export const updateMaintenanceCostBenefitAnalysis = async (id, analysisData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/cost-benefit-analysis/${id}`, analysisData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护成本效益分析失败:', error);
    throw error;
  }
};

// 229. 删除系统维护成本效益分析
export const deleteMaintenanceCostBenefitAnalysis = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/cost-benefit-analysis/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护成本效益分析失败:', error);
    throw error;
  }
};

// 230. 获取系统维护生命周期成本分析
export const getMaintenanceLifecycleCostAnalysis = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/lifecycle-cost-analysis', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护生命周期成本分析失败:', error);
    throw error;
  }
};

// 231. 创建系统维护生命周期成本分析
export const createMaintenanceLifecycleCostAnalysis = async (analysisData) => {
  try {
    const response = await api.post('/admin/system-maintenance/lifecycle-cost-analysis', analysisData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护生命周期成本分析失败:', error);
    throw error;
  }
};

// 232. 更新系统维护生命周期成本分析
export const updateMaintenanceLifecycleCostAnalysis = async (id, analysisData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/lifecycle-cost-analysis/${id}`, analysisData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护生命周期成本分析失败:', error);
    throw error;
  }
};

// 233. 删除系统维护生命周期成本分析
export const deleteMaintenanceLifecycleCostAnalysis = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/lifecycle-cost-analysis/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护生命周期成本分析失败:', error);
    throw error;
  }
};

// 234. 获取系统维护总拥有成本分析
export const getMaintenanceTotalCostOfOwnership = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/total-cost-of-ownership', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护总拥有成本分析失败:', error);
    throw error;
  }
};

// 235. 创建系统维护总拥有成本分析
export const createMaintenanceTotalCostOfOwnership = async (analysisData) => {
  try {
    const response = await api.post('/admin/system-maintenance/total-cost-of-ownership', analysisData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护总拥有成本分析失败:', error);
    throw error;
  }
};

// 236. 更新系统维护总拥有成本分析
export const updateMaintenanceTotalCostOfOwnership = async (id, analysisData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/total-cost-of-ownership/${id}`, analysisData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护总拥有成本分析失败:', error);
    throw error;
  }
};

// 237. 删除系统维护总拥有成本分析
export const deleteMaintenanceTotalCostOfOwnership = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/total-cost-of-ownership/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护总拥有成本分析失败:', error);
    throw error;
  }
};

// 238. 获取系统维护价值分析
export const getMaintenanceValueAnalysis = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/value-analysis', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护价值分析失败:', error);
    throw error;
  }
};

// 239. 创建系统维护价值分析
export const createMaintenanceValueAnalysis = async (analysisData) => {
  try {
    const response = await api.post('/admin/system-maintenance/value-analysis', analysisData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护价值分析失败:', error);
    throw error;
  }
};

// 240. 更新系统维护价值分析
export const updateMaintenanceValueAnalysis = async (id, analysisData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/value-analysis/${id}`, analysisData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护价值分析失败:', error);
    throw error;
  }
};

// 241. 删除系统维护价值分析
export const deleteMaintenanceValueAnalysis = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/value-analysis/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护价值分析失败:', error);
    throw error;
  }
};

// 242. 获取系统维护风险评估
export const getMaintenanceRiskAssessment = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/risk-assessment', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护风险评估失败:', error);
    throw error;
  }
};

// 243. 创建系统维护风险评估
export const createMaintenanceRiskAssessment = async (assessmentData) => {
  try {
    const response = await api.post('/admin/system-maintenance/risk-assessment', assessmentData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护风险评估失败:', error);
    throw error;
  }
};

// 244. 更新系统维护风险评估
export const updateMaintenanceRiskAssessment = async (id, assessmentData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/risk-assessment/${id}`, assessmentData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护风险评估失败:', error);
    throw error;
  }
};

// 245. 删除系统维护风险评估
export const deleteMaintenanceRiskAssessment = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/risk-assessment/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护风险评估失败:', error);
    throw error;
  }
};

// 246. 获取系统维护风险缓解计划
export const getMaintenanceRiskMitigationPlan = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/risk-mitigation-plan', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护风险缓解计划失败:', error);
    throw error;
  }
};

// 247. 创建系统维护风险缓解计划
export const createMaintenanceRiskMitigationPlan = async (planData) => {
  try {
    const response = await api.post('/admin/system-maintenance/risk-mitigation-plan', planData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护风险缓解计划失败:', error);
    throw error;
  }
};

// 248. 更新系统维护风险缓解计划
export const updateMaintenanceRiskMitigationPlan = async (id, planData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/risk-mitigation-plan/${id}`, planData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护风险缓解计划失败:', error);
    throw error;
  }
};

// 249. 删除系统维护风险缓解计划
export const deleteMaintenanceRiskMitigationPlan = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/risk-mitigation-plan/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护风险缓解计划失败:', error);
    throw error;
  }
};

// 250. 获取系统维护合规性检查
export const getMaintenanceComplianceCheck = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/compliance-check', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护合规性检查失败:', error);
    throw error;
  }
};

// 251. 执行系统维护合规性检查
export const executeMaintenanceComplianceCheck = async () => {
  try {
    const response = await api.post('/admin/system-maintenance/compliance-check/execute');
    return response.data;
  } catch (error) {
    console.error('执行系统维护合规性检查失败:', error);
    throw error;
  }
};

// 252. 获取系统维护合规性报告
export const getMaintenanceComplianceReport = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/compliance-report', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护合规性报告失败:', error);
    throw error;
  }
};

// 253. 生成系统维护合规性报告
export const generateMaintenanceComplianceReport = async (reportData) => {
  try {
    const response = await api.post('/admin/system-maintenance/compliance-report/generate', reportData);
    return response.data;
  } catch (error) {
    console.error('生成系统维护合规性报告失败:', error);
    throw error;
  }
};

// 254. 获取系统维护审计日志
export const getMaintenanceAuditLogs = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/audit-logs', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护审计日志失败:', error);
    throw error;
  }
};

// 255. 获取系统维护审计报告
export const getMaintenanceAuditReport = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/audit-report', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护审计报告失败:', error);
    throw error;
  }
};

// 256. 生成系统维护审计报告
export const generateMaintenanceAuditReport = async (reportData) => {
  try {
    const response = await api.post('/admin/system-maintenance/audit-report/generate', reportData);
    return response.data;
  } catch (error) {
    console.error('生成系统维护审计报告失败:', error);
    throw error;
  }
};

// 257. 获取系统维护安全策略
export const getMaintenanceSecurityPolicy = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/security-policy', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护安全策略失败:', error);
    throw error;
  }
};

// 258. 创建系统维护安全策略
export const createMaintenanceSecurityPolicy = async (policyData) => {
  try {
    const response = await api.post('/admin/system-maintenance/security-policy', policyData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护安全策略失败:', error);
    throw error;
  }
};

// 259. 更新系统维护安全策略
export const updateMaintenanceSecurityPolicy = async (id, policyData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/security-policy/${id}`, policyData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护安全策略失败:', error);
    throw error;
  }
};

// 260. 删除系统维护安全策略
export const deleteMaintenanceSecurityPolicy = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/security-policy/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护安全策略失败:', error);
    throw error;
  }
};

// 261. 获取系统维护访问控制
export const getMaintenanceAccessControl = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/access-control', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护访问控制失败:', error);
    throw error;
  }
};

// 262. 创建系统维护访问控制
export const createMaintenanceAccessControl = async (controlData) => {
  try {
    const response = await api.post('/admin/system-maintenance/access-control', controlData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护访问控制失败:', error);
    throw error;
  }
};

// 263. 更新系统维护访问控制
export const updateMaintenanceAccessControl = async (id, controlData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/access-control/${id}`, controlData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护访问控制失败:', error);
    throw error;
  }
};

// 264. 删除系统维护访问控制
export const deleteMaintenanceAccessControl = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/access-control/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护访问控制失败:', error);
    throw error;
  }
};

// 265. 获取系统维护数据保护
export const getMaintenanceDataProtection = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/data-protection', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护数据保护失败:', error);
    throw error;
  }
};

// 266. 创建系统维护数据保护
export const createMaintenanceDataProtection = async (protectionData) => {
  try {
    const response = await api.post('/admin/system-maintenance/data-protection', protectionData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护数据保护失败:', error);
    throw error;
  }
};

// 267. 更新系统维护数据保护
export const updateMaintenanceDataProtection = async (id, protectionData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/data-protection/${id}`, protectionData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护数据保护失败:', error);
    throw error;
  }
};

// 268. 删除系统维护数据保护
export const deleteMaintenanceDataProtection = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/data-protection/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护数据保护失败:', error);
    throw error;
  }
};

// 269. 获取系统维护加密管理
export const getMaintenanceEncryptionManagement = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/encryption-management', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护加密管理失败:', error);
    throw error;
  }
};

// 270. 创建系统维护加密管理
export const createMaintenanceEncryptionManagement = async (encryptionData) => {
  try {
    const response = await api.post('/admin/system-maintenance/encryption-management', encryptionData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护加密管理失败:', error);
    throw error;
  }
};

// 271. 更新系统维护加密管理
export const updateMaintenanceEncryptionManagement = async (id, encryptionData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/encryption-management/${id}`, encryptionData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护加密管理失败:', error);
    throw error;
  }
};

// 272. 删除系统维护加密管理
export const deleteMaintenanceEncryptionManagement = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/encryption-management/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护加密管理失败:', error);
    throw error;
  }
};

// 273. 获取系统维护密钥管理
export const getMaintenanceKeyManagement = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/key-management', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护密钥管理失败:', error);
    throw error;
  }
};

// 274. 创建系统维护密钥管理
export const createMaintenanceKeyManagement = async (keyData) => {
  try {
    const response = await api.post('/admin/system-maintenance/key-management', keyData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护密钥管理失败:', error);
    throw error;
  }
};

// 275. 更新系统维护密钥管理
export const updateMaintenanceKeyManagement = async (id, keyData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/key-management/${id}`, keyData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护密钥管理失败:', error);
    throw error;
  }
};

// 276. 删除系统维护密钥管理
export const deleteMaintenanceKeyManagement = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/key-management/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护密钥管理失败:', error);
    throw error;
  }
};

// 277. 获取系统维护身份验证
export const getMaintenanceAuthentication = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/authentication', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护身份验证失败:', error);
    throw error;
  }
};

// 278. 创建系统维护身份验证
export const createMaintenanceAuthentication = async (authData) => {
  try {
    const response = await api.post('/admin/system-maintenance/authentication', authData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护身份验证失败:', error);
    throw error;
  }
};

// 279. 更新系统维护身份验证
export const updateMaintenanceAuthentication = async (id, authData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/authentication/${id}`, authData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护身份验证失败:', error);
    throw error;
  }
};

// 280. 删除系统维护身份验证
export const deleteMaintenanceAuthentication = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/authentication/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护身份验证失败:', error);
    throw error;
  }
};

// 281. 获取系统维护授权管理
export const getMaintenanceAuthorization = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/authorization', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护授权管理失败:', error);
    throw error;
  }
};

// 282. 创建系统维护授权管理
export const createMaintenanceAuthorization = async (authData) => {
  try {
    const response = await api.post('/admin/system-maintenance/authorization', authData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护授权管理失败:', error);
    throw error;
  }
};

// 283. 更新系统维护授权管理
export const updateMaintenanceAuthorization = async (id, authData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/authorization/${id}`, authData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护授权管理失败:', error);
    throw error;
  }
};

// 284. 删除系统维护授权管理
export const deleteMaintenanceAuthorization = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/authorization/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护授权管理失败:', error);
    throw error;
  }
};

// 285. 获取系统维护会话管理
export const getMaintenanceSessionManagement = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/session-management', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护会话管理失败:', error);
    throw error;
  }
};

// 286. 创建系统维护会话管理
export const createMaintenanceSessionManagement = async (sessionData) => {
  try {
    const response = await api.post('/admin/system-maintenance/session-management', sessionData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护会话管理失败:', error);
    throw error;
  }
};

// 287. 更新系统维护会话管理
export const updateMaintenanceSessionManagement = async (id, sessionData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/session-management/${id}`, sessionData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护会话管理失败:', error);
    throw error;
  }
};

// 288. 删除系统维护会话管理
export const deleteMaintenanceSessionManagement = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/session-management/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护会话管理失败:', error);
    throw error;
  }
};

// 289. 获取系统维护单点登录
export const getMaintenanceSingleSignOn = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/single-sign-on', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护单点登录失败:', error);
    throw error;
  }
};

// 290. 创建系统维护单点登录
export const createMaintenanceSingleSignOn = async (ssoData) => {
  try {
    const response = await api.post('/admin/system-maintenance/single-sign-on', ssoData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护单点登录失败:', error);
    throw error;
  }
};

// 291. 更新系统维护单点登录
export const updateMaintenanceSingleSignOn = async (id, ssoData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/single-sign-on/${id}`, ssoData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护单点登录失败:', error);
    throw error;
  }
};

// 292. 删除系统维护单点登录
export const deleteMaintenanceSingleSignOn = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/single-sign-on/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护单点登录失败:', error);
    throw error;
  }
};

// 293. 获取系统维护多因素认证
export const getMaintenanceMultiFactorAuthentication = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/multi-factor-authentication', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护多因素认证失败:', error);
    throw error;
  }
};

// 294. 创建系统维护多因素认证
export const createMaintenanceMultiFactorAuthentication = async (mfaData) => {
  try {
    const response = await api.post('/admin/system-maintenance/multi-factor-authentication', mfaData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护多因素认证失败:', error);
    throw error;
  }
};

// 295. 更新系统维护多因素认证
export const updateMaintenanceMultiFactorAuthentication = async (id, mfaData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/multi-factor-authentication/${id}`, mfaData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护多因素认证失败:', error);
    throw error;
  }
};

// 296. 删除系统维护多因素认证
export const deleteMaintenanceMultiFactorAuthentication = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/multi-factor-authentication/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护多因素认证失败:', error);
    throw error;
  }
};

// 297. 获取系统维护特权访问管理
export const getMaintenancePrivilegedAccessManagement = async (params = {}) => {
  try {
    const response = await api.get('/admin/system-maintenance/privileged-access-management', { params });
    return response.data;
  } catch (error) {
    console.error('获取系统维护特权访问管理失败:', error);
    throw error;
  }
};

// 298. 创建系统维护特权访问管理
export const createMaintenancePrivilegedAccessManagement = async (pamData) => {
  try {
    const response = await api.post('/admin/system-maintenance/privileged-access-management', pamData);
    return response.data;
  } catch (error) {
    console.error('创建系统维护特权访问管理失败:', error);
    throw error;
  }
};

// 299. 更新系统维护特权访问管理
export const updateMaintenancePrivilegedAccessManagement = async (id, pamData) => {
  try {
    const response = await api.put(`/admin/system-maintenance/privileged-access-management/${id}`, pamData);
    return response.data;
  } catch (error) {
    console.error('更新系统维护特权访问管理失败:', error);
    throw error;
  }
};

// 300. 删除系统维护特权访问管理
export const deleteMaintenancePrivilegedAccessManagement = async (id) => {
  try {
    const response = await api.delete(`/admin/system-maintenance/privileged-access-management/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除系统维护特权访问管理失败:', error);
    throw error;
  }
};