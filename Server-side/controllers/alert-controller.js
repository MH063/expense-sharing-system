const { logger } = require('../config/logger');
const { 
  getUnresolvedAlerts, 
  resolveAlert, 
  performSystemCheck,
  ALERT_LEVELS,
  ALERT_TYPES
} = require('../services/alert-service');
const { pool } = require('../config/db');

/**
 * 告警控制器
 * 提供API接口获取和管理告警信息
 */

class AlertController {
  /**
   * 获取未解决的告警
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUnresolvedAlerts(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问告警信息');
      }
      
      const { 
        alertType, 
        alertLevel, 
        limit = 50 
      } = req.query;
      
      const alerts = await getUnresolvedAlerts(alertType, alertLevel, parseInt(limit));
      
      res.success({
        alerts,
        count: alerts.length
      });
    } catch (error) {
      logger.error('获取未解决告警失败:', error);
      res.error(500, '获取未解决告警失败');
    }
  }
  
  /**
   * 获取所有告警（包括已解决的）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getAllAlerts(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问告警信息');
      }
      
      const { 
        alertType, 
        alertLevel, 
        resolved, 
        startTime, 
        endTime, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      const client = await pool.connect();
      try {
        let query = `
          SELECT 
            id,
            alert_type,
            alert_level,
            title,
            message,
            details,
            user_id,
            created_at,
            resolved_at,
            resolution,
            resolved_by
          FROM system_alerts
          WHERE 1=1
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
        
        // 添加解决状态筛选
        if (resolved !== undefined) {
          if (resolved === 'true') {
            query += ` AND resolved_at IS NOT NULL`;
          } else {
            query += ` AND resolved_at IS NULL`;
          }
        }
        
        // 添加时间范围筛选
        if (startTime) {
          query += ` AND created_at >= $${paramIndex++}`;
          queryParams.push(startTime);
        }
        
        if (endTime) {
          query += ` AND created_at <= $${paramIndex++}`;
          queryParams.push(endTime);
        }
        
        // 添加排序
        query += ` ORDER BY created_at DESC`;
        
        // 添加分页
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        queryParams.push(parseInt(limit), offset);
        
        const result = await client.query(query, queryParams);
        
        // 获取总数
        let countQuery = `
          SELECT COUNT(*) as total
          FROM system_alerts
          WHERE 1=1
        `;
        
        const countParams = [];
        let countParamIndex = 1;
        
        if (alertType) {
          countQuery += ` AND alert_type = $${countParamIndex++}`;
          countParams.push(alertType);
        }
        
        if (alertLevel) {
          countQuery += ` AND alert_level = $${countParamIndex++}`;
          countParams.push(alertLevel);
        }
        
        if (resolved !== undefined) {
          if (resolved === 'true') {
            countQuery += ` AND resolved_at IS NOT NULL`;
          } else {
            countQuery += ` AND resolved_at IS NULL`;
          }
        }
        
        if (startTime) {
          countQuery += ` AND created_at >= $${countParamIndex++}`;
          countParams.push(startTime);
        }
        
        if (endTime) {
          countQuery += ` AND created_at <= $${countParamIndex++}`;
          countParams.push(endTime);
        }
        
        const countResult = await client.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        
        res.success({
          alerts: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('获取所有告警失败:', error);
      res.error(500, '获取所有告警失败');
    }
  }
  
  /**
   * 解决告警
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async resolveAlert(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权解决告警');
      }
      
      const alertId = req.params.id;
      const { resolution } = req.body;
      
      if (!alertId) {
        return res.error(400, '告警ID不能为空');
      }
      
      const success = await resolveAlert(parseInt(alertId), resolution, req.user.sub);
      
      if (success) {
        res.success({ message: '告警已解决' });
      } else {
        res.error(500, '解决告警失败');
      }
    } catch (error) {
      logger.error('解决告警失败:', error);
      res.error(500, '解决告警失败');
    }
  }
  
  /**
   * 执行系统检查
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async performSystemCheck(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权执行系统检查');
      }
      
      // 异步执行系统检查
      performSystemCheck().catch(error => {
        logger.error('系统检查失败:', error);
      });
      
      res.success({ message: '系统检查已启动，请稍后查看告警信息' });
    } catch (error) {
      logger.error('执行系统检查失败:', error);
      res.error(500, '执行系统检查失败');
    }
  }
  
  /**
   * 获取告警统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getAlertStats(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问告警统计');
      }
      
      const { days = 7 } = req.query;
      const daysInt = parseInt(days);
      
      const client = await pool.connect();
      try {
        // 获取告警级别统计
        const levelStatsResult = await client.query(`
          SELECT 
            alert_level,
            COUNT(*) as count
          FROM system_alerts
          WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
          GROUP BY alert_level
          ORDER BY count DESC
        `);
        
        // 获取告警类型统计
        const typeStatsResult = await client.query(`
          SELECT 
            alert_type,
            COUNT(*) as count
          FROM system_alerts
          WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
          GROUP BY alert_type
          ORDER BY count DESC
        `);
        
        // 获取每日告警数量统计
        const dailyStatsResult = await client.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as count,
            COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as unresolved_count
          FROM system_alerts
          WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `);
        
        // 获取未解决告警数量
        const unresolvedResult = await client.query(`
          SELECT COUNT(*) as count
          FROM system_alerts
          WHERE resolved_at IS NULL
        `);
        
        // 获取今日告警数量
        const todayResult = await client.query(`
          SELECT COUNT(*) as count
          FROM system_alerts
          WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        res.success({
          levelStats: levelStatsResult.rows,
          typeStats: typeStatsResult.rows,
          dailyStats: dailyStatsResult.rows,
          summary: {
            totalUnresolved: parseInt(unresolvedResult.rows[0].count),
            todayTotal: parseInt(todayResult.rows[0].count),
            period: `${daysInt}天`
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('获取告警统计失败:', error);
      res.error(500, '获取告警统计失败');
    }
  }
}

module.exports = new AlertController();