/**
 * API性能监控中间件
 * 记录API接口的响应时间和性能指标
 */

const { logger } = require('../config/logger');
const { getRedisClient } = require('../config/redis');

/**
 * 性能监控中间件类
 */
class PerformanceMonitorMiddleware {
  constructor() {
    // 性能指标键前缀
    this.metricsPrefix = 'api_metrics:';
    
    // 慢查询阈值（毫秒）
    this.slowQueryThreshold = 1000;
    
    // 性能指标保留时间（秒）
    this.metricsRetentionTime = 86400; // 24小时
    
    // 性能指标收集间隔（毫秒）
    this.metricsCollectionInterval = 60000; // 1分钟
    
    // 性能数据聚合间隔（毫秒）
    this.aggregationInterval = 300000; // 5分钟
    
    // 启动定时任务
    this.startPeriodicTasks();
  }

  /**
   * 性能监控中间件
   * @param {Object} options - 选项
   * @returns {Function} Express中间件函数
   */
  middleware(options = {}) {
    // 合并选项
    const config = {
      slowQueryThreshold: options.slowQueryThreshold || this.slowQueryThreshold,
      logRequests: options.logRequests !== false, // 默认记录请求
      logSlowQueries: options.logSlowQueries !== false, // 默认记录慢查询
      collectMetrics: options.collectMetrics !== false, // 默认收集指标
      ...options
    };

    return (req, res, next) => {
      // 记录请求开始时间
      const startTime = process.hrtime.bigint();
      
      // 记录请求信息
      const requestInfo = {
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user ? req.user.id : null,
        timestamp: new Date().toISOString()
      };

      // 记录请求开始
      if (config.logRequests) {
        logger.debug(`请求开始: ${requestInfo.method} ${requestInfo.path}`, {
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          userId: requestInfo.userId
        });
      }

      // 拦截响应结束事件
      res.on('finish', async () => {
        // 计算响应时间
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // 转换为毫秒

        // 记录响应信息
        const responseInfo = {
          statusCode: res.statusCode,
          responseTime: Math.round(responseTime * 100) / 100, // 保留两位小数
          contentLength: res.get('Content-Length') || 0
        };

        // 判断是否为慢查询
        const isSlowQuery = responseTime > config.slowQueryThreshold;

        // 记录请求完成日志
        if (config.logRequests || (config.logSlowQueries && isSlowQuery)) {
          const logLevel = isSlowQuery ? 'warn' : 'debug';
          logger[logLevel](`请求完成: ${requestInfo.method} ${requestInfo.path} - ${responseInfo.statusCode} - ${responseInfo.responseTime}ms`, {
            ...requestInfo,
            ...responseInfo,
            isSlowQuery
          });
        }

        // 收集性能指标
        if (config.collectMetrics) {
          await this.collectMetrics(requestInfo, responseInfo, isSlowQuery);
        }
      });

      next();
    };
  }

  /**
   * 收集性能指标
   * @param {Object} requestInfo - 请求信息
   * @param {Object} responseInfo - 响应信息
   * @param {boolean} isSlowQuery - 是否为慢查询
   */
  async collectMetrics(requestInfo, responseInfo, isSlowQuery) {
    try {
      const client = getRedisClient();
      const timestamp = Date.now();
      const minuteKey = Math.floor(timestamp / 60000); // 按分钟分组
      const hourKey = Math.floor(timestamp / 3600000); // 按小时分组
      
      // 基础指标键
      const baseKey = `${this.metricsPrefix}${requestInfo.path.replace(/\//g, ':')}`;
      
      // 1. 记录响应时间（用于计算平均值、P95、P99）
      await client.zAdd(`${baseKey}:response_times`, {
        score: timestamp,
        value: responseInfo.responseTime.toString()
      });
      
      // 设置过期时间
      await client.expire(`${baseKey}:response_times`, this.metricsRetentionTime);
      
      // 2. 记录请求计数
      await client.incr(`${baseKey}:count:${minuteKey}`);
      await client.expire(`${baseKey}:count:${minuteKey}`, this.metricsRetentionTime);
      
      // 3. 记录状态码分布
      await client.incr(`${baseKey}:status:${responseInfo.statusCode}:${minuteKey}`);
      await client.expire(`${baseKey}:status:${responseInfo.statusCode}:${minuteKey}`, this.metricsRetentionTime);
      
      // 4. 记录慢查询
      if (isSlowQuery) {
        await client.zAdd(`${this.metricsPrefix}slow_queries`, {
          score: timestamp,
          value: JSON.stringify({
            path: requestInfo.path,
            method: requestInfo.method,
            responseTime: responseInfo.responseTime,
            statusCode: responseInfo.statusCode,
            timestamp: new Date(timestamp).toISOString()
          })
        });
        
        await client.expire(`${this.metricsPrefix}slow_queries`, this.metricsRetentionTime);
      }
      
      // 5. 记录错误率
      if (responseInfo.statusCode >= 400) {
        await client.incr(`${baseKey}:errors:${minuteKey}`);
        await client.expire(`${baseKey}:errors:${minuteKey}`, this.metricsRetentionTime);
      }
      
      // 6. 记录API热度（按小时）
      await client.incr(`${this.metricsPrefix}api_heatmap:${hourKey}`);
      await client.hSet(`${this.metricsPrefix}api_heatmap:${hourKey}`, requestInfo.path, '1');
      await client.expire(`${this.metricsPrefix}api_heatmap:${hourKey}`, this.metricsRetentionTime);
      
      // 7. 记录用户活跃度（如果有用户ID）
      if (requestInfo.userId) {
        await client.incr(`${this.metricsPrefix}user_activity:${requestInfo.userId}:${hourKey}`);
        await client.expire(`${this.metricsPrefix}user_activity:${requestInfo.userId}:${hourKey}`, this.metricsRetentionTime);
      }
    } catch (error) {
      logger.error('收集性能指标失败', error);
    }
  }

