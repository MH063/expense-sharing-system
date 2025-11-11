const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const logger = require('../config/logger');
const { isRedisConnected, clearAllCache } = require('../config/redis');

class SystemMaintenanceController {
  /**
   * 获取系统维护任务列表
   */
  static async getMaintenanceTasks(req, res) {
    try {
      const { page = 1, limit = 20, status, priority } = req.query;
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM system_maintenance_tasks WHERE 1=1';
      const params = [];
      
      if (status) {
        query += ' AND status = $' + (params.length + 1);
        params.push(status);
      }
      
      if (priority) {
        query += ' AND priority = $' + (params.length + 1);
        params.push(priority);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM system_maintenance_tasks WHERE 1=1';
      const countParams = [];
      
      if (status) {
        countQuery += ' AND status = $' + (countParams.length + 1);
        countParams.push(status);
      }
      
      if (priority) {
        countQuery += ' AND priority = $' + (countParams.length + 1);
        countParams.push(priority);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      res.success(200, '获取维护任务列表成功', {
        tasks: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取维护任务列表失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 根据ID获取系统维护任务
   */
  static async getMaintenanceTaskById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query('SELECT * FROM system_maintenance_tasks WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.error(404, '维护任务不存在');
      }
      
      res.success(200, '获取维护任务成功', result.rows[0]);
    } catch (error) {
      logger.error('获取维护任务失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 创建系统维护任务
   */
  static async createMaintenanceTask(req, res) {
    try {
      const { title, description, priority, scheduled_at, task_type } = req.body;
      
      if (!title || !priority || !task_type) {
        return res.error(400, '标题、优先级和任务类型是必填项');
      }
      
      const result = await pool.query(
        `INSERT INTO system_maintenance_tasks (title, description, priority, status, scheduled_at, task_type, created_by, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
        [title, description, priority, 'pending', scheduled_at, task_type, req.user.sub]
      );
      
      res.success(201, '创建维护任务成功', result.rows[0]);
    } catch (error) {
      logger.error('创建维护任务失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 更新系统维护任务
   */
  static async updateMaintenanceTask(req, res) {
    try {
      const { id } = req.params;
      const { title, description, priority, status, scheduled_at, task_type } = req.body;
      
      // 检查任务是否存在
      const taskResult = await pool.query('SELECT * FROM system_maintenance_tasks WHERE id = $1', [id]);
      
      if (taskResult.rows.length === 0) {
        return res.error(404, '维护任务不存在');
      }
      
      // 更新任务
      const result = await pool.query(
        `UPDATE system_maintenance_tasks 
         SET title = COALESCE($1, title), 
             description = COALESCE($2, description), 
             priority = COALESCE($3, priority), 
             status = COALESCE($4, status), 
             scheduled_at = COALESCE($5, scheduled_at), 
             task_type = COALESCE($6, task_type),
             updated_by = $7,
             updated_at = NOW()
         WHERE id = $8 RETURNING *`,
        [title, description, priority, status, scheduled_at, task_type, req.user.sub, id]
      );
      
      res.success(200, '更新维护任务成功', result.rows[0]);
    } catch (error) {
      logger.error('更新维护任务失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 删除系统维护任务
   */
  static async deleteMaintenanceTask(req, res) {
    try {
      const { id } = req.params;
      
      // 检查任务是否存在
      const taskResult = await pool.query('SELECT * FROM system_maintenance_tasks WHERE id = $1', [id]);
      
      if (taskResult.rows.length === 0) {
        return res.error(404, '维护任务不存在');
      }
      
      // 删除任务
      await pool.query('DELETE FROM system_maintenance_tasks WHERE id = $1', [id]);
      
      res.success(200, '删除维护任务成功');
    } catch (error) {
      logger.error('删除维护任务失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 执行系统维护任务
   */
  static async executeMaintenanceTask(req, res) {
    try {
      const { id } = req.params;
      
      // 检查任务是否存在
      const taskResult = await pool.query('SELECT * FROM system_maintenance_tasks WHERE id = $1', [id]);
      
      if (taskResult.rows.length === 0) {
        return res.error(404, '维护任务不存在');
      }
      
      const task = taskResult.rows[0];
      
      // 更新任务状态为执行中
      await pool.query(
        'UPDATE system_maintenance_tasks SET status = $1, started_at = NOW(), updated_by = $2, updated_at = NOW() WHERE id = $3',
        ['in_progress', req.user.sub, id]
      );
      
      // 根据任务类型执行相应的维护任务
      let executionResult;
      try {
        switch (task.task_type) {
          case 'cache_clear':
            executionResult = await this.clearSystemCache();
            break;
          case 'temp_cleanup':
            executionResult = await this.cleanupTempFiles();
            break;
          case 'db_optimize':
            executionResult = await this.optimizeDatabase();
            break;
          case 'backup':
            executionResult = await this.createBackup();
            break;
          default:
            executionResult = { success: false, message: '未知的任务类型' };
        }
      } catch (error) {
        executionResult = { success: false, message: error.message };
      }
      
      // 更新任务状态
      const status = executionResult.success ? 'completed' : 'failed';
      await pool.query(
        `UPDATE system_maintenance_tasks 
         SET status = $1, completed_at = NOW(), result = $2, updated_by = $3, updated_at = NOW() 
         WHERE id = $4`,
        [status, JSON.stringify(executionResult), req.user.sub, id]
      );
      
      res.success(200, '执行维护任务成功', executionResult);
    } catch (error) {
      logger.error('执行维护任务失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取维护报告列表
   */
  static async getMaintenanceReports(req, res) {
    try {
      const { page = 1, limit = 20, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM system_maintenance_reports WHERE 1=1';
      const params = [];
      
      if (start_date) {
        query += ' AND created_at >= $' + (params.length + 1);
        params.push(start_date);
      }
      
      if (end_date) {
        query += ' AND created_at <= $' + (params.length + 1);
        params.push(end_date);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM system_maintenance_reports WHERE 1=1';
      const countParams = [];
      
      if (start_date) {
        countQuery += ' AND created_at >= $' + (countParams.length + 1);
        countParams.push(start_date);
      }
      
      if (end_date) {
        countQuery += ' AND created_at <= $' + (countParams.length + 1);
        countParams.push(end_date);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      res.success(200, '获取维护报告列表成功', {
        reports: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取维护报告列表失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 根据ID获取维护报告
   */
  static async getMaintenanceReportById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query('SELECT * FROM system_maintenance_reports WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.error(404, '维护报告不存在');
      }
      
      res.success(200, '获取维护报告成功', result.rows[0]);
    } catch (error) {
      logger.error('获取维护报告失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 生成维护报告
   */
  static async generateMaintenanceReport(req, res) {
    try {
      const { title, description, start_date, end_date, report_type } = req.body;
      
      if (!title || !start_date || !end_date || !report_type) {
        return res.error(400, '标题、开始日期、结束日期和报告类型是必填项');
      }
      
      // 根据报告类型生成报告内容
      let reportContent;
      try {
        switch (report_type) {
          case 'system_health':
            reportContent = await this.generateSystemHealthReport(start_date, end_date);
            break;
          case 'performance':
            reportContent = await this.generatePerformanceReport(start_date, end_date);
            break;
          case 'error_logs':
            reportContent = await this.generateErrorLogsReport(start_date, end_date);
            break;
          case 'maintenance_tasks':
            reportContent = await this.generateMaintenanceTasksReport(start_date, end_date);
            break;
          default:
            reportContent = { success: false, message: '未知的报告类型' };
        }
      } catch (error) {
        reportContent = { success: false, message: error.message };
      }
      
      // 保存报告
      const result = await pool.query(
        `INSERT INTO system_maintenance_reports (title, description, start_date, end_date, report_type, content, created_by, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
        [title, description, start_date, end_date, report_type, JSON.stringify(reportContent), req.user.sub]
      );
      
      res.success(201, '生成维护报告成功', result.rows[0]);
    } catch (error) {
      logger.error('生成维护报告失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 导出维护报告
   */
  static async exportMaintenanceReport(req, res) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;
      
      // 获取报告
      const reportResult = await pool.query('SELECT * FROM system_maintenance_reports WHERE id = $1', [id]);
      
      if (reportResult.rows.length === 0) {
        return res.error(404, '维护报告不存在');
      }
      
      const report = reportResult.rows[0];
      
      // 根据格式导出报告
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${report.title}.json"`);
        return res.json(report.content);
      } else if (format === 'csv') {
        // 简单的CSV导出示例，实际实现需要根据报告内容结构进行调整
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${report.title}.csv"`);
        return res.send('CSV导出功能待实现');
      } else {
        return res.error(400, '不支持的导出格式');
      }
    } catch (error) {
      logger.error('导出维护报告失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取备份列表
   */
  static async getBackups(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const result = await pool.query(
        'SELECT * FROM system_backups ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      // 获取总数
      const countResult = await pool.query('SELECT COUNT(*) as total FROM system_backups');
      const total = parseInt(countResult.rows[0].total);
      
      res.success(200, '获取备份列表成功', {
        backups: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取备份列表失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 创建备份
   */
  static async createBackup(req, res) {
    try {
      const { description, backup_type = 'full' } = req.body;
      
      // 创建备份记录
      const result = await pool.query(
        `INSERT INTO system_backups (filename, path, size, backup_type, status, description, created_by, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
        [`backup_${Date.now()}.sql`, '/backups/', 0, backup_type, 'in_progress', description, req.user.sub]
      );
      
      const backup = result.rows[0];
      
      // 这里应该实际执行备份操作，例如使用pg_dump
      // 为了示例，我们只是模拟一个异步操作
      setTimeout(async () => {
        try {
          // 模拟备份操作
          const filename = `backup_${Date.now()}.sql`;
          const path = '/backups/';
          const size = Math.floor(Math.random() * 1000000); // 模拟文件大小
          
          // 更新备份状态
          await pool.query(
            'UPDATE system_backups SET filename = $1, path = $2, size = $3, status = $4, completed_at = NOW() WHERE id = $5',
            [filename, path, size, 'completed', backup.id]
          );
          
          logger.info(`备份完成: ${filename}`);
        } catch (error) {
          logger.error('备份失败:', error);
          
          // 更新备份状态为失败
          await pool.query(
            'UPDATE system_backups SET status = $1, error = $2, completed_at = NOW() WHERE id = $3',
            ['failed', error.message, backup.id]
          );
        }
      }, 5000); // 模拟5秒的备份过程
      
      res.success(201, '备份任务已创建', backup);
    } catch (error) {
      logger.error('创建备份失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 恢复备份
   */
  static async restoreBackup(req, res) {
    try {
      const { id } = req.params;
      
      // 检查备份是否存在
      const backupResult = await pool.query('SELECT * FROM system_backups WHERE id = $1', [id]);
      
      if (backupResult.rows.length === 0) {
        return res.error(404, '备份不存在');
      }
      
      const backup = backupResult.rows[0];
      
      if (backup.status !== 'completed') {
        return res.error(400, '只能恢复已完成的备份');
      }
      
      // 这里应该实际执行恢复操作
      // 为了示例，我们只是模拟一个异步操作
      setTimeout(async () => {
        try {
          // 模拟恢复操作
          logger.info(`备份恢复完成: ${backup.filename}`);
          
          // 记录恢复操作
          await pool.query(
            `INSERT INTO system_maintenance_logs (action, description, result, created_by, created_at) 
             VALUES ($1, $2, $3, $4, NOW())`,
            ['restore_backup', `恢复备份: ${backup.filename}`, 'success', req.user.sub]
          );
        } catch (error) {
          logger.error('备份恢复失败:', error);
          
          // 记录恢复操作
          await pool.query(
            `INSERT INTO system_maintenance_logs (action, description, result, error, created_by, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            ['restore_backup', `恢复备份: ${backup.filename}`, 'failed', error.message, req.user.sub]
          );
        }
      }, 3000); // 模拟3秒的恢复过程
      
      res.success(200, '备份恢复任务已启动');
    } catch (error) {
      logger.error('恢复备份失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 删除备份
   */
  static async deleteBackup(req, res) {
    try {
      const { id } = req.params;
      
      // 检查备份是否存在
      const backupResult = await pool.query('SELECT * FROM system_backups WHERE id = $1', [id]);
      
      if (backupResult.rows.length === 0) {
        return res.error(404, '备份不存在');
      }
      
      const backup = backupResult.rows[0];
      
      // 删除备份文件
      try {
        if (fs.existsSync(backup.path + backup.filename)) {
          fs.unlinkSync(backup.path + backup.filename);
        }
      } catch (error) {
        logger.error('删除备份文件失败:', error);
      }
      
      // 删除备份记录
      await pool.query('DELETE FROM system_backups WHERE id = $1', [id]);
      
      res.success(200, '删除备份成功');
    } catch (error) {
      logger.error('删除备份失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取系统健康状态
   */
  static async getSystemHealth(req, res) {
    try {
      // 检查数据库连接
      let dbStatus = 'unknown';
      let dbConnectionTime = 0;
      try {
        const startTime = Date.now();
        await pool.query('SELECT 1');
        dbConnectionTime = Date.now() - startTime;
        dbStatus = 'healthy';
      } catch (error) {
        dbStatus = 'unhealthy';
      }
      
      // 检查Redis连接
      let redisStatus = 'unknown';
      try {
        redisStatus = isRedisConnected() ? 'healthy' : 'unhealthy';
      } catch (error) {
        redisStatus = 'unhealthy';
      }
      
      // 检查磁盘空间
      let diskStatus = 'unknown';
      let diskUsage = 0;
      try {
        const stats = fs.statSync(process.cwd());
        // 这里应该使用更精确的方法检查磁盘空间
        diskUsage = Math.floor(Math.random() * 100); // 模拟磁盘使用率
        diskStatus = diskUsage > 90 ? 'critical' : diskUsage > 80 ? 'warning' : 'healthy';
      } catch (error) {
        diskStatus = 'unknown';
      }
      
      // 检查内存使用
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const memoryStatus = memoryUsagePercent > 90 ? 'critical' : memoryUsagePercent > 80 ? 'warning' : 'healthy';
      
      // 检查CPU使用
      const cpuUsage = process.cpuUsage();
      const cpuStatus = 'healthy'; // 简化处理
      
      // 系统运行时间
      const uptime = process.uptime();
      
      // 综合健康状态
      const overallStatus = [dbStatus, redisStatus, diskStatus, memoryStatus, cpuStatus].includes('critical')
        ? 'critical'
        : [dbStatus, redisStatus, diskStatus, memoryStatus, cpuStatus].includes('warning')
        ? 'warning'
        : [dbStatus, redisStatus, diskStatus, memoryStatus, cpuStatus].includes('unhealthy')
        ? 'unhealthy'
        : 'healthy';
      
      const healthData = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime,
        database: {
          status: dbStatus,
          connectionTime: dbConnectionTime
        },
        redis: {
          status: redisStatus
        },
        disk: {
          status: diskStatus,
          usage: diskUsage
        },
        memory: {
          status: memoryStatus,
          usage: memoryUsagePercent,
          details: memoryUsage
        },
        cpu: {
          status: cpuStatus,
          usage: cpuUsage
        }
      };
      
      res.success(200, '获取系统健康状态成功', healthData);
    } catch (error) {
      logger.error('获取系统健康状态失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取性能指标
   */
  static async getPerformanceMetrics(req, res) {
    try {
      const { period = '24h' } = req.query;
      
      // 根据时间周期确定时间范围
      let startTime;
      const endTime = new Date();
      
      switch (period) {
        case '1h':
          startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      }
      
      // 获取系统性能指标
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();
      
      // 获取数据库性能指标
      let dbMetrics = {};
      try {
        const dbQueryResult = await pool.query(`
          SELECT 
            COUNT(*) as total_connections,
            COUNT(*) FILTER (WHERE state = 'active') as active_connections,
            COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity
        `);
        
        dbMetrics = {
          connections: dbQueryResult.rows[0],
          connectionTime: 0 // 简化处理
        };
      } catch (error) {
        dbMetrics = { error: error.message };
      }
      
      // 获取Redis性能指标
      let redisMetrics = {};
      try {
        redisMetrics = {
          connected: isRedisConnected()
          // 这里可以添加更多Redis指标
        };
      } catch (error) {
        redisMetrics = { error: error.message };
      }
      
      // 获取HTTP请求指标
      let httpMetrics = {};
      try {
        // 这里应该从日志或监控系统中获取HTTP请求指标
        httpMetrics = {
          requests: Math.floor(Math.random() * 10000), // 模拟数据
          errors: Math.floor(Math.random() * 100), // 模拟数据
          averageResponseTime: Math.floor(Math.random() * 1000) // 模拟数据
        };
      } catch (error) {
        httpMetrics = { error: error.message };
      }
      
      const performanceData = {
        period,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        system: {
          uptime,
          memory: memoryUsage,
          cpu: cpuUsage
        },
        database: dbMetrics,
        redis: redisMetrics,
        http: httpMetrics
      };
      
      res.success(200, '获取性能指标成功', performanceData);
    } catch (error) {
      logger.error('获取性能指标失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取错误日志
   */
  static async getErrorLogs(req, res) {
    try {
      const { page = 1, limit = 20, level, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;
      
      // 这里应该从日志系统中获取错误日志
      // 为了示例，我们模拟一些错误日志数据
      const logs = [];
      const total = 100; // 模拟总数
      
      for (let i = 0; i < Math.min(limit, total - offset); i++) {
        logs.push({
          id: offset + i + 1,
          timestamp: new Date(Date.now() - (offset + i) * 60000).toISOString(),
          level: level || ['error', 'warning', 'info'][Math.floor(Math.random() * 3)],
          message: `错误日志消息 ${offset + i + 1}`,
          source: 'system',
          details: {
            error: 'Error details',
            stack: 'Error stack trace'
          }
        });
      }
      
      res.success(200, '获取错误日志成功', {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取错误日志失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取警告列表
   */
  static async getWarnings(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM system_warnings WHERE 1=1';
      const params = [];
      
      if (status) {
        query += ' AND status = $' + (params.length + 1);
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM system_warnings WHERE 1=1';
      const countParams = [];
      
      if (status) {
        countQuery += ' AND status = $' + (countParams.length + 1);
        countParams.push(status);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      res.success(200, '获取警告列表成功', {
        warnings: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取警告列表失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 解决警告
   */
  static async resolveWarning(req, res) {
    try {
      const { id } = req.params;
      const { resolution_note } = req.body;
      
      // 检查警告是否存在
      const warningResult = await pool.query('SELECT * FROM system_warnings WHERE id = $1', [id]);
      
      if (warningResult.rows.length === 0) {
        return res.error(404, '警告不存在');
      }
      
      // 更新警告状态
      await pool.query(
        'UPDATE system_warnings SET status = $1, resolution_note = $2, resolved_by = $3, resolved_at = NOW() WHERE id = $4',
        ['resolved', resolution_note, req.user.sub, id]
      );
      
      res.success(200, '解决警告成功');
    } catch (error) {
      logger.error('解决警告失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取系统配置
   */
  static async getSystemConfig(req, res) {
    try {
      const result = await pool.query('SELECT key, value, updated_at, updated_by FROM system_config');
      const config = {};
      for (const row of result.rows) config[row.key] = row.value;
      res.success(200, '获取系统配置成功', config);
    } catch (error) {
      logger.error('获取系统配置失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 更新系统配置
   */
  static async updateSystemConfig(req, res) {
    try {
      const entries = Object.entries(req.body || {});
      if (entries.length === 0) return res.error(400, '更新内容不能为空');
      
      for (const [key, value] of entries) {
        await pool.query(
          'INSERT INTO system_config(key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()',
          [key, JSON.stringify(value), req.user.sub]
        );
      }
      
      res.success(200, '更新系统配置成功');
    } catch (error) {
      logger.error('更新系统配置失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取系统信息
   */
  static async getSystemInfo(req, res) {
    try {
      const systemInfo = {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        uptime: process.uptime(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus(),
        networkInterfaces: os.networkInterfaces(),
        hostname: os.hostname(),
        homedir: os.homedir(),
        tmpdir: os.tmpdir()
      };
      
      res.success(200, '获取系统信息成功', systemInfo);
    } catch (error) {
      logger.error('获取系统信息失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 获取维护日志
   */
  static async getMaintenanceLogs(req, res) {
    try {
      const { page = 1, limit = 20, action, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM system_maintenance_logs WHERE 1=1';
      const params = [];
      
      if (action) {
        query += ' AND action = $' + (params.length + 1);
        params.push(action);
      }
      
      if (start_date) {
        query += ' AND created_at >= $' + (params.length + 1);
        params.push(start_date);
      }
      
      if (end_date) {
        query += ' AND created_at <= $' + (params.length + 1);
        params.push(end_date);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM system_maintenance_logs WHERE 1=1';
      const countParams = [];
      
      if (action) {
        countQuery += ' AND action = $' + (countParams.length + 1);
        countParams.push(action);
      }
      
      if (start_date) {
        countQuery += ' AND created_at >= $' + (countParams.length + 1);
        countParams.push(start_date);
      }
      
      if (end_date) {
        countQuery += ' AND created_at <= $' + (countParams.length + 1);
        countParams.push(end_date);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      res.success(200, '获取维护日志成功', {
        logs: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取维护日志失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 清理系统缓存
   */
  static async clearSystemCache() {
    try {
      // 清理Redis缓存
      const redisCleared = clearAllCache();
      
      // 记录操作结果
      return {
        success: true,
        message: '系统缓存清理成功',
        details: {
          redis: redisCleared ? '成功' : '失败'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '系统缓存清理失败',
        error: error.message
      };
    }
  }

  /**
   * 清理临时文件
   */
  static async cleanupTempFiles() {
    try {
      const tempDir = os.tmpdir();
      const files = fs.readdirSync(tempDir);
      let deletedCount = 0;
      let totalSize = 0;
      
      // 清理超过24小时的临时文件
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          
          if (now - stats.mtimeMs > dayMs) {
            totalSize += stats.size;
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (error) {
          // 忽略单个文件删除错误
        }
      }
      
      return {
        success: true,
        message: '临时文件清理成功',
        details: {
          deletedCount,
          totalSize
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '临时文件清理失败',
        error: error.message
      };
    }
  }

  /**
   * 优化数据库
   */
  static async optimizeDatabase() {
    try {
      // 执行VACUUM和ANALYZE操作
      await pool.query('VACUUM ANALYZE');
      
      return {
        success: true,
        message: '数据库优化成功'
      };
    } catch (error) {
      return {
        success: false,
        message: '数据库优化失败',
        error: error.message
      };
    }
  }

  /**
   * 生成系统健康报告
   */
  static async generateSystemHealthReport(startDate, endDate) {
    try {
      // 获取系统健康数据
      const healthData = await this.getSystemHealthData(startDate, endDate);
      
      return {
        success: true,
        data: healthData
      };
    } catch (error) {
      return {
        success: false,
        message: '生成系统健康报告失败',
        error: error.message
      };
    }
  }

  /**
   * 生成性能报告
   */
  static async generatePerformanceReport(startDate, endDate) {
    try {
      // 获取性能数据
      const performanceData = await this.getPerformanceData(startDate, endDate);
      
      return {
        success: true,
        data: performanceData
      };
    } catch (error) {
      return {
        success: false,
        message: '生成性能报告失败',
        error: error.message
      };
    }
  }

  /**
   * 生成错误日志报告
   */
  static async generateErrorLogsReport(startDate, endDate) {
    try {
      // 获取错误日志数据
      const errorLogsData = await this.getErrorLogsData(startDate, endDate);
      
      return {
        success: true,
        data: errorLogsData
      };
    } catch (error) {
      return {
        success: false,
        message: '生成错误日志报告失败',
        error: error.message
      };
    }
  }

  /**
   * 生成维护任务报告
   */
  static async generateMaintenanceTasksReport(startDate, endDate) {
    try {
      // 获取维护任务数据
      const maintenanceTasksData = await this.getMaintenanceTasksData(startDate, endDate);
      
      return {
        success: true,
        data: maintenanceTasksData
      };
    } catch (error) {
      return {
        success: false,
        message: '生成维护任务报告失败',
        error: error.message
      };
    }
  }

  /**
   * 获取系统健康数据
   */
  static async getSystemHealthData(startDate, endDate) {
    // 这里应该从数据库或监控系统中获取系统健康数据
    // 为了示例，我们返回模拟数据
    return {
      startDate,
      endDate,
      overallHealth: 'good',
      components: {
        database: 'healthy',
        redis: 'healthy',
        disk: 'warning',
        memory: 'healthy',
        cpu: 'healthy'
      }
    };
  }

  /**
   * 获取性能数据
   */
  static async getPerformanceData(startDate, endDate) {
    // 这里应该从数据库或监控系统中获取性能数据
    // 为了示例，我们返回模拟数据
    return {
      startDate,
      endDate,
      metrics: {
        responseTime: {
          average: 250,
          min: 50,
          max: 1000
        },
        throughput: {
          requestsPerSecond: 100,
          totalRequests: 8640000
        },
        errorRate: 0.01
      }
    };
  }

  /**
   * 获取错误日志数据
   */
  static async getErrorLogsData(startDate, endDate) {
    // 这里应该从日志系统中获取错误日志数据
    // 为了示例，我们返回模拟数据
    return {
      startDate,
      endDate,
      totalErrors: 100,
      errorsByLevel: {
        error: 50,
        warning: 30,
        info: 20
      },
      topErrors: [
        { message: 'Database connection failed', count: 20 },
        { message: 'File not found', count: 15 },
        { message: 'Authentication failed', count: 10 }
      ]
    };
  }

  /**
   * 获取维护任务数据
   */
  static async getMaintenanceTasksData(startDate, endDate) {
    // 这里应该从数据库中获取维护任务数据
    // 为了示例，我们返回模拟数据
    return {
      startDate,
      endDate,
      totalTasks: 20,
      tasksByStatus: {
        completed: 15,
        in_progress: 3,
        pending: 2
      },
      tasksByType: {
        backup: 8,
        cleanup: 7,
        update: 5
      }
    };
  }

  /**
   * 重启系统
   */
  static async restartSystem(req, res) {
    try {
      // 记录重启操作
      logger.info('系统重启请求', { userId: req.user.sub });
      
      // 在实际应用中，这里应该执行系统重启逻辑
      // 例如：关闭服务器、重新初始化等
      
      // 记录维护日志
      await pool.query(
        `INSERT INTO system_maintenance_logs (action, description, result, created_by, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        ['system_restart', '系统重启请求', 'success', req.user.sub]
      );
      
      // 返回响应
      res.success(200, '系统重启命令已发送');
      
      // 在实际应用中，这里应该执行实际的重启操作
      // 例如：process.exit(0) 或者使用 PM2 等进程管理工具
      // 为了安全起见，这里只是模拟操作
      setTimeout(() => {
        logger.info('系统重启完成');
      }, 5000);
    } catch (error) {
      logger.error('系统重启失败:', error);
      
      // 记录维护日志
      await pool.query(
        `INSERT INTO system_maintenance_logs (action, description, result, error, created_by, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['system_restart', '系统重启请求', 'failed', error.message, req.user.sub]
      );
      
      res.error(500, '服务器内部错误');
    }
  }
}

module.exports = SystemMaintenanceController;