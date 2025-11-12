/**
 * 密码重置API服务
 * 提供用户密码重置相关的API调用功能
 */

const api = require('./api');

/**
 * 密码重置API服务类
 */
class PasswordResetApiService {
  /**
   * 请求密码重置
   * @param {Object} data - 请求数据
   * @param {string} data.email - 用户邮箱
   * @returns {Promise} API响应
   */
  async requestPasswordReset(data) {
    try {
      const response = await api.post('/password-reset/request', data);
      return response.data;
    } catch (error) {
      console.error('请求密码重置失败:', error);
      throw error;
    }
  }

  /**
   * 验证重置令牌
   * @param {string} token - 重置令牌
   * @returns {Promise} API响应
   */
  async verifyResetToken(token) {
    try {
      const response = await api.get(`/password-reset/verify/${token}`);
      return response.data;
    } catch (error) {
      console.error('验证重置令牌失败:', error);
      throw error;
    }
  }

  /**
   * 重置密码
   * @param {Object} data - 重置数据
   * @param {string} data.token - 重置令牌
   * @param {string} data.newPassword - 新密码
   * @param {string} data.confirmPassword - 确认密码
   * @returns {Promise} API响应
   */
  async resetPassword(data) {
    try {
      const response = await api.post('/password-reset/reset', data);
      return response.data;
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    }
  }

  /**
   * 检查重置令牌状态
   * @param {string} token - 重置令牌
   * @returns {Promise} API响应
   */
  async checkResetTokenStatus(token) {
    try {
      const response = await api.get(`/password-reset/status/${token}`);
      return response.data;
    } catch (error) {
      console.error('检查重置令牌状态失败:', error);
      throw error;
    }
  }

