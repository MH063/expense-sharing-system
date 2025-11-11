const os = require('os');
const fs = require('fs');
const { logger } = require('../config/logger');
const { pool } = require('../config/db');
const { isRedisConnected, getRedisClient } = require('../config/redis');
const wsManager = require('../config/websocket');

/**
 * 增强指标收集服务
 * 收集系统、数据库、Redis等各项性能指标
 */

/**
 * 收集系统指标
 * @returns {Object} 系统指标数据
 */
async function collectSystemMetrics() {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {},
      database: {},
      redis: {},
      websocket: {}
    };
    
    // 收集系统指标
    metrics.system = {
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
        uptime: os.uptime()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      },
      platform: {
        type: os.type(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname()
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
    
    // 收集数据库指标
    try {
      const client = await pool.connect();
      try {
        // 获取数据库连接数
        const connectionResult = await client.query('SELECT count(*) as count FROM pg_stat_activity');
        // 获取数据库大小
        const sizeResult = await client.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
        // 获取慢查询信息
        const slowQueryResult = await client.query(`
          SELECT count(*) as slow_query_count 
          FROM pg_stat_statements 
          WHERE mean_time > 1000
        `);
        
        metrics.database = {
          status: 'connected',
          connections: parseInt(connectionResult.rows[0].count),
          size: sizeResult.rows[0].size,
          slowQueries: parseInt(slowQueryResult.rows[0].slow_query_count || 0)
        };
      } finally {
        client.release();
      }
    } catch (dbError) {
      logger.warn('数据库指标收集失败:', dbError.message);
      metrics.database = {
        status: 'disconnected',
        error: dbError.message
      };
    }
    
    // 收集Redis指标
    try {
      if (isRedisConnected()) {
        const redisClient = getRedisClient();
        const infoResult = await redisClient.info();
        
        // 解析Redis信息
        const infoLines = infoResult.split('\n');
        const infoMap = {};
        infoLines.forEach(line => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            infoMap[key.trim()] = value.trim();
          }
        });
        
        metrics.redis = {
          status: 'connected',
          version: infoMap.redis_version || 'unknown',
          connectedClients: parseInt(infoMap.connected_clients) || 0,
          usedMemory: parseInt(infoMap.used_memory) || 0,
          usedMemoryHuman: infoMap.used_memory_human || 'unknown',
          uptime: parseInt(infoMap.uptime_in_seconds) || 0,
          keyspaceHits: parseInt(infoMap.keyspace_hits) || 0,
          keyspaceMisses: parseInt(infoMap.keyspace_misses) || 0
        };
      } else {
        metrics.redis = {
          status: 'disconnected'
        };
      }
    } catch (redisError) {
      logger.warn('Redis指标收集失败:', redisError.message);
      metrics.redis = {
        status: 'error',
        error: redisError.message
      };
    }
    
    // 收集WebSocket指标
    try {
      const wsStats = wsManager.getStats();
      metrics.websocket = {
        status: 'active',
        connections: wsStats.totalConnections,
        timestamp: wsStats.timestamp
      };
    } catch (wsError) {
      logger.warn('WebSocket指标收集失败:', wsError.message);
      metrics.websocket = {
        status: 'error',
        error: wsError.message
      };
    }
    
    return metrics;
  } catch (error) {
    logger.error('系统指标收集失败:', error);
    throw error;
  }
}

/**
 * 收集应用性能指标
 * @returns {Object} 应用性能指标数据
 */