  /**
   * 获取API性能统计
   * @param {string} path - API路径
   * @param {number} duration - 统计时长（分钟）
   * @returns {Object} 性能统计
   */
  async getApiStats(path, duration = 60) {
    try {
      const client = getRedisClient();
      const now = Date.now();
      const startTime = now - (duration * 60000);
      const baseKey = `${this.metricsPrefix}${path.replace(/\//g, ':')}`;
      
      // 获取响应时间数据
      const responseTimes = await client.zRangeByScore(`${baseKey}:response_times`, startTime, now);
      const responseTimeValues = responseTimes.map(rt => parseFloat(rt));
      
      // 计算统计数据
      const stats = {
        path,
        duration,
        requestCount: responseTimeValues.length,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorCount: 0,
        errorRate: 0,
        slowQueryCount: 0
      };
      
      if (responseTimeValues.length > 0) {
        // 排序响应时间
        responseTimeValues.sort((a, b) => a - b);
        
        stats.avgResponseTime = responseTimeValues.reduce((sum, rt) => sum + rt, 0) / responseTimeValues.length;
        stats.minResponseTime = responseTimeValues[0];
        stats.maxResponseTime = responseTimeValues[responseTimeValues.length - 1];
        
        // 计算百分位数
        const p95Index = Math.floor(responseTimeValues.length * 0.95);
        const p99Index = Math.floor(responseTimeValues.length * 0.99);
        stats.p95ResponseTime = responseTimeValues[p95Index] || 0;
        stats.p99ResponseTime = responseTimeValues[p99Index] || 0;
        
        // 计算慢查询数量
        stats.slowQueryCount = responseTimeValues.filter(rt => rt > this.slowQueryThreshold).length;
      }
      
      // 获取错误计数
      let errorCount = 0;
      for (let i = 0; i < duration; i++) {
        const minuteKey = Math.floor((startTime + i * 60000) / 60000);
        const count = await client.get(`${baseKey}:errors:${minuteKey}`);
        errorCount += parseInt(count || '0');
      }
      
      stats.errorCount = errorCount;
      stats.errorRate = stats.requestCount > 0 ? (errorCount / stats.requestCount * 100).toFixed(2) : 0;
      
      return stats;
    } catch (error) {
      logger.error(`获取API性能统计失败: ${path}`, error);
      return null;
    }
  }

  /**
   * 获取慢查询列表
   * @param {number} limit - 返回数量限制
   * @returns {Array} 慢查询列表
   */
  async getSlowQueries(limit = 50) {
    try {
      const client = getRedisClient();
      const slowQueries = await client.zRevRangeWithScores(`${this.metricsPrefix}slow_queries`, 0, limit - 1);
      
      return slowQueries.map(item => ({
        ...JSON.parse(item.value),
        score: item.score
      }));
    } catch (error) {
      logger.error('获取慢查询列表失败', error);
      return [];
    }
  }

  /**
   * 获取API热度排行
   * @param {number} duration - 统计时长（小时）
   * @param {number} limit - 返回数量限制
   * @returns {Array} API热度排行
   */
  async getApiHeatmap(duration = 24, limit = 20) {
    try {
      const client = getRedisClient();
      const now = Date.now();
      const startTime = now - (duration * 3600000);
      
      const heatmapData = {};
      
      // 获取指定时间段内的API热度数据
      for (let i = 0; i < duration; i++) {
        const hourKey = Math.floor((startTime + i * 3600000) / 3600000);
        const hourData = await client.hGetAll(`${this.metricsPrefix}api_heatmap:${hourKey}`);
        
        for (const [path, count] of Object.entries(hourData)) {
          heatmapData[path] = (heatmapData[path] || 0) + parseInt(count);
        }
      }
      
      // 排序并返回前N个
      return Object.entries(heatmapData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([path, count]) => ({ path, count }));
    } catch (error) {
      logger.error('获取API热度排行失败', error);
      return [];
    }
  }

  /**
   * 清理过期的性能数据
   */
  async cleanupExpiredMetrics() {
    try {
      const client = getRedisClient();
      const now = Date.now();
      const cutoffTime = now - (this.metricsRetentionTime * 1000);
      
      // 清理过期的响应时间数据
      const keys = await client.keys(`${this.metricsPrefix}*`);
      for (const key of keys) {
        if (key.includes(':response_times')) {
          await client.zRemRangeByScore(key, 0, cutoffTime);
        }
      }
      
      logger.debug('性能数据清理完成');
    } catch (error) {
      logger.error('清理过期性能数据失败', error);
    }
  }

  /**
   * 启动定时任务
   */
  startPeriodicTasks() {
    // 定期清理过期数据
    setInterval(() => {
      this.cleanupExpiredMetrics();
    }, this.metricsCollectionInterval);
    
    logger.debug('性能监控定时任务已启动');
  }
}

// 创建单例实例
const performanceMonitorMiddleware = new PerformanceMonitorMiddleware();

module.exports = performanceMonitorMiddleware;