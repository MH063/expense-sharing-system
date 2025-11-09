const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const os = require('os');

/**
 * 增强的性能指标收集中间件
 * 用于收集系统性能指标、API性能指标和业务指标
 */

/**
 * 记录系统性能指标到数据库
 * @param {string} metricName - 指标名称
 * @param {number} metricValue - 指标值
 * @param {string} metricUnit - 指标单位
 * @param {Object} additionalData - 附加数据
 */
async function recordSystemMetric(metricName, metricValue, metricUnit = '', additionalData = {}) {
  try {
    await pool.query(
      `INSERT INTO system_performance_metrics (metric_name, metric_value, metric_unit, additional_data, recorded_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [metricName, metricValue, metricUnit, JSON.stringify(additionalData)]
    );
    
    logger.info(`系统性能指标记录: ${metricName} = ${metricValue}${metricUnit}`);
  } catch (error) {
    logger.error(`记录系统性能指标失败 (${metricName}):`, error);
  }
}

/**
 * 记录API使用日志到数据库
 * @param {string} endpoint - API端点
 * @param {string} method - HTTP方法
 * @param {number} responseTime - 响应时间(ms)
 * @param {number} statusCode - HTTP状态码
 * @param {string} userId - 用户ID
 * @param {Object} additionalData - 附加数据
 */
async function recordApiUsage(endpoint, method, responseTime, statusCode, userId = null, additionalData = {}) {
  try {
    await pool.query(
      `INSERT INTO system_api_usage_logs (endpoint, method, response_time_ms, status_code, user_id, additional_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [endpoint, method, responseTime, statusCode, userId, JSON.stringify(additionalData)]
    );
    
    logger.info(`API使用记录: ${method} ${endpoint} - ${statusCode} (${responseTime}ms)`);
  } catch (error) {
    logger.error(`记录API使用失败 (${endpoint}):`, error);
  }
}

/**
 * 收集系统资源使用情况
 * @returns {Object} 系统资源使用情况
 */
function collectSystemResourceUsage() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  // 获取CPU负载 (平均负载，1分钟、5分钟、15分钟)
  const loadAvg = os.loadavg();
  
  // 计算CPU使用率 (简化版本，实际生产环境可能需要更精确的计算)
  const cpuUsage = process.cpuUsage();
  
  return {
    cpu: {
      count: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed,
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1],
        '15min': loadAvg[2]
      }
    },
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercent: (usedMemory / totalMemory * 100).toFixed(2)
    },
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch()
  };
}

/**
 * 收集数据库性能指标
 * @returns {Promise<Object>} 数据库性能指标
 */
async function collectDatabaseMetrics() {
  const client = await pool.connect();
  try {
    // 获取数据库连接数
    const connectionCountResult = await client.query(
      'SELECT count(*) as connection_count FROM pg_stat_activity'
    );
    
    // 获取数据库大小
    const dbSizeResult = await client.query(
      'SELECT pg_size_pretty(pg_database_size($1)) as database_size',
      [process.env.DB_NAME || 'expense_dev']
    );
    
    // 获取活跃连接数
    const activeConnectionResult = await client.query(
      "SELECT count(*) as active_connection_count FROM pg_stat_activity WHERE state = 'active'"
    );
    
    return {
      connectionCount: parseInt(connectionCountResult.rows[0].connection_count),
      activeConnectionCount: parseInt(activeConnectionResult.rows[0].active_connection_count),
      databaseSize: dbSizeResult.rows[0].database_size
    };
  } catch (error) {
    logger.error('收集数据库性能指标失败:', error);
    return {
      connectionCount: 0,
      activeConnectionCount: 0,
      databaseSize: 'Unknown',
      error: error.message
    };
  } finally {
    client.release();
  }
}

/**
 * 收集应用性能指标
 * @returns {Object} 应用性能指标
 */
function collectApplicationMetrics() {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      rss: memUsage.rss, // 常驻内存集
      heapTotal: memUsage.heapTotal, // V8分配的堆内存总量
      heapUsed: memUsage.heapUsed, // V8已使用的堆内存
      external: memUsage.external // V8管理的C++对象内存
    },
    uptime: process.uptime(), // 应用运行时间
    pid: process.pid, // 进程ID
    version: process.version // Node.js版本
  };
}

/**
 * 定期收集系统性能指标
 * 应该由调度器定期调用
 */
