const { logger } = require('../config/logger');
const { pool } = require('../config/db');
const { isRedisConnected } = require('../config/redis');
const { collectSystemMetrics } = require('./enhanced-metrics');

/**
 * 告警服务
 * 监控系统状态并在出现问题时发送通知
 */

// 告警级别
const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// 告警类型
const ALERT_TYPES = {
  SYSTEM: 'system',
  DATABASE: 'database',
  REDIS: 'redis',
  API: 'api',
  SECURITY: 'security'
};

// 告警阈值配置
const ALERT_THRESHOLDS = {
  // 系统指标阈值
  system: {
    cpuUsage: 80, // CPU使用率超过80%
    memoryUsage: 85, // 内存使用率超过85%
    diskUsage: 90 // 磁盘使用率超过90%
  },
  // 数据库指标阈值
  database: {
    connections: 80, // 数据库连接数超过80
    slowQueries: 10, // 慢查询数量超过10
    connectionFailure: true // 数据库连接失败
  },
  // Redis指标阈值
  redis: {
    connectionFailure: true, // Redis连接失败
    memoryUsage: 90, // Redis内存使用率超过90%
    hitRate: 80 // 缓存命中率低于80%
  },
  // API指标阈值
  api: {
    responseTime: 2000, // API响应时间超过2000ms
    errorRate: 10, // API错误率超过10%
    requestRate: 1000 // 每分钟请求数超过1000
  },
  // 安全指标阈值
  security: {
    highRiskEventsPerHour: 5, // 每小时高风险安全事件超过5个
    totalEventsPerHour: 50 // 每小时总安全事件超过50个
  }
};

/**
 * 保存告警到数据库
 * @param {string} alertType - 告警类型
 * @param {string} alertLevel - 告警级别
 * @param {string} title - 告警标题
 * @param {string} message - 告警消息
 * @param {Object} details - 告警详情
 * @param {string} userId - 相关用户ID（可选）
 */
