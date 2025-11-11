const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { collectSystemMetrics, saveMetricsToDatabase } = require('./enhanced-metrics');

/**
 * 性能监控和审计日志调度服务
 * 用于定期收集系统性能指标和清理过期日志
 */

/**
 * 清理过期的用户活动日志
 * @param {number} retentionDays - 保留天数
 */
async function cleanupUserActivityLogs(retentionDays = 90) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM user_activity_logs WHERE created_at < NOW() - INTERVAL $1 DAY',
      [retentionDays]
    );
    
    logger.info(`清理过期用户活动日志完成，删除了 ${result.rowCount} 条记录`);
    return result.rowCount;
  } catch (error) {
    logger.error('清理过期用户活动日志失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 清理过期的数据变更审计日志
 * @param {number} retentionDays - 保留天数
 */
async function cleanupDataChangeAudits(retentionDays = 365) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM data_change_audits WHERE changed_at < NOW() - INTERVAL $1 DAY',
      [retentionDays]
    );
    
    logger.info(`清理过期数据变更审计日志完成，删除了 ${result.rowCount} 条记录`);
    return result.rowCount;
  } catch (error) {
    logger.error('清理过期数据变更审计日志失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 清理过期的系统审计日志
 * @param {number} retentionDays - 保留天数
 */
async function cleanupSystemAuditLogs(retentionDays = 180) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM system_audit_logs WHERE occurred_at < NOW() - INTERVAL $1 DAY',
      [retentionDays]
    );
    
    logger.info(`清理过期系统审计日志完成，删除了 ${result.rowCount} 条记录`);
    return result.rowCount;
  } catch (error) {
    logger.error('清理过期系统审计日志失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 清理过期的系统性能指标
 * @param {number} retentionDays - 保留天数
 */
async function cleanupSystemPerformanceMetrics(retentionDays = 30) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM system_performance_metrics WHERE recorded_at < NOW() - INTERVAL $1 DAY',
      [retentionDays]
    );
    
    logger.info(`清理过期系统性能指标完成，删除了 ${result.rowCount} 条记录`);
    return result.rowCount;
  } catch (error) {
    logger.error('清理过期系统性能指标失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 清理过期的API使用日志
 * @param {number} retentionDays - 保留天数
 */
async function cleanupApiUsageLogs(retentionDays = 30) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM system_api_usage_logs WHERE created_at < NOW() - INTERVAL $1 DAY',
      [retentionDays]
    );
    
    logger.info(`清理过期API使用日志完成，删除了 ${result.rowCount} 条记录`);
    return result.rowCount;
  } catch (error) {
    logger.error('清理过期API使用日志失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 清理所有过期日志和指标
 * @param {Object} options - 清理选项
 */
async function cleanupAllExpiredData(options = {}) {
  const {
    userActivityLogsRetention = 90,
    dataChangeAuditsRetention = 365,
    systemAuditLogsRetention = 180,
    systemPerformanceMetricsRetention = 30,
    apiUsageLogsRetention = 30
  } = options;
  
  try {
    const results = {
      userActivityLogs: await cleanupUserActivityLogs(userActivityLogsRetention),
      dataChangeAudits: await cleanupDataChangeAudits(dataChangeAuditsRetention),
      systemAuditLogs: await cleanupSystemAuditLogs(systemAuditLogsRetention),
      systemPerformanceMetrics: await cleanupSystemPerformanceMetrics(systemPerformanceMetricsRetention),
      apiUsageLogs: await cleanupApiUsageLogs(apiUsageLogsRetention)
    };
    
    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);
    logger.info(`清理所有过期数据完成，总共删除了 ${totalDeleted} 条记录`);
    
    return results;
  } catch (error) {
    logger.error('清理所有过期数据失败:', error);
    throw error;
  }
}

/**
 * 生成系统健康报告
 * @returns {Object} 系统健康报告
 */
async function generateSystemHealthReport() {
  const client = await pool.connect();
  try {
    // 获取系统性能指标最新数据
    const metricsResult = await client.query(`
      SELECT metric_name, metric_value, metric_unit, additional_data, recorded_at
      FROM system_performance_metrics
      WHERE recorded_at >= NOW() - INTERVAL '24 hours'
      ORDER BY recorded_at DESC
    `);
    
    // 获取API性能统计
    const apiStatsResult = await client.query(`
      SELECT 
        endpoint,
        method,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        COUNT(*) as request_count,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
      FROM system_api_usage_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY endpoint, method
      ORDER BY avg_response_time DESC
      LIMIT 10
    `);
    
    // 获取用户活动统计
    const userActivityResult = await client.query(`
      SELECT 
        action,
        COUNT(*) as count
      FROM user_activity_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // 获取数据变更统计
    const dataChangeResult = await client.query(`
      SELECT 
        table_name,
        action,
        COUNT(*) as count
      FROM data_change_audits
      WHERE changed_at >= NOW() - INTERVAL '24 hours'
      GROUP BY table_name, action
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // 获取系统事件统计
    const systemEventResult = await client.query(`
      SELECT 
        event_type,
        event_level,
        COUNT(*) as count
      FROM system_audit_logs
      WHERE occurred_at >= NOW() - INTERVAL '24 hours'
      GROUP BY event_type, event_level
      ORDER BY count DESC
    `);
    
    // 获取数据库连接统计
    const dbConnectionResult = await client.query(`
      SELECT 
        count(*) as total_connections,
        count(CASE WHEN state = 'active' THEN 1 END) as active_connections,
        count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
      FROM pg_stat_activity
    `);
    
    // 获取数据库大小
    const dbSizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size($1)) as database_size
    `, [process.env.DB_NAME || 'expense_dev']);
    
    // 生成健康报告
    const healthReport = {
      timestamp: new Date().toISOString(),
      systemMetrics: metricsResult.rows,
      apiPerformance: apiStatsResult.rows,
      userActivity: userActivityResult.rows,
      dataChanges: dataChangeResult.rows,
      systemEvents: systemEventResult.rows,
      database: {
        connections: dbConnectionResult.rows[0],
        size: dbSizeResult.rows[0].database_size
      }
    };
    
    // 记录系统健康报告
    logger.info('系统健康报告生成完成', { 
      metricsCount: metricsResult.rowCount,
      apiEndpointsCount: apiStatsResult.rowCount,
      userActivitiesCount: userActivityResult.rowCount,
      dataChangesCount: dataChangeResult.rowCount,
      systemEventsCount: systemEventResult.rowCount
    });
    
    return healthReport;
  } catch (error) {
    logger.error('生成系统健康报告失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 调度任务执行器
 * 根据配置执行各种调度任务
 */
class SchedulerTasks {
  /**
   * 执行系统性能指标收集任务
   */
  static async collectSystemMetricsTask() {
    try {
      logger.info('开始执行系统性能指标收集任务');
      const metrics = await collectSystemMetrics();
      // 保存指标到数据库
      await saveMetricsToDatabase(metrics);
      logger.info('系统性能指标收集任务执行完成');
    } catch (error) {
      logger.error('系统性能指标收集任务执行失败:', error);
    }
  }
  
  /**
   * 执行日志清理任务
   */
  static async cleanupLogsTask() {
    try {
      logger.info('开始执行日志清理任务');
      const results = await cleanupAllExpiredData();
      logger.info('日志清理任务执行完成', results);
    } catch (error) {
      logger.error('日志清理任务执行失败:', error);
    }
  }
  
  /**
   * 执行系统健康报告生成任务
   */
  static async generateHealthReportTask() {
    try {
      logger.info('开始执行系统健康报告生成任务');
      const report = await generateSystemHealthReport();
      logger.info('系统健康报告生成任务执行完成');
      return report;
    } catch (error) {
      logger.error('系统健康报告生成任务执行失败:', error);
    }
  }
}

module.exports = {
  cleanupUserActivityLogs,
  cleanupDataChangeAudits,
  cleanupSystemAuditLogs,
  cleanupSystemPerformanceMetrics,
  cleanupApiUsageLogs,
  cleanupAllExpiredData,
  generateSystemHealthReport,
  SchedulerTasks
};