async function collectApplicationMetrics() {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      api: {},
      cache: {},
      security: {},
      systemResources: {}
    };
    
    // 收集API性能指标
    try {
      const client = await pool.connect();
      try {
        // 获取API响应时间和错误率统计
        const apiStatsResult = await client.query(`
          SELECT 
            endpoint,
            method,
            AVG(response_time_ms) as avg_response_time,
            MAX(response_time_ms) as max_response_time,
            COUNT(*) as request_count,
            COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
            CASE 
              WHEN COUNT(*) > 0 THEN ROUND(COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*), 2)
              ELSE 0 
            END as error_rate
          FROM system_api_usage_logs
          WHERE created_at >= NOW() - INTERVAL '1 hour'
          GROUP BY endpoint, method
          ORDER BY avg_response_time DESC
        `);
        
        // 计算总体API性能指标
        const overallApiResult = await client.query(`
          SELECT 
            AVG(response_time_ms) as overall_avg_response_time,
            MAX(response_time_ms) as overall_max_response_time,
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status_code >= 400 THEN 1 END) as total_errors,
            CASE 
              WHEN COUNT(*) > 0 THEN ROUND(COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*), 2)
              ELSE 0 
            END as overall_error_rate
          FROM system_api_usage_logs
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        `);
        
        metrics.api = {
          endpoints: apiStatsResult.rows,
          overall: overallApiResult.rows[0] || {
            overall_avg_response_time: 0,
            overall_max_response_time: 0,
            total_requests: 0,
            total_errors: 0,
            overall_error_rate: 0
          }
        };
      } finally {
        client.release();
      }
    } catch (apiError) {
      logger.warn('API指标收集失败:', apiError.message);
      metrics.api = {
        status: 'error',
        error: apiError.message
      };
    }
    
    // 收集缓存命中率指标
    try {
      if (isRedisConnected()) {
        const redisClient = getRedisClient();
        const infoResult = await redisClient.info();
        
        // 解析Redis信息
        const infoLines = infoResult.split('\n');
        const infoMap = {};
        infoLines.forEach(line => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            infoMap[key.trim()] = value.trim();
          }
        });
        
        const hits = parseInt(infoMap.keyspace_hits) || 0;
        const misses = parseInt(infoMap.keyspace_misses) || 0;
        const total = hits + misses;
        const hitRate = total > 0 ? (hits / total) * 100 : 0;
        
        metrics.cache = {
          status: 'connected',
          hits,
          misses,
          total,
          hitRate: parseFloat(hitRate.toFixed(2)),
          usedMemory: parseInt(infoMap.used_memory) || 0,
          usedMemoryHuman: infoMap.used_memory_human || 'unknown'
        };
      } else {
        metrics.cache = {
          status: 'disconnected'
        };
      }
    } catch (cacheError) {
      logger.warn('缓存指标收集失败:', cacheError.message);
      metrics.cache = {
        status: 'error',
        error: cacheError.message
      };
    }
    
    // 收集安全事件统计
    try {
      const client = await pool.connect();
      try {
        // 获取最近一小时的安全事件
        const securityEventsResult = await client.query(`
          SELECT 
            event_type,
            COUNT(*) as event_count
          FROM security_logs
          WHERE created_at >= NOW() - INTERVAL '1 hour'
          GROUP BY event_type
          ORDER BY event_count DESC
        `);
        
        // 获取最近24小时的安全事件统计
        const dailySecurityResult = await client.query(`
          SELECT 
            event_type,
            COUNT(*) as event_count
          FROM security_logs
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY event_type
          ORDER BY event_count DESC
        `);
        
        // 获取最近一小时的高风险安全事件
        const highRiskEventsResult = await client.query(`
          SELECT 
            event_type,
            COUNT(*) as event_count
          FROM security_logs
          WHERE created_at >= NOW() - INTERVAL '1 hour' AND severity = 'high'
          GROUP BY event_type
          ORDER BY event_count DESC
        `);
        
        metrics.security = {
          hourly: securityEventsResult.rows,
          daily: dailySecurityResult.rows,
          highRiskHourly: highRiskEventsResult.rows,
          totalHourlyEvents: securityEventsResult.rows.reduce((sum, event) => sum + parseInt(event.event_count), 0),
          totalHighRiskEvents: highRiskEventsResult.rows.reduce((sum, event) => sum + parseInt(event.event_count), 0)
        };
      } finally {
        client.release();
      }
    } catch (securityError) {
      logger.warn('安全事件统计收集失败:', securityError.message);
      metrics.security = {
        status: 'error',
        error: securityError.message
      };
    }
    
    // 收集系统资源使用情况
    try {
      // 获取CPU使用率
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const cpuUsage = 100 - (idle / total) * 100;
      
      // 获取内存使用情况
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsage = (usedMem / totalMem) * 100;
      
      // 获取磁盘使用情况
      const stats = await fs.promises.stat('.');
      const diskUsage = {
        path: process.cwd(),
        total: stats.size || 0,
        // 注意：这里需要更精确的磁盘使用情况计算，可以使用diskusage等库
        usagePercent: 0
      };
      
      metrics.systemResources = {
        cpu: {
          usage: parseFloat(cpuUsage.toFixed(2)),
          cores: cpus.length
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usage: parseFloat(memoryUsage.toFixed(2))
        },
        disk: diskUsage,
        uptime: os.uptime()
      };
    } catch (resourceError) {
      logger.warn('系统资源指标收集失败:', resourceError.message);
      metrics.systemResources = {
        status: 'error',
        error: resourceError.message
      };
    }
    
    return metrics;
  } catch (error) {
    logger.error('应用性能指标收集失败:', error);
    throw error;
  }
}

/**
 * 保存指标到数据库
 * @param {Object} metrics - 指标数据
 */
async function saveMetricsToDatabase(metrics) {
  try {
    const client = await pool.connect();
    try {
      // 保存系统性能指标
      await client.query(`
        INSERT INTO system_performance_metrics (
          metric_name, metric_value, metric_unit, additional_data, recorded_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        'system_metrics',
        JSON.stringify(metrics),
        'json',
        '{}',
        new Date()
      ]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('指标保存到数据库失败:', error);
  }
}

/**
 * 获取历史指标数据
 * @param {string} metricName - 指标名称
 * @param {number} hours - 小时数
 * @returns {Array} 历史指标数据
 */
async function getHistoricalMetrics(metricName, hours = 24) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT metric_name, metric_value, metric_unit, additional_data, recorded_at
        FROM system_performance_metrics
        WHERE metric_name = $1 AND recorded_at >= NOW() - INTERVAL '${hours} hours'
        ORDER BY recorded_at DESC
        LIMIT 100
      `, [metricName]);
      
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('获取历史指标数据失败:', error);
    throw error;
  }
}

module.exports = {
  collectSystemMetrics,
  collectApplicationMetrics,
  saveMetricsToDatabase,
  getHistoricalMetrics
};