async function saveAlert(alertType, alertLevel, title, message, details = {}, userId = null) {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO system_alerts (
          alert_type, alert_level, title, message, details, user_id, created_at, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL)
      `, [
        alertType,
        alertLevel,
        title,
        message,
        JSON.stringify(details),
        userId
      ]);
      
      logger.info(`告警已保存: ${title} (${alertLevel})`);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('保存告警失败:', error);
  }
}

/**
 * 发送告警通知
 * @param {string} alertType - 告警类型
 * @param {string} alertLevel - 告警级别
 * @param {string} title - 告警标题
 * @param {string} message - 告警消息
 * @param {Object} details - 告警详情
 */
async function sendAlertNotification(alertType, alertLevel, title, message, details = {}) {
  try {
    // 这里可以集成各种通知渠道，如邮件、短信、Slack、钉钉等
    // 目前只记录日志
    logger.warn(`告警通知: [${alertLevel.toUpperCase()}] ${title} - ${message}`, details);
    
    // 在实际生产环境中，可以添加以下通知方式：
    // 1. 邮件通知
    // await sendEmailNotification(alertLevel, title, message, details);
    
    // 2. 短信通知（仅针对严重告警）
    // if (alertLevel === ALERT_LEVELS.CRITICAL) {
    //   await sendSMSNotification(title, message);
    // }
    
    // 3. Slack/钉钉通知
    // await sendChatNotification(alertLevel, title, message, details);
    
    return true;
  } catch (error) {
    logger.error('发送告警通知失败:', error);
    return false;
  }
}

/**
 * 检查系统指标并触发告警
 * @param {Object} metrics - 系统指标
 */
async function checkSystemMetrics(metrics) {
  try {
    // 检查CPU使用率
    if (metrics.system && metrics.system.memory && metrics.system.memory.usagePercent) {
      const cpuUsage = metrics.system.memory.usagePercent;
      if (cpuUsage > ALERT_THRESHOLDS.system.cpuUsage) {
        const alertLevel = cpuUsage > 95 ? ALERT_LEVELS.CRITICAL : ALERT_LEVELS.WARNING;
        await saveAlert(
          ALERT_TYPES.SYSTEM,
          alertLevel,
          'CPU使用率过高',
          `当前CPU使用率为${cpuUsage.toFixed(2)}%，超过阈值${ALERT_THRESHOLDS.system.cpuUsage}%`,
          { currentUsage: cpuUsage, threshold: ALERT_THRESHOLDS.system.cpuUsage }
        );
        await sendAlertNotification(
          ALERT_TYPES.SYSTEM,
          alertLevel,
          'CPU使用率过高',
          `当前CPU使用率为${cpuUsage.toFixed(2)}%，超过阈值${ALERT_THRESHOLDS.system.cpuUsage}%`,
          { currentUsage: cpuUsage, threshold: ALERT_THRESHOLDS.system.cpuUsage }
        );
      }
    }
    
    // 检查内存使用率
    if (metrics.system && metrics.system.memory && metrics.system.memory.usagePercent) {
      const memoryUsage = metrics.system.memory.usagePercent;
      if (memoryUsage > ALERT_THRESHOLDS.system.memoryUsage) {
        const alertLevel = memoryUsage > 95 ? ALERT_LEVELS.CRITICAL : ALERT_LEVELS.WARNING;
        await saveAlert(
          ALERT_TYPES.SYSTEM,
          alertLevel,
          '内存使用率过高',
          `当前内存使用率为${memoryUsage.toFixed(2)}%，超过阈值${ALERT_THRESHOLDS.system.memoryUsage}%`,
          { currentUsage: memoryUsage, threshold: ALERT_THRESHOLDS.system.memoryUsage }
        );
        await sendAlertNotification(
          ALERT_TYPES.SYSTEM,
          alertLevel,
          '内存使用率过高',
          `当前内存使用率为${memoryUsage.toFixed(2)}%，超过阈值${ALERT_THRESHOLDS.system.memoryUsage}%`,
          { currentUsage: memoryUsage, threshold: ALERT_THRESHOLDS.system.memoryUsage }
        );
      }
    }
    
    // 检查数据库连接状态
    if (metrics.database) {
      if (metrics.database.status === 'disconnected') {
        await saveAlert(
          ALERT_TYPES.DATABASE,
          ALERT_LEVELS.CRITICAL,
          '数据库连接失败',
          '无法连接到数据库，请检查数据库服务状态',
          { error: metrics.database.error }
        );
        await sendAlertNotification(
          ALERT_TYPES.DATABASE,
          ALERT_LEVELS.CRITICAL,
          '数据库连接失败',
          '无法连接到数据库，请检查数据库服务状态',
          { error: metrics.database.error }
        );
      } else {
        // 检查数据库连接数
        if (metrics.database.connections > ALERT_THRESHOLDS.database.connections) {
          await saveAlert(
            ALERT_TYPES.DATABASE,
            ALERT_LEVELS.WARNING,
            '数据库连接数过多',
            `当前数据库连接数为${metrics.database.connections}，超过阈值${ALERT_THRESHOLDS.database.connections}`,
            { currentConnections: metrics.database.connections, threshold: ALERT_THRESHOLDS.database.connections }
          );
          await sendAlertNotification(
            ALERT_TYPES.DATABASE,
            ALERT_LEVELS.WARNING,
            '数据库连接数过多',
            `当前数据库连接数为${metrics.database.connections}，超过阈值${ALERT_THRESHOLDS.database.connections}`,
            { currentConnections: metrics.database.connections, threshold: ALERT_THRESHOLDS.database.connections }
          );
        }
        
        // 检查慢查询数量
        if (metrics.database.slowQueries > ALERT_THRESHOLDS.database.slowQueries) {
          await saveAlert(
            ALERT_TYPES.DATABASE,
            ALERT_LEVELS.WARNING,
            '慢查询数量过多',
            `当前慢查询数量为${metrics.database.slowQueries}，超过阈值${ALERT_THRESHOLDS.database.slowQueries}`,
            { currentSlowQueries: metrics.database.slowQueries, threshold: ALERT_THRESHOLDS.database.slowQueries }
          );
          await sendAlertNotification(
            ALERT_TYPES.DATABASE,
            ALERT_LEVELS.WARNING,
            '慢查询数量过多',
            `当前慢查询数量为${metrics.database.slowQueries}，超过阈值${ALERT_THRESHOLDS.database.slowQueries}`,
            { currentSlowQueries: metrics.database.slowQueries, threshold: ALERT_THRESHOLDS.database.slowQueries }
          );
        }
      }
    }
    
    // 检查Redis连接状态
    if (metrics.redis) {
      if (metrics.redis.status === 'disconnected') {
        await saveAlert(
          ALERT_TYPES.REDIS,
          ALERT_LEVELS.WARNING,
          'Redis连接失败',
          '无法连接到Redis服务，请检查Redis服务状态',
          { error: metrics.redis.error }
        );
        await sendAlertNotification(
          ALERT_TYPES.REDIS,
          ALERT_LEVELS.WARNING,
          'Redis连接失败',
          '无法连接到Redis服务，请检查Redis服务状态',
          { error: metrics.redis.error }
        );
      }
    }
  } catch (error) {
    logger.error('检查系统指标失败:', error);
  }
}

/**
 * 检查缓存性能指标并触发告警
 * @param {Object} cacheMetrics - 缓存性能指标
 */
async function checkCacheMetrics(cacheMetrics) {
  try {
    if (!cacheMetrics || cacheMetrics.status !== 'connected') return;
    
    // 检查缓存命中率
    if (cacheMetrics.hitRate < ALERT_THRESHOLDS.redis.hitRate) {
      const alertLevel = cacheMetrics.hitRate < 50 ? ALERT_LEVELS.WARNING : ALERT_LEVELS.INFO;
      await saveAlert(
        ALERT_TYPES.REDIS,
        alertLevel,
        '缓存命中率过低',
        `当前缓存命中率为${cacheMetrics.hitRate}%，低于阈值${ALERT_THRESHOLDS.redis.hitRate}%`,
        { currentHitRate: cacheMetrics.hitRate, threshold: ALERT_THRESHOLDS.redis.hitRate }
      );
      await sendAlertNotification(
        ALERT_TYPES.REDIS,
        alertLevel,
        '缓存命中率过低',
        `当前缓存命中率为${cacheMetrics.hitRate}%，低于阈值${ALERT_THRESHOLDS.redis.hitRate}%`,
        { currentHitRate: cacheMetrics.hitRate, threshold: ALERT_THRESHOLDS.redis.hitRate }
      );
    }
  } catch (error) {
    logger.error('检查缓存性能指标失败:', error);
  }
}

/**
 * 检查安全事件指标并触发告警
 * @param {Object} securityMetrics - 安全事件指标
 */
async function checkSecurityMetrics(securityMetrics) {
  try {
    if (!securityMetrics || securityMetrics.status === 'error') return;
    
    // 检查每小时高风险安全事件数量
    if (securityMetrics.totalHighRiskEvents > ALERT_THRESHOLDS.security.highRiskEventsPerHour) {
      await saveAlert(
        ALERT_TYPES.SECURITY,
        ALERT_LEVELS.WARNING,
        '高风险安全事件过多',
        `过去一小时内检测到${securityMetrics.totalHighRiskEvents}个高风险安全事件，超过阈值${ALERT_THRESHOLDS.security.highRiskEventsPerHour}`,
        { 
          currentHighRiskEvents: securityMetrics.totalHighRiskEvents, 
          threshold: ALERT_THRESHOLDS.security.highRiskEventsPerHour,
          events: securityMetrics.highRiskHourly
        }
      );
      await sendAlertNotification(
        ALERT_TYPES.SECURITY,
        ALERT_LEVELS.WARNING,
        '高风险安全事件过多',
        `过去一小时内检测到${securityMetrics.totalHighRiskEvents}个高风险安全事件，超过阈值${ALERT_THRESHOLDS.security.highRiskEventsPerHour}`,
        { 
          currentHighRiskEvents: securityMetrics.totalHighRiskEvents, 
          threshold: ALERT_THRESHOLDS.security.highRiskEventsPerHour,
          events: securityMetrics.highRiskHourly
        }
      );
    }
    
    // 检查每小时总安全事件数量
    if (securityMetrics.totalHourlyEvents > ALERT_THRESHOLDS.security.totalEventsPerHour) {
      await saveAlert(
        ALERT_TYPES.SECURITY,
        ALERT_LEVELS.INFO,
        '安全事件数量增加',
        `过去一小时内检测到${securityMetrics.totalHourlyEvents}个安全事件，超过阈值${ALERT_THRESHOLDS.security.totalEventsPerHour}`,
        { 
          currentTotalEvents: securityMetrics.totalHourlyEvents, 
          threshold: ALERT_THRESHOLDS.security.totalEventsPerHour,
          events: securityMetrics.hourly
        }
      );
      await sendAlertNotification(
        ALERT_TYPES.SECURITY,
        ALERT_LEVELS.INFO,
        '安全事件数量增加',
        `过去一小时内检测到${securityMetrics.totalHourlyEvents}个安全事件，超过阈值${ALERT_THRESHOLDS.security.totalEventsPerHour}`,
        { 
          currentTotalEvents: securityMetrics.totalHourlyEvents, 
          threshold: ALERT_THRESHOLDS.security.totalEventsPerHour,
          events: securityMetrics.hourly
        }
      );
    }
  } catch (error) {
    logger.error('检查安全事件指标失败:', error);
  }
}

/**
 * 检查系统资源使用情况并触发告警
 * @param {Object} systemResources - 系统资源指标
 */
async function checkSystemResources(systemResources) {
  try {
    if (!systemResources || systemResources.status === 'error') return;
    
    // 检查CPU使用率
    if (systemResources.cpu && systemResources.cpu.usage > ALERT_THRESHOLDS.system.cpuUsage) {
      const alertLevel = systemResources.cpu.usage > 95 ? ALERT_LEVELS.CRITICAL : ALERT_LEVELS.WARNING;
      await saveAlert(
        ALERT_TYPES.SYSTEM,
        alertLevel,
        'CPU使用率过高',
        `当前CPU使用率为${systemResources.cpu.usage}%，超过阈值${ALERT_THRESHOLDS.system.cpuUsage}%`,
        { currentUsage: systemResources.cpu.usage, threshold: ALERT_THRESHOLDS.system.cpuUsage }
      );
      await sendAlertNotification(
        ALERT_TYPES.SYSTEM,
        alertLevel,
        'CPU使用率过高',
        `当前CPU使用率为${systemResources.cpu.usage}%，超过阈值${ALERT_THRESHOLDS.system.cpuUsage}%`,
        { currentUsage: systemResources.cpu.usage, threshold: ALERT_THRESHOLDS.system.cpuUsage }
      );
    }
    
    // 检查内存使用率
    if (systemResources.memory && systemResources.memory.usage > ALERT_THRESHOLDS.system.memoryUsage) {
      const alertLevel = systemResources.memory.usage > 95 ? ALERT_LEVELS.CRITICAL : ALERT_LEVELS.WARNING;
      await saveAlert(
        ALERT_TYPES.SYSTEM,
        alertLevel,
        '内存使用率过高',
        `当前内存使用率为${systemResources.memory.usage}%，超过阈值${ALERT_THRESHOLDS.system.memoryUsage}%`,
        { currentUsage: systemResources.memory.usage, threshold: ALERT_THRESHOLDS.system.memoryUsage }
      );
      await sendAlertNotification(
        ALERT_TYPES.SYSTEM,
        alertLevel,
        '内存使用率过高',
        `当前内存使用率为${systemResources.memory.usage}%，超过阈值${ALERT_THRESHOLDS.system.memoryUsage}%`,
        { currentUsage: systemResources.memory.usage, threshold: ALERT_THRESHOLDS.system.memoryUsage }
      );
    }
  } catch (error) {
    logger.error('检查系统资源指标失败:', error);
  }
}
async function checkApiPerformance(apiStats) {
  try {
    if (!apiStats || !Array.isArray(apiStats)) return;
    
    for (const stat of apiStats) {
      // 检查API响应时间
      if (stat.avg_response_time > ALERT_THRESHOLDS.api.responseTime) {
        const alertLevel = stat.avg_response_time > 5000 ? ALERT_LEVELS.ERROR : ALERT_LEVELS.WARNING;
        await saveAlert(
          ALERT_TYPES.API,
          alertLevel,
          'API响应时间过长',
          `API端点 ${stat.method} ${stat.endpoint} 平均响应时间为${stat.avg_response_time}ms，超过阈值${ALERT_THRESHOLDS.api.responseTime}ms`,
          { endpoint: stat.endpoint, method: stat.method, avgResponseTime: stat.avg_response_time, threshold: ALERT_THRESHOLDS.api.responseTime }
        );
        await sendAlertNotification(
          ALERT_TYPES.API,
          alertLevel,
          'API响应时间过长',
          `API端点 ${stat.method} ${stat.endpoint} 平均响应时间为${stat.avg_response_time}ms，超过阈值${ALERT_THRESHOLDS.api.responseTime}ms`,
          { endpoint: stat.endpoint, method: stat.method, avgResponseTime: stat.avg_response_time, threshold: ALERT_THRESHOLDS.api.responseTime }
        );
      }
      
      // 检查API错误率
      if (stat.error_rate > ALERT_THRESHOLDS.api.errorRate) {
        const alertLevel = stat.error_rate > 30 ? ALERT_LEVELS.CRITICAL : ALERT_LEVELS.ERROR;
        await saveAlert(
          ALERT_TYPES.API,
          alertLevel,
          'API错误率过高',
          `API端点 ${stat.method} ${stat.endpoint} 错误率为${stat.error_rate}%，超过阈值${ALERT_THRESHOLDS.api.errorRate}%`,
          { endpoint: stat.endpoint, method: stat.method, errorRate: stat.error_rate, threshold: ALERT_THRESHOLDS.api.errorRate }
        );
        await sendAlertNotification(
          ALERT_TYPES.API,
          alertLevel,
          'API错误率过高',
          `API端点 ${stat.method} ${stat.endpoint} 错误率为${stat.error_rate}%，超过阈值${ALERT_THRESHOLDS.api.errorRate}%`,
          { endpoint: stat.endpoint, method: stat.method, errorRate: stat.error_rate, threshold: ALERT_THRESHOLDS.api.errorRate }
        );
      }
    }
  } catch (error) {
    logger.error('检查API性能指标失败:', error);
  }
}

/**
 * 执行系统检查并触发告警
 */
async function performSystemCheck() {
  try {
    logger.info('开始执行系统检查');
    
    // 收集系统指标
    const metrics = await collectSystemMetrics();
    
    // 检查系统指标并触发告警
    await checkSystemMetrics(metrics);
    
    // 收集应用性能指标
    const appMetrics = await collectApplicationMetrics();
    
    // 检查API性能指标并触发告警
    if (appMetrics.api && appMetrics.api.overall) {
      await checkApiPerformance([appMetrics.api.overall]);
    }
    
    // 检查缓存性能指标并触发告警
    if (appMetrics.cache) {
      await checkCacheMetrics(appMetrics.cache);
    }
    
    // 检查安全事件指标并触发告警
    if (appMetrics.security) {
      await checkSecurityMetrics(appMetrics.security);
    }
    
    // 检查系统资源使用情况并触发告警
    if (appMetrics.systemResources) {
      await checkSystemResources(appMetrics.systemResources);
    }
    
    logger.info('系统检查完成');
  } catch (error) {
    logger.error('执行系统检查失败:', error);
  }
}

/**
 * 获取未解决的告警
 * @param {string} alertType - 告警类型（可选）
 * @param {string} alertLevel - 告警级别（可选）
 * @param {number} limit - 限制数量
 * @returns {Array} 未解决的告警列表
 */
async function getUnresolvedAlerts(alertType = null, alertLevel = null, limit = 50) {
  try {
    const client = await pool.connect();
    try {
      let query = `
        SELECT id, alert_type, alert_level, title, message, details, user_id, created_at
        FROM system_alerts
        WHERE resolved_at IS NULL
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // 添加告警类型筛选
      if (alertType) {
        query += ` AND alert_type = $${paramIndex++}`;
        queryParams.push(alertType);
      }
      
      // 添加告警级别筛选
      if (alertLevel) {
        query += ` AND alert_level = $${paramIndex++}`;
        queryParams.push(alertLevel);
      }
      
      // 添加排序和限制
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      queryParams.push(parseInt(limit));
      
      const result = await client.query(query, queryParams);
      
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('获取未解决告警失败:', error);
    return [];
  }
}

/**
 * 解决告警
 * @param {number} alertId - 告警ID
 * @param {string} resolution - 解决方案说明
 * @param {string} userId - 解决告警的用户ID
 * @returns {boolean} 是否成功解决
 */
async function resolveAlert(alertId, resolution = '', userId = null) {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE system_alerts
        SET resolved_at = NOW(), resolution = $2, resolved_by = $3
        WHERE id = $1 AND resolved_at IS NULL
      `, [alertId, resolution, userId]);
      
      logger.info(`告警已解决: ID ${alertId}`);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('解决告警失败:', error);
    return false;
  }
}

module.exports = {
  ALERT_LEVELS,
  ALERT_TYPES,
  ALERT_THRESHOLDS,
  saveAlert,
  sendAlertNotification,
  checkSystemMetrics,
  checkApiPerformance,
  checkCacheMetrics,
  checkSecurityMetrics,
  checkSystemResources,
  performSystemCheck,
  getUnresolvedAlerts,
  resolveAlert
};