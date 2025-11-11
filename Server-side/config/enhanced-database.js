const { Pool } = require('pg');
const { logger } = require('./logger');

/**
 * 增强版数据库连接池管理器
 * 支持动态调整连接池大小和监控
 */

class EnhancedDatabaseManager {
  constructor() {
    this.pool = null;
    this.config = null;
    this.monitoringInterval = null;
    this.stats = {
      totalConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalQueryCount: 0,
      slowQueryCount: 0,
      errorCount: 0
    };
  }

  /**
   * 初始化连接池
   * @param {Object} dbConfig - 数据库配置
   */
  initialize(dbConfig) {
    this.config = { ...dbConfig };
    
    // 设置动态连接池参数
    this.config.max = parseInt(process.env.DB_MAX_CONNECTIONS) || this.config.max || 20;
    this.config.min = parseInt(process.env.DB_MIN_CONNECTIONS) || this.config.min || 2;
    this.config.idleTimeoutMillis = parseInt(process.env.DB_IDLE_TIMEOUT) || this.config.idleTimeoutMillis || 30000;
    this.config.connectionTimeoutMillis = parseInt(process.env.DB_CONNECTION_TIMEOUT) || this.config.connectionTimeoutMillis || 10000;
    
    // 创建连接池
    this.pool = new Pool(this.config);
    
    // 监听连接池事件
    this.pool.on('connect', () => {
      this.stats.totalConnections++;
      logger.debug('数据库连接已建立');
    });
    
    this.pool.on('acquire', () => {
      this.stats.waitingRequests = Math.max(0, this.stats.waitingRequests - 1);
      logger.debug('获取数据库连接');
    });
    
    this.pool.on('remove', () => {
      this.stats.totalConnections = Math.max(0, this.stats.totalConnections - 1);
      logger.debug('数据库连接已释放');
    });
    
    this.pool.on('error', (err) => {
      this.stats.errorCount++;
      logger.error('数据库连接池错误:', err);
    });
    
    // 启动监控
    this.startMonitoring();
    
    logger.info('增强版数据库连接池初始化完成', {
      maxConnections: this.config.max,
      minConnections: this.config.min
    });
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(() => {
      this.updateStats();
      this.logStats();
      
      // 根据负载动态调整连接池大小
      this.adjustPoolSize();
    }, 5000); // 每5秒检查一次
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    if (this.pool) {
      this.stats.idleConnections = this.pool.idleCount;
      this.stats.waitingRequests = this.pool.waitingCount;
    }
  }

  /**
   * 记录统计信息
   */
  logStats() {
    logger.info('数据库连接池状态', {
      totalConnections: this.stats.totalConnections,
      idleConnections: this.stats.idleConnections,
      waitingRequests: this.stats.waitingRequests,
      totalQueryCount: this.stats.totalQueryCount,
      slowQueryCount: this.stats.slowQueryCount,
      errorCount: this.stats.errorCount
    });
  }

  /**
   * 动态调整连接池大小
   */
  adjustPoolSize() {
    if (!this.pool || !this.config) return;
    
    const waitingRequests = this.stats.waitingRequests;
    const idleConnections = this.stats.idleConnections;
    const currentMax = this.pool.options.max;
    
    // 如果等待请求数大于空闲连接数，且当前最大连接数小于配置的最大连接数，则增加连接
    if (waitingRequests > idleConnections && currentMax < this.config.max) {
      const newMax = Math.min(currentMax + 2, this.config.max);
      this.pool.options.max = newMax;
      logger.info(`增加连接池大小到 ${newMax}`);
    }
    
    // 如果空闲连接数过多，且当前最大连接数大于最小连接数，则减少连接
    if (idleConnections > 5 && currentMax > this.config.min) {
      const newMax = Math.max(currentMax - 1, this.config.min);
      this.pool.options.max = newMax;
      logger.info(`减少连接池大小到 ${newMax}`);
    }
  }

  /**
   * 执行查询
   * @param {string} text - SQL查询语句
   * @param {Array} params - 查询参数
   * @returns {Promise} 查询结果
   */
  async query(text, params) {
    this.stats.totalQueryCount++;
    
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // 记录慢查询
      const slowQueryThreshold = parseInt(process.env.DB_SLOW_QUERY_THRESHOLD) || 1000;
      if (duration > slowQueryThreshold) {
        this.stats.slowQueryCount++;
        logger.warn('慢查询', { 
          query: text.substring(0, 100) + '...', 
          durationMs: duration,
          params: params ? params.slice(0, 3) : []
        });
      }
      
      logger.debug('查询执行完成', { durationMs: duration, rowCount: result.rowCount });
      return result;
    } catch (error) {
      this.stats.errorCount++;
      logger.error('查询执行失败', { 
        error: error.message,
        query: text.substring(0, 100) + '...',
        params: params ? params.slice(0, 3) : []
      });
      throw error;
    }
  }

  /**
   * 获取连接池统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 关闭连接池
   */
  async close() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.pool) {
      await this.pool.end();
      logger.info('数据库连接池已关闭');
    }
  }
}

module.exports = new EnhancedDatabaseManager();