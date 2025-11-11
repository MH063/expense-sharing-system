const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取争议列表
 * @route GET /admin/disputes
 * @access Private (Admin)
 */
async function getDisputes(req, res) {
  try {
    const { page = 1, limit = 10, status, type, user_id, expense_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取争议列表', { page, limit, status, type, user_id, expense_id });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      whereClause += ` AND d.status = $${index++}`;
      values.push(status);
    }

    if (type) {
      whereClause += ` AND d.type = $${index++}`;
      values.push(type);
    }

    if (user_id) {
      whereClause += ` AND d.user_id = $${index++}`;
      values.push(user_id);
    }

    if (expense_id) {
      whereClause += ` AND d.expense_id = $${index++}`;
      values.push(expense_id);
    }

    if (start_date) {
      whereClause += ` AND d.created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND d.created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        d.id,
        d.expense_id,
        d.user_id,
        u.username AS user_name,
        d.title,
        d.description,
        d.type,
        d.status,
        d.assigned_to,
        a.username AS assigned_to_name,
        d.resolution,
        d.created_at,
        d.updated_at,
        d.resolved_at
      FROM disputes d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN admins a ON d.assigned_to = a.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM disputes d
      ${whereClause.replace('d.', '')}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const disputes = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取争议列表成功');
    return res.paginate(disputes, pagination, '获取争议列表成功');
  } catch (error) {
    logger.error('获取争议列表失败:', error);
    return res.error('获取争议列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取争议详情
 * @route GET /admin/disputes/:id
 * @access Private (Admin)
 */
async function getDisputeById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取争议详情', { disputeId: id });

    const query = `
      SELECT 
        d.id,
        d.expense_id,
        d.user_id,
        u.username AS user_name,
        d.title,
        d.description,
        d.type,
        d.status,
        d.assigned_to,
        a.username AS assigned_to_name,
        d.resolution,
        d.created_at,
        d.updated_at,
        d.resolved_at
      FROM disputes d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN admins a ON d.assigned_to = a.id
      WHERE d.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const dispute = result.rows[0];

    logger.info('获取争议详情成功');
    return res.success({ dispute: dispute }, '获取争议详情成功');
  } catch (error) {
    logger.error('获取争议详情失败:', error);
    return res.error('获取争议详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建争议
 * @route POST /admin/disputes
 * @access Private (Admin)
 */
async function createDispute(req, res) {
  try {
    const { expense_id, title, description, type, assigned_to } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建争议`, { adminId, expenseId: expense_id, title });

    // 检查费用是否存在
    const expenseCheckQuery = 'SELECT id FROM expenses WHERE id = $1';
    const expenseCheckResult = await db.query(expenseCheckQuery, [expense_id]);

    if (expenseCheckResult.rowCount === 0) {
      return res.notFound('费用不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 检查处理人是否存在
    if (assigned_to) {
      const handlerCheckQuery = 'SELECT id FROM admins WHERE id = $1';
      const handlerCheckResult = await db.query(handlerCheckQuery, [assigned_to]);

      if (handlerCheckResult.rowCount === 0) {
        return res.notFound('处理人不存在', COMMON_ERRORS.NOT_FOUND);
      }
    }

    const query = `
      INSERT INTO disputes (
        expense_id,
        user_id,
        title,
        description,
        type,
        status,
        assigned_to,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    // 获取费用的用户ID
    const expenseQuery = 'SELECT user_id FROM expenses WHERE id = $1';
    const expenseResult = await db.query(expenseQuery, [expense_id]);
    const userId = expenseResult.rows[0].user_id;

    const values = [
      expense_id,
      userId,
      title,
      description,
      type,
      'open',
      assigned_to || null,
      new Date().toISOString(),
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const dispute = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_dispute',
      'dispute',
      dispute.id,
      JSON.stringify({ title: dispute.title, type: dispute.type }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建争议成功`, { adminId, disputeId: dispute.id });
    return res.success({ dispute: dispute }, '争议创建成功');
  } catch (error) {
    logger.error('创建争议失败:', error);
    return res.error('创建争议失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新争议
 * @route PUT /admin/disputes/:id
 * @access Private (Admin)
 */
async function updateDispute(req, res) {
  try {
    const { id } = req.params;
    const { title, description, type, assigned_to } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新争议`, { adminId, disputeId: id });

    // 检查争议是否存在
    const checkQuery = 'SELECT id FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 检查处理人是否存在
    if (assigned_to) {
      const handlerCheckQuery = 'SELECT id FROM admins WHERE id = $1';
      const handlerCheckResult = await db.query(handlerCheckQuery, [assigned_to]);

      if (handlerCheckResult.rowCount === 0) {
        return res.notFound('处理人不存在', COMMON_ERRORS.NOT_FOUND);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (title !== undefined) {
      updates.push(`title = $${index++}`);
      values.push(title);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (type !== undefined) {
      updates.push(`type = $${index++}`);
      values.push(type);
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${index++}`);
      values.push(assigned_to);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE disputes 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedDispute = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_dispute',
      'dispute',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新争议成功`, { adminId, disputeId: id });
    return res.success({ dispute: updatedDispute }, '争议更新成功');
  } catch (error) {
    logger.error('更新争议失败:', error);
    return res.error('更新争议失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除争议
 * @route DELETE /admin/disputes/:id
 * @access Private (Admin)
 */
async function deleteDispute(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除争议`, { adminId, disputeId: id });

    // 检查争议是否存在
    const checkQuery = 'SELECT id, title FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const dispute = checkResult.rows[0];

    // 开始事务删除争议及相关数据
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 删除争议证据
      const deleteEvidenceQuery = 'DELETE FROM dispute_evidence WHERE dispute_id = $1';
      await client.query(deleteEvidenceQuery, [id]);

      // 删除争议参与者
      const deleteParticipantsQuery = 'DELETE FROM dispute_participants WHERE dispute_id = $1';
      await client.query(deleteParticipantsQuery, [id]);

      // 删除争议处理日志
      const deleteLogsQuery = 'DELETE FROM dispute_handling_logs WHERE dispute_id = $1';
      await client.query(deleteLogsQuery, [id]);

      // 删除争议
      const deleteDisputeQuery = 'DELETE FROM disputes WHERE id = $1 RETURNING id';
      const deleteResult = await client.query(deleteDisputeQuery, [id]);

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
      }

      await client.query('COMMIT');

      // 记录操作日志
      const logQuery = `
        INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await db.query(logQuery, [
        adminId,
        'delete_dispute',
        'dispute',
        id,
        JSON.stringify({ title: dispute.title }),
        req.ip,
        req.get('User-Agent') || ''
      ]);

      logger.info(`管理员 ${adminName} 删除争议成功`, { adminId, disputeId: id });
      return res.success(null, '争议删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('删除争议失败:', error);
    return res.error('删除争议失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 分配处理人
 * @route POST /admin/disputes/:id/assign
 * @access Private (Admin)
 */
async function assignDispute(req, res) {
  try {
    const { id } = req.params;
    const { assigned_to, notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 分配争议处理人`, { adminId, disputeId: id, assignedTo: assigned_to });

    // 检查争议是否存在
    const checkQuery = 'SELECT id, status FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const dispute = checkResult.rows[0];

    // 检查争议状态是否可以分配
    if (dispute.status === 'resolved') {
      return res.clientError('争议已解决，无法分配处理人', ADMIN_ERRORS.DISPUTE_ALREADY_RESOLVED);
    }

    // 检查处理人是否存在
    const handlerCheckQuery = 'SELECT id, username FROM admins WHERE id = $1';
    const handlerCheckResult = await db.query(handlerCheckQuery, [assigned_to]);

    if (handlerCheckResult.rowCount === 0) {
      return res.notFound('处理人不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const handler = handlerCheckResult.rows[0];

    // 更新争议处理人
    const updateQuery = `
      UPDATE disputes 
      SET assigned_to = $1, updated_at = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      assigned_to,
      new Date().toISOString(),
      id
    ]);

    const updatedDispute = result.rows[0];

    // 记录处理日志
    const logQuery = `
      INSERT INTO dispute_handling_logs (dispute_id, handler_id, action, notes, handled_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await db.query(logQuery, [
      id,
      adminId,
      'assign_handler',
      notes || '',
      new Date().toISOString()
    ]);

    // 记录操作日志
    const operationLogQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(operationLogQuery, [
      adminId,
      'assign_dispute_handler',
      'dispute',
      id,
      JSON.stringify({ handler_id: assigned_to, handler_name: handler.username }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 分配争议处理人成功`, { adminId, disputeId: id, assignedTo: assigned_to });
    return res.success({ dispute: updatedDispute }, '争议处理人分配成功');
  } catch (error) {
    logger.error('分配争议处理人失败:', error);
    return res.error('分配争议处理人失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 处理争议
 * @route POST /admin/disputes/:id/handle
 * @access Private (Admin)
 */
async function handleDispute(req, res) {
  try {
    const { id } = req.params;
    const { action, resolution, notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 处理争议`, { adminId, disputeId: id, action });

    // 检查争议是否存在
    const checkQuery = 'SELECT id, status FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const dispute = checkResult.rows[0];

    // 检查争议状态是否可以处理
    if (dispute.status === 'resolved') {
      return res.clientError('争议已解决', ADMIN_ERRORS.DISPUTE_ALREADY_RESOLVED);
    }

    // 更新争议状态
    let newStatus = dispute.status;
    if (action === 'accept' || action === 'reject') {
      newStatus = 'resolved';
    }

    const updateQuery = `
      UPDATE disputes 
      SET 
        status = $1,
        resolution = $2,
        resolved_at = $3,
        updated_at = $4
      WHERE id = $5
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      newStatus,
      resolution,
      newStatus === 'resolved' ? new Date().toISOString() : null,
      new Date().toISOString(),
      id
    ]);

    const updatedDispute = result.rows[0];

    // 记录处理日志
    const logQuery = `
      INSERT INTO dispute_handling_logs (dispute_id, handler_id, action, resolution, notes, handled_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await db.query(logQuery, [
      id,
      adminId,
      action,
      resolution,
      notes || '',
      new Date().toISOString()
    ]);

    // 记录操作日志
    const operationLogQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(operationLogQuery, [
      adminId,
      'handle_dispute',
      'dispute',
      id,
      JSON.stringify({ action: action, resolution: resolution }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 处理争议成功`, { adminId, disputeId: id, action });
    return res.success({ dispute: updatedDispute }, '争议处理成功');
  } catch (error) {
    logger.error('处理争议失败:', error);
    return res.error('处理争议失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 解决争议
 * @route POST /admin/disputes/:id/resolve
 * @access Private (Admin)
 */
async function resolveDispute(req, res) {
  try {
    const { id } = req.params;
    const { resolution, action, notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 解决争议`, { adminId, disputeId: id, action });

    // 检查争议是否存在
    const checkQuery = 'SELECT id, status FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const dispute = checkResult.rows[0];

    // 检查争议状态是否可以解决
    if (dispute.status === 'resolved') {
      return res.clientError('争议已解决', ADMIN_ERRORS.DISPUTE_ALREADY_RESOLVED);
    }

    // 更新争议状态为已解决
    const updateQuery = `
      UPDATE disputes 
      SET 
        status = 'resolved',
        resolution = $1,
        resolved_at = $2,
        updated_at = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      resolution,
      new Date().toISOString(),
      new Date().toISOString(),
      id
    ]);

    const updatedDispute = result.rows[0];

    // 记录处理日志
    const logQuery = `
      INSERT INTO dispute_handling_logs (dispute_id, handler_id, action, resolution, notes, handled_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await db.query(logQuery, [
      id,
      adminId,
      action,
      resolution,
      notes || '',
      new Date().toISOString()
    ]);

    // 记录操作日志
    const operationLogQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(operationLogQuery, [
      adminId,
      'resolve_dispute',
      'dispute',
      id,
      JSON.stringify({ action: action, resolution: resolution }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 解决争议成功`, { adminId, disputeId: id });
    return res.success({ dispute: updatedDispute }, '争议解决成功');
  } catch (error) {
    logger.error('解决争议失败:', error);
    return res.error('解决争议失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取可分配的处理人列表
 * @route GET /admin/disputes/handlers
 * @access Private (Admin)
 */
async function getDisputeHandlers(req, res) {
  try {
    logger.info('管理员获取可分配的处理人列表');

    const query = `
      SELECT 
        id,
        username,
        email,
        role,
        status,
        created_at
      FROM admins
      WHERE status = 'active'
      ORDER BY username
    `;

    const result = await db.query(query);
    const handlers = result.rows;

    logger.info('获取可分配的处理人列表成功');
    return res.success({ handlers: handlers }, '获取可分配的处理人列表成功');
  } catch (error) {
    logger.error('获取可分配的处理人列表失败:', error);
    return res.error('获取可分配的处理人列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取争议统计数据
 * @route GET /admin/disputes/stats
 * @access Private (Admin)
 */
async function getDisputeStats(req, res) {
  try {
    const { start_date, end_date, group_by = 'status' } = req.query;
    
    logger.info('管理员获取争议统计数据', { start_date, end_date, group_by });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (start_date) {
      whereClause += ` AND created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${index++}`;
      values.push(end_date);
    }

    let groupByField = 'status';
    switch (group_by) {
      case 'day':
        groupByField = 'DATE(created_at)';
        break;
      case 'week':
        groupByField = 'DATE_TRUNC(\'week\', created_at)';
        break;
      case 'month':
        groupByField = 'DATE_TRUNC(\'month\', created_at)';
        break;
      case 'status':
        groupByField = 'status';
        break;
      case 'type':
        groupByField = 'type';
        break;
    }

    const query = `
      SELECT 
        ${groupByField} AS group_field,
        COUNT(*) AS count,
        COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_count
      FROM disputes
      WHERE 1=1 ${whereClause}
      GROUP BY ${groupByField}
      ORDER BY ${groupByField}
    `;

    const result = await db.query(query, values);
    const stats = result.rows;

    // 获取总计
    const totalQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_total,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved_total,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_total
      FROM disputes
      WHERE 1=1 ${whereClause}
    `;

    const totalResult = await db.query(totalQuery, values);
    const totalStats = totalResult.rows[0];

    logger.info('获取争议统计数据成功');
    return res.success({ 
      stats: stats,
      total: totalStats
    }, '获取争议统计数据成功');
  } catch (error) {
    logger.error('获取争议统计数据失败:', error);
    return res.error('获取争议统计数据失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取争议参与者
 * @route GET /admin/disputes/:id/participants
 * @access Private (Admin)
 */
async function getDisputeParticipants(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取争议参与者', { disputeId: id });

    // 检查争议是否存在
    const checkQuery = 'SELECT id FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      SELECT 
        dp.id,
        dp.user_id,
        u.username AS user_name,
        dp.role,
        dp.joined_at
      FROM dispute_participants dp
      LEFT JOIN users u ON dp.user_id = u.id
      WHERE dp.dispute_id = $1
      ORDER BY dp.joined_at DESC
    `;

    const result = await db.query(query, [id]);
    const participants = result.rows;

    logger.info('获取争议参与者成功');
    return res.success({ participants: participants }, '获取争议参与者成功');
  } catch (error) {
    logger.error('获取争议参与者失败:', error);
    return res.error('获取争议参与者失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 添加争议参与者
 * @route POST /admin/disputes/:id/participants
 * @access Private (Admin)
 */
async function addDisputeParticipant(req, res) {
  try {
    const { id } = req.params;
    const { user_id, role } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 添加争议参与者`, { adminId, disputeId: id, userId: user_id, role });

    // 检查争议是否存在
    const disputeCheckQuery = 'SELECT id FROM disputes WHERE id = $1';
    const disputeCheckResult = await db.query(disputeCheckQuery, [id]);

    if (disputeCheckResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 检查用户是否存在
    const userCheckQuery = 'SELECT id, username FROM users WHERE id = $1';
    const userCheckResult = await db.query(userCheckQuery, [user_id]);

    if (userCheckResult.rowCount === 0) {
      return res.notFound('用户不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const user = userCheckResult.rows[0];

    // 检查参与者是否已存在
    const participantCheckQuery = `
      SELECT id FROM dispute_participants 
      WHERE dispute_id = $1 AND user_id = $2
    `;
    const participantCheckResult = await db.query(participantCheckQuery, [id, user_id]);

    if (participantCheckResult.rowCount > 0) {
      return res.conflict('用户已是争议参与者', ADMIN_ERRORS.DISPUTE_PARTICIPANT_EXISTS);
    }

    const query = `
      INSERT INTO dispute_participants (
        dispute_id,
        user_id,
        role,
        joined_at
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      user_id,
      role,
      new Date().toISOString()
    ]);

    const participant = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'add_dispute_participant',
      'dispute',
      id,
      JSON.stringify({ user_id: user_id, user_name: user.username, role: role }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 添加争议参与者成功`, { adminId, disputeId: id, userId: user_id });
    return res.success({ participant: participant }, '争议参与者添加成功');
  } catch (error) {
    logger.error('添加争议参与者失败:', error);
    return res.error('添加争议参与者失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 移除争议参与者
 * @route DELETE /admin/disputes/:id/participants/:userId
 * @access Private (Admin)
 */
async function removeDisputeParticipant(req, res) {
  try {
    const { id, userId } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 移除争议参与者`, { adminId, disputeId: id, userId: userId });

    // 检查争议是否存在
    const disputeCheckQuery = 'SELECT id FROM disputes WHERE id = $1';
    const disputeCheckResult = await db.query(disputeCheckQuery, [id]);

    if (disputeCheckResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 检查用户是否存在
    const userCheckQuery = 'SELECT id, username FROM users WHERE id = $1';
    const userCheckResult = await db.query(userCheckQuery, [userId]);

    if (userCheckResult.rowCount === 0) {
      return res.notFound('用户不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const user = userCheckResult.rows[0];

    // 检查参与者是否存在
    const participantCheckQuery = `
      SELECT id FROM dispute_participants 
      WHERE dispute_id = $1 AND user_id = $2
    `;
    const participantCheckResult = await db.query(participantCheckQuery, [id, userId]);

    if (participantCheckResult.rowCount === 0) {
      return res.notFound('用户不是争议参与者', ADMIN_ERRORS.DISPUTE_PARTICIPANT_NOT_FOUND);
    }

    // 删除参与者
    const deleteQuery = `
      DELETE FROM dispute_participants 
      WHERE dispute_id = $1 AND user_id = $2
      RETURNING id
    `;
    const deleteResult = await db.query(deleteQuery, [id, userId]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('用户不是争议参与者', ADMIN_ERRORS.DISPUTE_PARTICIPANT_NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'remove_dispute_participant',
      'dispute',
      id,
      JSON.stringify({ user_id: userId, user_name: user.username }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 移除争议参与者成功`, { adminId, disputeId: id, userId: userId });
    return res.success(null, '争议参与者移除成功');
  } catch (error) {
    logger.error('移除争议参与者失败:', error);
    return res.error('移除争议参与者失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取争议证据
 * @route GET /admin/disputes/:id/evidence
 * @access Private (Admin)
 */
async function getDisputeEvidence(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取争议证据', { disputeId: id });

    // 检查争议是否存在
    const checkQuery = 'SELECT id FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      SELECT 
        id,
        dispute_id,
        file_url,
        file_name,
        file_type,
        file_size,
        description,
        uploaded_by,
        uploaded_at
      FROM dispute_evidence
      WHERE dispute_id = $1
      ORDER BY uploaded_at DESC
    `;

    const result = await db.query(query, [id]);
    const evidence = result.rows;

    logger.info('获取争议证据成功');
    return res.success({ evidence: evidence }, '获取争议证据成功');
  } catch (error) {
    logger.error('获取争议证据失败:', error);
    return res.error('获取争议证据失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 上传争议证据
 * @route POST /admin/disputes/:id/evidence
 * @access Private (Admin)
 */
async function uploadDisputeEvidence(req, res) {
  try {
    const { id } = req.params;
    const { file_url, file_name, file_type, description } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 上传争议证据`, { adminId, disputeId: id, fileName: file_name });

    // 检查争议是否存在
    const checkQuery = 'SELECT id FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      INSERT INTO dispute_evidence (
        dispute_id,
        file_url,
        file_name,
        file_type,
        file_size,
        description,
        uploaded_by,
        uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    // 获取文件大小（这里简化处理，实际应该从文件信息中获取）
    const fileSize = 0;

    const values = [
      id,
      file_url,
      file_name,
      file_type,
      fileSize,
      description || '',
      adminId,
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const evidence = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'upload_dispute_evidence',
      'dispute',
      id,
      JSON.stringify({ file_name: file_name, file_type: file_type }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 上传争议证据成功`, { adminId, disputeId: id, evidenceId: evidence.id });
    return res.success({ evidence: evidence }, '争议证据上传成功');
  } catch (error) {
    logger.error('上传争议证据失败:', error);
    return res.error('上传争议证据失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除争议证据
 * @route DELETE /admin/disputes/evidence/:evidenceId
 * @access Private (Admin)
 */
async function deleteDisputeEvidence(req, res) {
  try {
    const { evidenceId } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除争议证据`, { adminId, evidenceId: evidenceId });

    // 检查证据是否存在
    const checkQuery = `
      SELECT id, dispute_id, file_name 
      FROM dispute_evidence 
      WHERE id = $1
    `;
    const checkResult = await db.query(checkQuery, [evidenceId]);

    if (checkResult.rowCount === 0) {
      return res.notFound('证据不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const evidence = checkResult.rows[0];

    // 删除证据
    const deleteQuery = `
      DELETE FROM dispute_evidence 
      WHERE id = $1
      RETURNING id
    `;
    const deleteResult = await db.query(deleteQuery, [evidenceId]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('证据不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_dispute_evidence',
      'dispute',
      evidence.dispute_id,
      JSON.stringify({ file_name: evidence.file_name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除争议证据成功`, { adminId, evidenceId: evidenceId });
    return res.success(null, '争议证据删除成功');
  } catch (error) {
    logger.error('删除争议证据失败:', error);
    return res.error('删除争议证据失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取争议处理日志
 * @route GET /admin/disputes/:id/handling-logs
 * @access Private (Admin)
 */
async function getDisputeHandlingLogs(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取争议处理日志', { disputeId: id });

    // 检查争议是否存在
    const checkQuery = 'SELECT id FROM disputes WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('争议不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      SELECT 
        id,
        dispute_id,
        handler_id,
        a.username AS handler_name,
        action,
        resolution,
        notes,
        handled_at
      FROM dispute_handling_logs dhl
      LEFT JOIN admins a ON dhl.handler_id = a.id
      WHERE dispute_id = $1
      ORDER BY handled_at DESC
    `;

    const result = await db.query(query, [id]);
    const logs = result.rows;

    logger.info('获取争议处理日志成功');
    return res.success({ logs: logs }, '获取争议处理日志成功');
  } catch (error) {
    logger.error('获取争议处理日志失败:', error);
    return res.error('获取争议处理日志失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getDisputes,
  getDisputeById,
  createDispute,
  updateDispute,
  deleteDispute,
  assignDispute,
  handleDispute,
  resolveDispute,
  getDisputeHandlers,
  getDisputeStats,
  getDisputeParticipants,
  addDisputeParticipant,
  removeDisputeParticipant,
  getDisputeEvidence,
  uploadDisputeEvidence,
  deleteDisputeEvidence,
  getDisputeHandlingLogs
};