async function collectSystemMetrics() {
  try {
    // 收集系统资源使用情况
    const systemResourceUsage = collectSystemResourceUsage();
    
    // 记录CPU使用率 (简化计算)
    await recordSystemMetric(
      'cpu_usage', 
      systemResourceUsage.cpu.loadAverage['1min'], 
      '', 
      { cores: systemResourceUsage.cpu.count }
    );
    
    // 记录内存使用率
    await recordSystemMetric(
      'memory_usage', 
      parseFloat(systemResourceUsage.memory.usagePercent), 
      '%', 
      { 
        total: `${(systemResourceUsage.memory.total / 1024 / 1024 / 1024).toFixed(2)}GB`,
        used: `${(systemResourceUsage.memory.used / 1024 / 1024 / 1024).toFixed(2)}GB`
      }
    );
    
    // 收集数据库性能指标
    const databaseMetrics = await collectDatabaseMetrics();
    
    // 记录数据库连接数
    await recordSystemMetric(
      'database_connections', 
      databaseMetrics.connectionCount, 
      '', 
      { active: databaseMetrics.activeConnectionCount }
    );
    
    // 收集应用性能指标
    const applicationMetrics = collectApplicationMetrics();
    
    // 记录应用内存使用
    await recordSystemMetric(
      'app_memory_heap_used', 
      applicationMetrics.memory.heapUsed, 
      'bytes', 
      { 
        total: applicationMetrics.memory.heapTotal,
        usagePercent: (applicationMetrics.memory.heapUsed / applicationMetrics.memory.heapTotal * 100).toFixed(2)
      }
    );
    
    // 记录应用运行时间
    await recordSystemMetric(
      'app_uptime', 
      applicationMetrics.uptime, 
      'seconds'
    );
    
    logger.info('系统性能指标收集完成');
  } catch (error) {
    logger.error('收集系统性能指标失败:', error);
  }
}

/**
 * 性能指标收集中间件
 * 记录API请求的性能指标
 */
function metricsCollector(options = {}) {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // 记录请求开始
    const endpoint = req.route ? req.route.path : req.path;
    const method = req.method;
    
    // 监听响应结束
    res.on('finish', async () => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const statusCode = res.statusCode;
      const userId = req.user ? req.user.sub : null;
      
      // 记录API使用情况
      await recordApiUsage(endpoint, method, responseTime, statusCode, userId, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // 如果响应时间过长，记录警告
      if (responseTime > 1000) {
        logger.warn(`慢API请求: ${method} ${endpoint} - ${responseTime}ms`);
      }
    });
    
    next();
  };
}

/**
 * 业务指标收集器
 * 用于收集特定的业务指标
 */
const businessMetricsCollector = {
  /**
   * 记录用户登录指标
   * @param {string} userId - 用户ID
   * @param {string} loginMethod - 登录方式
   * @param {boolean} success - 是否成功
   */
  recordUserLogin: async (userId, loginMethod, success) => {
    try {
      await recordSystemMetric(
        'user_login', 
        success ? 1 : 0, 
        '', 
        { 
          userId, 
          loginMethod, 
          success,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      logger.error('记录用户登录指标失败:', error);
    }
  },
  
  /**
   * 记录账单创建指标
   * @param {string} userId - 用户ID
   * @param {string} roomId - 房间ID
   * @param {number} amount - 金额
   */
  recordBillCreation: async (userId, roomId, amount) => {
    try {
      await recordSystemMetric(
        'bill_created', 
        amount, 
        'currency', 
        { 
          userId, 
          roomId,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      logger.error('记录账单创建指标失败:', error);
    }
  },
  
  /**
   * 记录费用创建指标
   * @param {string} userId - 用户ID
   * @param {string} roomId - 房间ID
   * @param {number} amount - 金额
   */
  recordExpenseCreation: async (userId, roomId, amount) => {
    try {
      await recordSystemMetric(
        'expense_created', 
        amount, 
        'currency', 
        { 
          userId, 
          roomId,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      logger.error('记录费用创建指标失败:', error);
    }
  }
};

module.exports = {
  recordSystemMetric,
  recordApiUsage,
  collectSystemResourceUsage,
  collectDatabaseMetrics,
  collectApplicationMetrics,
  collectSystemMetrics,
  metricsCollector,
  businessMetricsCollector
};