  /**
   * 取消密码重置请求
   * @param {string} token - 重置令牌
   * @returns {Promise} API响应
   */
  async cancelPasswordReset(token) {
    try {
      const response = await api.delete(`/password-reset/cancel/${token}`);
      return response.data;
    } catch (error) {
      console.error('取消密码重置请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置历史
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @returns {Promise} API响应
   */
  async getPasswordResetHistory(params) {
    try {
      const response = await api.get('/password-reset/history', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置历史失败:', error);
      throw error;
    }
  }

  /**
   * 验证密码强度
   * @param {string} password - 密码
   * @returns {Promise} API响应
   */
  async validatePasswordStrength(password) {
    try {
      const response = await api.post('/password-reset/validate-strength', { password });
      return response.data;
    } catch (error) {
      console.error('验证密码强度失败:', error);
      throw error;
    }
  }

  /**
   * 检查邮箱是否已注册
   * @param {string} email - 邮箱
   * @returns {Promise} API响应
   */
  async checkEmailExists(email) {
    try {
      const response = await api.post('/password-reset/check-email', { email });
      return response.data;
    } catch (error) {
      console.error('检查邮箱是否已注册失败:', error);
      throw error;
    }
  }

  /**
   * 发送重置验证码
   * @param {Object} data - 请求数据
   * @param {string} data.email - 用户邮箱
   * @param {string} data.type - 验证码类型
   * @returns {Promise} API响应
   */
  async sendResetVerificationCode(data) {
    try {
      const response = await api.post('/password-reset/send-verification-code', data);
      return response.data;
    } catch (error) {
      console.error('发送重置验证码失败:', error);
      throw error;
    }
  }

  /**
   * 验证重置验证码
   * @param {Object} data - 验证数据
   * @param {string} data.email - 用户邮箱
   * @param {string} data.code - 验证码
   * @returns {Promise} API响应
   */
  async verifyResetCode(data) {
    try {
      const response = await api.post('/password-reset/verify-code', data);
      return response.data;
    } catch (error) {
      console.error('验证重置验证码失败:', error);
      throw error;
    }
  }

  /**
   * 通过验证码重置密码
   * @param {Object} data - 重置数据
   * @param {string} data.email - 用户邮箱
   * @param {string} data.code - 验证码
   * @param {string} data.newPassword - 新密码
   * @param {string} data.confirmPassword - 确认密码
   * @returns {Promise} API响应
   */
  async resetPasswordByCode(data) {
    try {
      const response = await api.post('/password-reset/reset-by-code', data);
      return response.data;
    } catch (error) {
      console.error('通过验证码重置密码失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置
   * @returns {Promise} API响应
   */
  async getPasswordResetConfig() {
    try {
      const response = await api.get('/password-reset/config');
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置配置
   * @param {Object} data - 配置数据
   * @returns {Promise} API响应
   */
  async updatePasswordResetConfig(data) {
    try {
      const response = await api.put('/password-reset/config', data);
      return response.data;
    } catch (error) {
      console.error('更新密码重置配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置统计
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetStats(params) {
    try {
      const response = await api.get('/password-reset/stats', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置日志
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetLogs(params) {
    try {
      const response = await api.get('/password-reset/logs', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置日志失败:', error);
      throw error;
    }
  }

  /**
   * 导出密码重置日志
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async exportPasswordResetLogs(params) {
    try {
      const response = await api.get('/password-reset/logs/export', { params });
      return response.data;
    } catch (error) {
      console.error('导出密码重置日志失败:', error);
      throw error;
    }
  }

  /**
   * 批量取消密码重置请求
   * @param {Array} tokens - 重置令牌数组
   * @returns {Promise} API响应
   */
  async batchCancelPasswordReset(tokens) {
    try {
      const response = await api.post('/password-reset/batch-cancel', { tokens });
      return response.data;
    } catch (error) {
      console.error('批量取消密码重置请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户密码重置请求
   * @param {string} userId - 用户ID
   * @returns {Promise} API响应
   */
  async getUserPasswordResetRequests(userId) {
    try {
      const response = await api.get(`/password-reset/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('获取用户密码重置请求失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期的重置令牌
   * @returns {Promise} API响应
   */
  async cleanupExpiredTokens() {
    try {
      const response = await api.delete('/password-reset/cleanup-expired');
      return response.data;
    } catch (error) {
      console.error('清理过期的重置令牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置安全设置
   * @returns {Promise} API响应
   */
  async getPasswordResetSecuritySettings() {
    try {
      const response = await api.get('/password-reset/security-settings');
      return response.data;
    } catch (error) {
      console.error('获取密码重置安全设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置安全设置
   * @param {Object} data - 安全设置数据
   * @returns {Promise} API响应
   */
  async updatePasswordResetSecuritySettings(data) {
    try {
      const response = await api.put('/password-reset/security-settings', data);
      return response.data;
    } catch (error) {
      console.error('更新密码重置安全设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置模板
   * @param {string} type - 模板类型
   * @returns {Promise} API响应
   */
  async getPasswordResetTemplate(type) {
    try {
      const response = await api.get(`/password-reset/template/${type}`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置模板失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置模板
   * @param {string} type - 模板类型
   * @param {Object} data - 模板数据
   * @returns {Promise} API响应
   */
  async updatePasswordResetTemplate(type, data) {
    try {
      const response = await api.put(`/password-reset/template/${type}`, data);
      return response.data;
    } catch (error) {
      console.error('更新密码重置模板失败:', error);
      throw error;
    }
  }

  /**
   * 预览密码重置邮件
   * @param {string} type - 模板类型
   * @returns {Promise} API响应
   */
  async previewPasswordResetEmail(type) {
    try {
      const response = await api.get(`/password-reset/preview-email/${type}`);
      return response.data;
    } catch (error) {
      console.error('预览密码重置邮件失败:', error);
      throw error;
    }
  }

  /**
   * 测试密码重置邮件发送
   * @param {Object} data - 测试数据
   * @returns {Promise} API响应
   */
  async testPasswordResetEmail(data) {
    try {
      const response = await api.post('/password-reset/test-email', data);
      return response.data;
    } catch (error) {
      console.error('测试密码重置邮件发送失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置频率限制
   * @returns {Promise} API响应
   */
  async getPasswordResetRateLimit() {
    try {
      const response = await api.get('/password-reset/rate-limit');
      return response.data;
    } catch (error) {
      console.error('获取密码重置频率限制失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置频率限制
   * @param {Object} data - 频率限制数据
   * @returns {Promise} API响应
   */
  async updatePasswordResetRateLimit(data) {
    try {
      const response = await api.put('/password-reset/rate-limit', data);
      return response.data;
    } catch (error) {
      console.error('更新密码重置频率限制失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置IP白名单
   * @returns {Promise} API响应
   */
  async getPasswordResetIpWhitelist() {
    try {
      const response = await api.get('/password-reset/ip-whitelist');
      return response.data;
    } catch (error) {
      console.error('获取密码重置IP白名单失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置IP白名单
   * @param {Array} ips - IP地址数组
   * @returns {Promise} API响应
   */
  async updatePasswordResetIpWhitelist(ips) {
    try {
      const response = await api.put('/password-reset/ip-whitelist', { ips });
      return response.data;
    } catch (error) {
      console.error('更新密码重置IP白名单失败:', error);
      throw error;
    }
  }

  /**
   * 检查IP是否在白名单中
   * @param {string} ip - IP地址
   * @returns {Promise} API响应
   */
  async checkIpInWhitelist(ip) {
    try {
      const response = await api.post('/password-reset/check-ip-whitelist', { ip });
      return response.data;
    } catch (error) {
      console.error('检查IP是否在白名单中失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置黑名单
   * @returns {Promise} API响应
   */
  async getPasswordResetBlacklist() {
    try {
      const response = await api.get('/password-reset/blacklist');
      return response.data;
    } catch (error) {
      console.error('获取密码重置黑名单失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置黑名单
   * @param {Array} items - 黑名单项目数组
   * @returns {Promise} API响应
   */
  async updatePasswordResetBlacklist(items) {
    try {
      const response = await api.put('/password-reset/blacklist', { items });
      return response.data;
    } catch (error) {
      console.error('更新密码重置黑名单失败:', error);
      throw error;
    }
  }

  /**
   * 检查项目是否在黑名单中
   * @param {string} type - 检查类型 (email/ip)
   * @param {string} value - 检查值
   * @returns {Promise} API响应
   */
  async checkItemInBlacklist(type, value) {
    try {
      const response = await api.post('/password-reset/check-blacklist', { type, value });
      return response.data;
    } catch (error) {
      console.error('检查项目是否在黑名单中失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置审计日志
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetAuditLogs(params) {
    try {
      const response = await api.get('/password-reset/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置审计日志失败:', error);
      throw error;
    }
  }

  /**
   * 导出密码重置审计日志
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async exportPasswordResetAuditLogs(params) {
    try {
      const response = await api.get('/password-reset/audit-logs/export', { params });
      return response.data;
    } catch (error) {
      console.error('导出密码重置审计日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置报告
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetReport(params) {
    try {
      const response = await api.get('/password-reset/report', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成密码重置报告
   * @param {Object} data - 报告数据
   * @returns {Promise} API响应
   */
  async generatePasswordResetReport(data) {
    try {
      const response = await api.post('/password-reset/report/generate', data);
      return response.data;
    } catch (error) {
      console.error('生成密码重置报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置分析数据
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetAnalytics(params) {
    try {
      const response = await api.get('/password-reset/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置趋势数据
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetTrends(params) {
    try {
      const response = await api.get('/password-reset/trends', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置趋势数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置性能指标
   * @returns {Promise} API响应
   */
  async getPasswordResetPerformanceMetrics() {
    try {
      const response = await api.get('/password-reset/performance-metrics');
      return response.data;
    } catch (error) {
      console.error('获取密码重置性能指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置健康状态
   * @returns {Promise} API响应
   */
  async getPasswordResetHealthStatus() {
    try {
      const response = await api.get('/password-reset/health-status');
      return response.data;
    } catch (error) {
      console.error('获取密码重置健康状态失败:', error);
      throw error;
    }
  }

  /**
   * 执行密码重置健康检查
   * @returns {Promise} API响应
   */
  async performPasswordResetHealthCheck() {
    try {
      const response = await api.post('/password-reset/health-check');
      return response.data;
    } catch (error) {
      console.error('执行密码重置健康检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置错误统计
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetErrorStats(params) {
    try {
      const response = await api.get('/password-reset/error-stats', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置错误统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置错误日志
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetErrorLogs(params) {
    try {
      const response = await api.get('/password-reset/error-logs', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置错误日志失败:', error);
      throw error;
    }
  }

  /**
   * 清理密码重置错误日志
   * @param {Object} data - 清理参数
   * @returns {Promise} API响应
   */
  async cleanupPasswordResetErrorLogs(data) {
    try {
      const response = await api.delete('/password-reset/error-logs/cleanup', { data });
      return response.data;
    } catch (error) {
      console.error('清理密码重置错误日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置缓存状态
   * @returns {Promise} API响应
   */
  async getPasswordResetCacheStatus() {
    try {
      const response = await api.get('/password-reset/cache-status');
      return response.data;
    } catch (error) {
      console.error('获取密码重置缓存状态失败:', error);
      throw error;
    }
  }

  /**
   * 清理密码重置缓存
   * @param {Object} data - 清理参数
   * @returns {Promise} API响应
   */
  async clearPasswordResetCache(data) {
    try {
      const response = await api.delete('/password-reset/cache/clear', { data });
      return response.data;
    } catch (error) {
      console.error('清理密码重置缓存失败:', error);
      throw error;
    }
  }

  /**
   * 预热密码重置缓存
   * @param {Object} data - 预热参数
   * @returns {Promise} API响应
   */
  async warmupPasswordResetCache(data) {
    try {
      const response = await api.post('/password-reset/cache/warmup', data);
      return response.data;
    } catch (error) {
      console.error('预热密码重置缓存失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置队列状态
   * @returns {Promise} API响应
   */
  async getPasswordResetQueueStatus() {
    try {
      const response = await api.get('/password-reset/queue-status');
      return response.data;
    } catch (error) {
      console.error('获取密码重置队列状态失败:', error);
      throw error;
    }
  }

  /**
   * 处理密码重置队列
   * @returns {Promise} API响应
   */
  async processPasswordResetQueue() {
    try {
      const response = await api.post('/password-reset/queue/process');
      return response.data;
    } catch (error) {
      console.error('处理密码重置队列失败:', error);
      throw error;
    }
  }

  /**
   * 清空密码重置队列
   * @returns {Promise} API响应
   */
  async clearPasswordResetQueue() {
    try {
      const response = await api.delete('/password-reset/queue/clear');
      return response.data;
    } catch (error) {
      console.error('清空密码重置队列失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置任务状态
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async getPasswordResetTaskStatus(taskId) {
    try {
      const response = await api.get(`/password-reset/task/${taskId}/status`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置任务状态失败:', error);
      throw error;
    }
  }

  /**
   * 取消密码重置任务
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async cancelPasswordResetTask(taskId) {
    try {
      const response = await api.delete(`/password-reset/task/${taskId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('取消密码重置任务失败:', error);
      throw error;
    }
  }

  /**
   * 重试密码重置任务
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async retryPasswordResetTask(taskId) {
    try {
      const response = await api.post(`/password-reset/task/${taskId}/retry`);
      return response.data;
    } catch (error) {
      console.error('重试密码重置任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置任务列表
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetTaskList(params) {
    try {
      const response = await api.get('/password-reset/tasks', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置任务列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建密码重置任务
   * @param {Object} data - 任务数据
   * @returns {Promise} API响应
   */
  async createPasswordResetTask(data) {
    try {
      const response = await api.post('/password-reset/tasks', data);
      return response.data;
    } catch (error) {
      console.error('创建密码重置任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置任务
   * @param {string} taskId - 任务ID
   * @param {Object} data - 任务数据
   * @returns {Promise} API响应
   */
  async updatePasswordResetTask(taskId, data) {
    try {
      const response = await api.put(`/password-reset/task/${taskId}`, data);
      return response.data;
    } catch (error) {
      console.error('更新密码重置任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除密码重置任务
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async deletePasswordResetTask(taskId) {
    try {
      const response = await api.delete(`/password-reset/task/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('删除密码重置任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置任务详情
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async getPasswordResetTaskDetail(taskId) {
    try {
      const response = await api.get(`/password-reset/task/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置任务详情失败:', error);
      throw error;
    }
  }

  /**
   * 批量处理密码重置任务
   * @param {Array} taskIds - 任务ID数组
   * @param {string} action - 操作类型
   * @returns {Promise} API响应
   */
  async batchProcessPasswordResetTasks(taskIds, action) {
    try {
      const response = await api.post('/password-reset/tasks/batch', { taskIds, action });
      return response.data;
    } catch (error) {
      console.error('批量处理密码重置任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置任务统计
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetTaskStats(params) {
    try {
      const response = await api.get('/password-reset/tasks/stats', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置任务统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置任务日志
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async getPasswordResetTaskLogs(taskId) {
    try {
      const response = await api.get(`/password-reset/task/${taskId}/logs`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置任务日志失败:', error);
      throw error;
    }
  }

  /**
   * 导出密码重置任务日志
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async exportPasswordResetTaskLogs(taskId) {
    try {
      const response = await api.get(`/password-reset/task/${taskId}/logs/export`);
      return response.data;
    } catch (error) {
      console.error('导出密码重置任务日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置任务报告
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async getPasswordResetTaskReport(taskId) {
    try {
      const response = await api.get(`/password-reset/task/${taskId}/report`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置任务报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成密码重置任务报告
   * @param {string} taskId - 任务ID
   * @param {Object} data - 报告数据
   * @returns {Promise} API响应
   */
  async generatePasswordResetTaskReport(taskId, data) {
    try {
      const response = await api.post(`/password-reset/task/${taskId}/report/generate`, data);
      return response.data;
    } catch (error) {
      console.error('生成密码重置任务报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置备份
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigBackup() {
    try {
      const response = await api.get('/password-reset/config/backup');
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置备份失败:', error);
      throw error;
    }
  }

  /**
   * 恢复密码重置配置
   * @param {Object} data - 备份数据
   * @returns {Promise} API响应
   */
  async restorePasswordResetConfig(data) {
    try {
      const response = await api.post('/password-reset/config/restore', data);
      return response.data;
    } catch (error) {
      console.error('恢复密码重置配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置历史
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigHistory(params) {
    try {
      const response = await api.get('/password-reset/config/history', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置版本
   * @param {string} versionId - 版本ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigVersion(versionId) {
    try {
      const response = await api.get(`/password-reset/config/version/${versionId}`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置版本失败:', error);
      throw error;
    }
  }

  /**
   * 回滚密码重置配置
   * @param {string} versionId - 版本ID
   * @returns {Promise} API响应
   */
  async rollbackPasswordResetConfig(versionId) {
    try {
      const response = await api.post(`/password-reset/config/rollback/${versionId}`);
      return response.data;
    } catch (error) {
      console.error('回滚密码重置配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置差异
   * @param {string} versionId1 - 版本ID1
   * @param {string} versionId2 - 版本ID2
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigDiff(versionId1, versionId2) {
    try {
      const response = await api.get(`/password-reset/config/diff/${versionId1}/${versionId2}`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置差异失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplates() {
    try {
      const response = await api.get('/password-reset/config/templates');
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 应用密码重置配置模板
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async applyPasswordResetConfigTemplate(templateId) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/apply`);
      return response.data;
    } catch (error) {
      console.error('应用密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 创建密码重置配置模板
   * @param {Object} data - 模板数据
   * @returns {Promise} API响应
   */
  async createPasswordResetConfigTemplate(data) {
    try {
      const response = await api.post('/password-reset/config/templates', data);
      return response.data;
    } catch (error) {
      console.error('创建密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置配置模板
   * @param {string} templateId - 模板ID
   * @param {Object} data - 模板数据
   * @returns {Promise} API响应
   */
  async updatePasswordResetConfigTemplate(templateId, data) {
    try {
      const response = await api.put(`/password-reset/config/template/${templateId}`, data);
      return response.data;
    } catch (error) {
      console.error('更新密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 删除密码重置配置模板
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async deletePasswordResetConfigTemplate(templateId) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('删除密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板详情
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateDetail(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板详情失败:', error);
      throw error;
    }
  }

  /**
   * 导出密码重置配置模板
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async exportPasswordResetConfigTemplate(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/export`);
      return response.data;
    } catch (error) {
      console.error('导出密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 导入密码重置配置模板
   * @param {Object} data - 模板数据
   * @returns {Promise} API响应
   */
  async importPasswordResetConfigTemplate(data) {
    try {
      const response = await api.post('/password-reset/config/templates/import', data);
      return response.data;
    } catch (error) {
      console.error('导入密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板统计
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateStats() {
    try {
      const response = await api.get('/password-reset/config/templates/stats');
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板使用记录
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateUsage(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/usage`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板使用记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板推荐
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateRecommendations(params) {
    try {
      const response = await api.get('/password-reset/config/templates/recommendations', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板推荐失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板评分
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateRating(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/rating`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板评分失败:', error);
      throw error;
    }
  }

  /**
   * 评价密码重置配置模板
   * @param {string} templateId - 模板ID
   * @param {Object} data - 评价数据
   * @returns {Promise} API响应
   */
  async ratePasswordResetConfigTemplate(templateId, data) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/rate`, data);
      return response.data;
    } catch (error) {
      console.error('评价密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板评论
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateComments(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/comments`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板评论失败:', error);
      throw error;
    }
  }

  /**
   * 添加密码重置配置模板评论
   * @param {string} templateId - 模板ID
   * @param {Object} data - 评论数据
   * @returns {Promise} API响应
   */
  async addPasswordResetConfigTemplateComment(templateId, data) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/comments`, data);
      return response.data;
    } catch (error) {
      console.error('添加密码重置配置模板评论失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置配置模板评论
   * @param {string} templateId - 模板ID
   * @param {string} commentId - 评论ID
   * @param {Object} data - 评论数据
   * @returns {Promise} API响应
   */
  async updatePasswordResetConfigTemplateComment(templateId, commentId, data) {
    try {
      const response = await api.put(`/password-reset/config/template/${templateId}/comment/${commentId}`, data);
      return response.data;
    } catch (error) {
      console.error('更新密码重置配置模板评论失败:', error);
      throw error;
    }
  }

  /**
   * 删除密码重置配置模板评论
   * @param {string} templateId - 模板ID
   * @param {string} commentId - 评论ID
   * @returns {Promise} API响应
   */
  async deletePasswordResetConfigTemplateComment(templateId, commentId) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}/comment/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('删除密码重置配置模板评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板标签
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateTags() {
    try {
      const response = await api.get('/password-reset/config/templates/tags');
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板标签失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板分类
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateCategories() {
    try {
      const response = await api.get('/password-reset/config/templates/categories');
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板分类失败:', error);
      throw error;
    }
  }

  /**
   * 搜索密码重置配置模板
   * @param {Object} params - 搜索参数
   * @returns {Promise} API响应
   */
  async searchPasswordResetConfigTemplates(params) {
    try {
      const response = await api.get('/password-reset/config/templates/search', { params });
      return response.data;
    } catch (error) {
      console.error('搜索密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板热门
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplatePopular(params) {
    try {
      const response = await api.get('/password-reset/config/templates/popular', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板热门失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板最新
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateLatest(params) {
    try {
      const response = await api.get('/password-reset/config/templates/latest', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板最新失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板推荐
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateFeatured(params) {
    try {
      const response = await api.get('/password-reset/config/templates/featured', { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板推荐失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板相似
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateSimilar(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/similar`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板相似失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板依赖
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateDependencies(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/dependencies`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板依赖失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板兼容性
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateCompatibility(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/compatibility`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板兼容性失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板更新日志
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateChangelog(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/changelog`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板更新日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板版本
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateVersions(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/versions`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板版本失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板版本详情
   * @param {string} templateId - 模板ID
   * @param {string} versionId - 版本ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateVersionDetail(templateId, versionId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/version/${versionId}`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板版本详情失败:', error);
      throw error;
    }
  }

  /**
   * 回滚密码重置配置模板版本
   * @param {string} templateId - 模板ID
   * @param {string} versionId - 版本ID
   * @returns {Promise} API响应
   */
  async rollbackPasswordResetConfigTemplateVersion(templateId, versionId) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/version/${versionId}/rollback`);
      return response.data;
    } catch (error) {
      console.error('回滚密码重置配置模板版本失败:', error);
      throw error;
    }
  }

  /**
   * 删除密码重置配置模板版本
   * @param {string} templateId - 模板ID
   * @param {string} versionId - 版本ID
   * @returns {Promise} API响应
   */
  async deletePasswordResetConfigTemplateVersion(templateId, versionId) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}/version/${versionId}`);
      return response.data;
    } catch (error) {
      console.error('删除密码重置配置模板版本失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板下载链接
   * @param {string} templateId - 模板ID
   * @param {string} versionId - 版本ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateDownloadUrl(templateId, versionId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/version/${versionId}/download`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板下载链接失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板预览
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplatePreview(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/preview`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板预览失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板验证结果
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateValidation(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/validation`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板验证结果失败:', error);
      throw error;
    }
  }

  /**
   * 验证密码重置配置模板
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async validatePasswordResetConfigTemplate(templateId) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/validate`);
      return response.data;
    } catch (error) {
      console.error('验证密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板测试结果
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateTestResults(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/test-results`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 测试密码重置配置模板
   * @param {string} templateId - 模板ID
   * @param {Object} data - 测试数据
   * @returns {Promise} API响应
   */
  async testPasswordResetConfigTemplate(templateId, data) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/test`, data);
      return response.data;
    } catch (error) {
      console.error('测试密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板部署状态
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateDeploymentStatus(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/deployment-status`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板部署状态失败:', error);
      throw error;
    }
  }

  /**
   * 部署密码重置配置模板
   * @param {string} templateId - 模板ID
   * @param {Object} data - 部署数据
   * @returns {Promise} API响应
   */
  async deployPasswordResetConfigTemplate(templateId, data) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/deploy`, data);
      return response.data;
    } catch (error) {
      console.error('部署密码重置配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 取消密码重置配置模板部署
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async cancelPasswordResetConfigTemplateDeployment(templateId) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}/deploy`);
      return response.data;
    } catch (error) {
      console.error('取消密码重置配置模板部署失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板部署日志
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateDeploymentLogs(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/deployment-logs`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板部署日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板部署历史
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateDeploymentHistory(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/deployment-history`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板部署历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板回滚历史
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateRollbackHistory(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/rollback-history`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板回滚历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板性能指标
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplatePerformanceMetrics(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/performance-metrics`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板性能指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板健康状态
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateHealthStatus(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/health-status`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板健康状态失败:', error);
      throw error;
    }
  }

  /**
   * 执行密码重置配置模板健康检查
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async performPasswordResetConfigTemplateHealthCheck(templateId) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/health-check`);
      return response.data;
    } catch (error) {
      console.error('执行密码重置配置模板健康检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板错误统计
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateErrorStats(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/error-stats`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板错误统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板错误日志
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateErrorLogs(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/error-logs`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板错误日志失败:', error);
      throw error;
    }
  }

  /**
   * 清理密码重置配置模板错误日志
   * @param {string} templateId - 模板ID
   * @param {Object} data - 清理参数
   * @returns {Promise} API响应
   */
  async cleanupPasswordResetConfigTemplateErrorLogs(templateId, data) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}/error-logs/cleanup`, { data });
      return response.data;
    } catch (error) {
      console.error('清理密码重置配置模板错误日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板缓存状态
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateCacheStatus(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/cache-status`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板缓存状态失败:', error);
      throw error;
    }
  }

  /**
   * 清理密码重置配置模板缓存
   * @param {string} templateId - 模板ID
   * @param {Object} data - 清理参数
   * @returns {Promise} API响应
   */
  async clearPasswordResetConfigTemplateCache(templateId, data) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}/cache/clear`, { data });
      return response.data;
    } catch (error) {
      console.error('清理密码重置配置模板缓存失败:', error);
      throw error;
    }
  }

  /**
   * 预热密码重置配置模板缓存
   * @param {string} templateId - 模板ID
   * @param {Object} data - 预热参数
   * @returns {Promise} API响应
   */
  async warmupPasswordResetConfigTemplateCache(templateId, data) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/cache/warmup`, data);
      return response.data;
    } catch (error) {
      console.error('预热密码重置配置模板缓存失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板队列状态
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateQueueStatus(templateId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/queue-status`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板队列状态失败:', error);
      throw error;
    }
  }

  /**
   * 处理密码重置配置模板队列
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async processPasswordResetConfigTemplateQueue(templateId) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/queue/process`);
      return response.data;
    } catch (error) {
      console.error('处理密码重置配置模板队列失败:', error);
      throw error;
    }
  }

  /**
   * 清空密码重置配置模板队列
   * @param {string} templateId - 模板ID
   * @returns {Promise} API响应
   */
  async clearPasswordResetConfigTemplateQueue(templateId) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}/queue/clear`);
      return response.data;
    } catch (error) {
      console.error('清空密码重置配置模板队列失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板任务状态
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateTaskStatus(templateId, taskId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/task/${taskId}/status`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板任务状态失败:', error);
      throw error;
    }
  }

  /**
   * 取消密码重置配置模板任务
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async cancelPasswordResetConfigTemplateTask(templateId, taskId) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}/task/${taskId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('取消密码重置配置模板任务失败:', error);
      throw error;
    }
  }

  /**
   * 重试密码重置配置模板任务
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async retryPasswordResetConfigTemplateTask(templateId, taskId) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/task/${taskId}/retry`);
      return response.data;
    } catch (error) {
      console.error('重试密码重置配置模板任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板任务列表
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateTaskList(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/tasks`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板任务列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建密码重置配置模板任务
   * @param {string} templateId - 模板ID
   * @param {Object} data - 任务数据
   * @returns {Promise} API响应
   */
  async createPasswordResetConfigTemplateTask(templateId, data) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/tasks`, data);
      return response.data;
    } catch (error) {
      console.error('创建密码重置配置模板任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新密码重置配置模板任务
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @param {Object} data - 任务数据
   * @returns {Promise} API响应
   */
  async updatePasswordResetConfigTemplateTask(templateId, taskId, data) {
    try {
      const response = await api.put(`/password-reset/config/template/${templateId}/task/${taskId}`, data);
      return response.data;
    } catch (error) {
      console.error('更新密码重置配置模板任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除密码重置配置模板任务
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async deletePasswordResetConfigTemplateTask(templateId, taskId) {
    try {
      const response = await api.delete(`/password-reset/config/template/${templateId}/task/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('删除密码重置配置模板任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板任务详情
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateTaskDetail(templateId, taskId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/task/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板任务详情失败:', error);
      throw error;
    }
  }

  /**
   * 批量处理密码重置配置模板任务
   * @param {string} templateId - 模板ID
   * @param {Array} taskIds - 任务ID数组
   * @param {string} action - 操作类型
   * @returns {Promise} API响应
   */
  async batchProcessPasswordResetConfigTemplateTasks(templateId, taskIds, action) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/tasks/batch`, { taskIds, action });
      return response.data;
    } catch (error) {
      console.error('批量处理密码重置配置模板任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板任务统计
   * @param {string} templateId - 模板ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateTaskStats(templateId, params) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/tasks/stats`, { params });
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板任务统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板任务日志
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateTaskLogs(templateId, taskId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/task/${taskId}/logs`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板任务日志失败:', error);
      throw error;
    }
  }

  /**
   * 导出密码重置配置模板任务日志
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async exportPasswordResetConfigTemplateTaskLogs(templateId, taskId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/task/${taskId}/logs/export`);
      return response.data;
    } catch (error) {
      console.error('导出密码重置配置模板任务日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置配置模板任务报告
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @returns {Promise} API响应
   */
  async getPasswordResetConfigTemplateTaskReport(templateId, taskId) {
    try {
      const response = await api.get(`/password-reset/config/template/${templateId}/task/${taskId}/report`);
      return response.data;
    } catch (error) {
      console.error('获取密码重置配置模板任务报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成密码重置配置模板任务报告
   * @param {string} templateId - 模板ID
   * @param {string} taskId - 任务ID
   * @param {Object} data - 报告数据
   * @returns {Promise} API响应
   */
  async generatePasswordResetConfigTemplateTaskReport(templateId, taskId, data) {
    try {
      const response = await api.post(`/password-reset/config/template/${templateId}/task/${taskId}/report/generate`, data);
      return response.data;
    } catch (error) {
      console.error('生成密码重置配置模板任务报告失败:', error);
      throw error;
    }
  }
}

// 创建并导出单例实例
const passwordResetApiService = new PasswordResetApiService();
module.exports = passwordResetApiService;