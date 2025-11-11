const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取操作日志列表
 * @route GET /admin/monitoring/operation-logs
 * @access Private (Admin)
 */
async function getOperationLogs(req, res) {
  try {
    const { page = 1, limit = 10, user_id, action, resource, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取操作日志列表', { page, limit, user_id, action, resource });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (user_id) {
      whereClause += ` AND user_id = $${index++}`;
      values.push(user_id);
    }

    if (action) {
      whereClause += ` AND action ILIKE $${index++}`;
      values.push(`%${action}%`);
    }

    if (resource) {
      whereClause += ` AND resource ILIKE $${index++}`;
      values.push(`%${resource}%`);
    }

    if (start_date) {
      whereClause += ` AND created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        user_id,
        username,
        action,
        resource,
        resource_id,
        details,
        ip_address,
        user_agent,
        created_at
      FROM operation_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM operation_logs
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const logs = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取操作日志列表成功');
    return res.paginate(logs, pagination, '获取操作日志列表成功');
  } catch (error) {
    logger.error('获取操作日志列表失败:', error);
    return res.error('获取操作日志列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取数据变更审计日志
 * @route GET /admin/monitoring/data-change-audits
 * @access Private (Admin)
 */
async function getDataChangeAudits(req, res) {
  try {
    const { page = 1, limit = 10, table_name, operation, user_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取数据变更审计日志', { page, limit, table_name, operation, user_id });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (table_name) {
      whereClause += ` AND table_name ILIKE $${index++}`;
      values.push(`%${table_name}%`);
    }

    if (operation) {
      whereClause += ` AND operation = $${index++}`;
      values.push(operation);
    }

    if (user_id) {
      whereClause += ` AND user_id = $${index++}`;
      values.push(user_id);
    }

    if (start_date) {
      whereClause += ` AND changed_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND changed_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        table_name,
        record_id,
        operation,
        user_id,
        username,
        old_values,
        new_values,
        changed_at
      FROM data_change_audits
      ${whereClause}
      ORDER BY changed_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM data_change_audits
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const audits = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取数据变更审计日志成功');
    return res.paginate(audits, pagination, '获取数据变更审计日志成功');
  } catch (error) {
    logger.error('获取数据变更审计日志失败:', error);
    return res.error('获取数据变更审计日志失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取用户活动日志
 * @route GET /admin/monitoring/user-activity-logs
 * @access Private (Admin)
 */
async function getUserActivityLogs(req, res) {
  try {
    const { page = 1, limit = 10, user_id, activity_type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取用户活动日志', { page, limit, user_id, activity_type });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (user_id) {
      whereClause += ` AND user_id = $${index++}`;
      values.push(user_id);
    }

    if (activity_type) {
      whereClause += ` AND activity_type ILIKE $${index++}`;
      values.push(`%${activity_type}%`);
    }

    if (start_date) {
      whereClause += ` AND created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        user_id,
        username,
        activity_type,
        activity_details,
        ip_address,
        user_agent,
        created_at
      FROM user_activity_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM user_activity_logs
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const logs = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取用户活动日志成功');
    return res.paginate(logs, pagination, '获取用户活动日志成功');
  } catch (error) {
    logger.error('获取用户活动日志失败:', error);
    return res.error('获取用户活动日志失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取用户状态变更日志
 * @route GET /admin/monitoring/user-status-logs
 * @access Private (Admin)
 */
async function getUserStatusLogs(req, res) {
  try {
    const { page = 1, limit = 10, user_id, status_from, status_to, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取用户状态变更日志', { page, limit, user_id, status_from, status_to });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (user_id) {
      whereClause += ` AND user_id = $${index++}`;
      values.push(user_id);
    }

    if (status_from) {
      whereClause += ` AND status_from ILIKE $${index++}`;
      values.push(`%${status_from}%`);
    }

    if (status_to) {
      whereClause += ` AND status_to ILIKE $${index++}`;
      values.push(`%${status_to}%`);
    }

    if (start_date) {
      whereClause += ` AND changed_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND changed_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        user_id,
        username,
        status_from,
        status_to,
        reason,
        changed_by,
        changed_at
      FROM user_status_logs
      ${whereClause}
      ORDER BY changed_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM user_status_logs
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const logs = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取用户状态变更日志成功');
    return res.paginate(logs, pagination, '获取用户状态变更日志成功');
  } catch (error) {
    logger.error('获取用户状态变更日志失败:', error);
    return res.error('获取用户状态变更日志失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取系统错误日志
 * @route GET /admin/monitoring/system-error-logs
 * @access Private (Admin)
 */
async function getSystemErrorLogs(req, res) {
  try {
    const { page = 1, limit = 10, error_level, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取系统错误日志', { page, limit, error_level });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (error_level) {
      whereClause += ` AND error_level = $${index++}`;
      values.push(error_level);
    }

    if (start_date) {
      whereClause += ` AND logged_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND logged_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        error_level,
        error_code,
        error_message,
        error_details,
        stack_trace,
        logged_at
      FROM system_error_logs
      ${whereClause}
      ORDER BY logged_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM system_error_logs
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const logs = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取系统错误日志成功');
    return res.paginate(logs, pagination, '获取系统错误日志成功');
  } catch (error) {
    logger.error('获取系统错误日志失败:', error);
    return res.error('获取系统错误日志失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取系统审计日志
 * @route GET /admin/monitoring/system-audit-logs
 * @access Private (Admin)
 */
async function getSystemAuditLogs(req, res) {
  try {
    const { page = 1, limit = 10, audit_type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取系统审计日志', { page, limit, audit_type });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (audit_type) {
      whereClause += ` AND audit_type ILIKE $${index++}`;
      values.push(`%${audit_type}%`);
    }

    if (start_date) {
      whereClause += ` AND created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        audit_type,
        audit_action,
        audit_details,
        created_by,
        created_at
      FROM system_audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM system_audit_logs
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const logs = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取系统审计日志成功');
    return res.paginate(logs, pagination, '获取系统审计日志成功');
  } catch (error) {
    logger.error('获取系统审计日志失败:', error);
    return res.error('获取系统审计日志失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取告警列表
 * @route GET /admin/monitoring/alerts
 * @access Private (Admin)
 */
async function getAlerts(req, res) {
  try {
    const { page = 1, limit = 10, status, severity, type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取告警列表', { page, limit, status, severity, type });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      whereClause += ` AND alert_status = $${index++}`;
      values.push(status);
    }

    if (severity) {
      whereClause += ` AND alert_severity = $${index++}`;
      values.push(severity);
    }

    if (type) {
      whereClause += ` AND alert_type ILIKE $${index++}`;
      values.push(`%${type}%`);
    }

    if (start_date) {
      whereClause += ` AND triggered_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND triggered_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        rule_id,
        alert_title,
        alert_message,
        alert_severity,
        alert_status,
        alert_data,
        triggered_at,
        acknowledged_at,
        resolved_at
      FROM system_alerts
      ${whereClause}
      ORDER BY triggered_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM system_alerts
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const alerts = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取告警列表成功');
    return res.paginate(alerts, pagination, '获取告警列表成功');
  } catch (error) {
    logger.error('获取告警列表失败:', error);
    return res.error('获取告警列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取告警详情
 * @route GET /admin/monitoring/alerts/:id
 * @access Private (Admin)
 */
async function getAlertById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取告警详情', { alertId: id });

    const query = `
      SELECT 
        id,
        rule_id,
        alert_title,
        alert_message,
        alert_severity,
        alert_status,
        alert_data,
        triggered_at,
        acknowledged_at,
        acknowledged_by,
        resolved_at,
        resolved_by
      FROM system_alerts
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('告警不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const alert = result.rows[0];

    logger.info('获取告警详情成功');
    return res.success({ alert: alert }, '获取告警详情成功');
  } catch (error) {
    logger.error('获取告警详情失败:', error);
    return res.error('获取告警详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 确认告警
 * @route POST /admin/monitoring/alerts/:id/acknowledge
 * @access Private (Admin)
 */
async function acknowledgeAlert(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 确认告警`, { adminId, alertId: id });

    // 检查告警是否存在
    const checkQuery = 'SELECT id, alert_status FROM system_alerts WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('告警不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const alert = checkResult.rows[0];

    // 检查告警状态是否可以确认
    if (alert.alert_status === 'resolved') {
      return res.clientError('告警已解决，无法确认', ADMIN_ERRORS.ALERT_ALREADY_RESOLVED);
    }

    // 更新告警状态为已确认
    const updateQuery = `
      UPDATE system_alerts 
      SET 
        alert_status = 'acknowledged',
        acknowledged_at = $1,
        acknowledged_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      new Date().toISOString(),
      adminId,
      id
    ]);

    const updatedAlert = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'acknowledge_alert',
      'alert',
      id,
      JSON.stringify({ notes: notes }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 确认告警成功`, { adminId, alertId: id });
    return res.success({ alert: updatedAlert }, '告警确认成功');
  } catch (error) {
    logger.error('确认告警失败:', error);
    return res.error('确认告警失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 解决告警
 * @route POST /admin/monitoring/alerts/:id/resolve
 * @access Private (Admin)
 */
async function resolveAlert(req, res) {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 解决告警`, { adminId, alertId: id });

    // 检查告警是否存在
    const checkQuery = 'SELECT id, alert_status FROM system_alerts WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('告警不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const alert = checkResult.rows[0];

    // 检查告警状态是否可以解决
    if (alert.alert_status === 'resolved') {
      return res.clientError('告警已解决', ADMIN_ERRORS.ALERT_ALREADY_RESOLVED);
    }

    // 更新告警状态为已解决
    const updateQuery = `
      UPDATE system_alerts 
      SET 
        alert_status = 'resolved',
        resolved_at = $1,
        resolved_by = $2,
        alert_data = $3
      WHERE id = $4
      RETURNING *
    `;

    const alertData = alert.alert_data || {};
    alertData.resolution = resolution;
    alertData.notes = notes;

    const result = await db.query(updateQuery, [
      new Date().toISOString(),
      adminId,
      JSON.stringify(alertData),
      id
    ]);

    const updatedAlert = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'resolve_alert',
      'alert',
      id,
      JSON.stringify({ resolution: resolution, notes: notes }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 解决告警成功`, { adminId, alertId: id });
    return res.success({ alert: updatedAlert }, '告警解决成功');
  } catch (error) {
    logger.error('解决告警失败:', error);
    return res.error('解决告警失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取告警规则列表
 * @route GET /admin/monitoring/alert-rules
 * @access Private (Admin)
 */
async function getAlertRules(req, res) {
  try {
    const { page = 1, limit = 10, enabled, type } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取告警规则列表', { page, limit, enabled, type });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (enabled !== undefined) {
      whereClause += ` AND is_active = $${index++}`;
      values.push(enabled === 'true');
    }

    if (type) {
      whereClause += ` AND rule_type ILIKE $${index++}`;
      values.push(`%${type}%`);
    }

    const query = `
      SELECT 
        id,
        rule_name,
        rule_type,
        rule_condition,
        rule_threshold,
        rule_severity,
        is_active,
        notification_channels,
        created_at,
        updated_at
      FROM system_alert_rules
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM system_alert_rules
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const rules = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取告警规则列表成功');
    return res.paginate(rules, pagination, '获取告警规则列表成功');
  } catch (error) {
    logger.error('获取告警规则列表失败:', error);
    return res.error('获取告警规则列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建告警规则
 * @route POST /admin/monitoring/alert-rules
 * @access Private (Admin)
 */
async function createAlertRule(req, res) {
  try {
    const { name, type, condition, threshold, severity, enabled, description, notification_channels } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建告警规则`, { adminId, ruleName: name });

    // 检查规则名称是否已存在
    const checkQuery = 'SELECT id FROM system_alert_rules WHERE rule_name = $1';
    const checkResult = await db.query(checkQuery, [name]);

    if (checkResult.rowCount > 0) {
      return res.conflict('告警规则名称已存在', ADMIN_ERRORS.ALERT_RULE_EXISTS);
    }

    const query = `
      INSERT INTO system_alert_rules (
        rule_name, 
        rule_type, 
        rule_condition, 
        rule_threshold, 
        rule_severity, 
        is_active, 
        notification_channels, 
        created_by, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      name,
      type,
      JSON.stringify(condition),
      threshold,
      severity,
      enabled !== undefined ? enabled : true,
      JSON.stringify(notification_channels || []),
      adminId,
      new Date().toISOString(),
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const rule = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_alert_rule',
      'alert_rule',
      rule.id,
      JSON.stringify({ name: rule.rule_name, type: rule.rule_type }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建告警规则成功`, { adminId, ruleId: rule.id });
    return res.success({ rule: rule }, '告警规则创建成功');
  } catch (error) {
    logger.error('创建告警规则失败:', error);
    return res.error('创建告警规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新告警规则
 * @route PUT /admin/monitoring/alert-rules/:id
 * @access Private (Admin)
 */
async function updateAlertRule(req, res) {
  try {
    const { id } = req.params;
    const { name, type, condition, threshold, severity, enabled, description, notification_channels } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新告警规则`, { adminId, ruleId: id });

    // 检查规则是否存在
    const checkQuery = 'SELECT id, rule_name FROM system_alert_rules WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('告警规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingRule = checkResult.rows[0];

    // 如果提供了新的规则名称，检查是否已存在
    if (name && name !== existingRule.rule_name) {
      const nameCheckQuery = 'SELECT id FROM system_alert_rules WHERE rule_name = $1 AND id != $2';
      const nameCheckResult = await db.query(nameCheckQuery, [name, id]);

      if (nameCheckResult.rowCount > 0) {
        return res.conflict('告警规则名称已存在', ADMIN_ERRORS.ALERT_RULE_EXISTS);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`rule_name = $${index++}`);
      values.push(name);
    }

    if (type !== undefined) {
      updates.push(`rule_type = $${index++}`);
      values.push(type);
    }

    if (condition !== undefined) {
      updates.push(`rule_condition = $${index++}`);
      values.push(JSON.stringify(condition));
    }

    if (threshold !== undefined) {
      updates.push(`rule_threshold = $${index++}`);
      values.push(threshold);
    }

    if (severity !== undefined) {
      updates.push(`rule_severity = $${index++}`);
      values.push(severity);
    }

    if (enabled !== undefined) {
      updates.push(`is_active = $${index++}`);
      values.push(enabled);
    }

    if (notification_channels !== undefined) {
      updates.push(`notification_channels = $${index++}`);
      values.push(JSON.stringify(notification_channels));
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE system_alert_rules 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedRule = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_alert_rule',
      'alert_rule',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新告警规则成功`, { adminId, ruleId: id });
    return res.success({ rule: updatedRule }, '告警规则更新成功');
  } catch (error) {
    logger.error('更新告警规则失败:', error);
    return res.error('更新告警规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除告警规则
 * @route DELETE /admin/monitoring/alert-rules/:id
 * @access Private (Admin)
 */
async function deleteAlertRule(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除告警规则`, { adminId, ruleId: id });

    // 检查规则是否存在
    const checkQuery = 'SELECT id, rule_name FROM system_alert_rules WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('告警规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const rule = checkResult.rows[0];

    // 检查是否有告警使用此规则
    const alertCheckQuery = 'SELECT COUNT(*) AS count FROM system_alerts WHERE rule_id = $1';
    const alertCheckResult = await db.query(alertCheckQuery, [id]);
    
    if (parseInt(alertCheckResult.rows[0].count) > 0) {
      return res.conflict('该规则已被告警使用，不能删除', ADMIN_ERRORS.ALERT_RULE_IN_USE);
    }

    // 删除规则
    const deleteQuery = 'DELETE FROM system_alert_rules WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('告警规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_alert_rule',
      'alert_rule',
      id,
      JSON.stringify({ name: rule.rule_name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除告警规则成功`, { adminId, ruleId: id });
    return res.success(null, '告警规则删除成功');
  } catch (error) {
    logger.error('删除告警规则失败:', error);
    return res.error('删除告警规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getOperationLogs,
  getDataChangeAudits,
  getUserActivityLogs,
  getUserStatusLogs,
  getSystemErrorLogs,
  getSystemAuditLogs,
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule
};