const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取费用类型列表
 * @route GET /admin/expense-types
 * @access Private (Admin)
 */
async function getExpenseTypes(req, res) {
  try {
    const { page = 1, limit = 10, name } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取费用类型列表', { page, limit, name });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (name) {
      whereClause = 'WHERE name ILIKE $1';
      values.push(`%${name}%`);
    }

    const query = `
      SELECT 
        id,
        name,
        description,
        default_split_method,
        icon,
        created_at,
        updated_at
      FROM expense_types
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM expense_types
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const expenseTypes = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取费用类型列表成功');
    return res.paginate(expenseTypes, pagination, '获取费用类型列表成功');
  } catch (error) {
    logger.error('获取费用类型列表失败:', error);
    return res.error('获取费用类型列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取费用类型详情
 * @route GET /admin/expense-types/:id
 * @access Private (Admin)
 */
async function getExpenseTypeById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取费用类型详情', { expenseTypeId: id });

    const query = `
      SELECT 
        id,
        name,
        description,
        default_split_method,
        icon,
        created_at,
        updated_at
      FROM expense_types
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('费用类型不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const expenseType = result.rows[0];

    logger.info('获取费用类型详情成功');
    return res.success({ expense_type: expenseType }, '获取费用类型详情成功');
  } catch (error) {
    logger.error('获取费用类型详情失败:', error);
    return res.error('获取费用类型详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建费用类型
 * @route POST /admin/expense-types
 * @access Private (Admin)
 */
async function createExpenseType(req, res) {
  try {
    const { name, description, default_split_method, icon } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建费用类型`, { adminId, expenseTypeName: name });

    // 检查费用类型名称是否已存在
    const checkQuery = 'SELECT id FROM expense_types WHERE name = $1';
    const checkResult = await db.query(checkQuery, [name]);

    if (checkResult.rowCount > 0) {
      return res.conflict('费用类型名称已存在', ADMIN_ERRORS.EXPENSE_TYPE_EXISTS);
    }

    const query = `
      INSERT INTO expense_types (
        name,
        description,
        default_split_method,
        icon,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      name,
      description || '',
      default_split_method || 'equal',
      icon || '',
      new Date().toISOString(),
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const expenseType = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_expense_type',
      'expense_type',
      expenseType.id,
      JSON.stringify({ name: expenseType.name, default_split_method: expenseType.default_split_method }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建费用类型成功`, { adminId, expenseTypeId: expenseType.id });
    return res.success({ expense_type: expenseType }, '费用类型创建成功');
  } catch (error) {
    logger.error('创建费用类型失败:', error);
    return res.error('创建费用类型失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新费用类型
 * @route PUT /admin/expense-types/:id
 * @access Private (Admin)
 */
async function updateExpenseType(req, res) {
  try {
    const { id } = req.params;
    const { name, description, default_split_method, icon } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新费用类型`, { adminId, expenseTypeId: id });

    // 检查费用类型是否存在
    const checkQuery = 'SELECT id, name FROM expense_types WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('费用类型不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingExpenseType = checkResult.rows[0];

    // 如果提供了新的费用类型名称，检查是否已存在
    if (name && name !== existingExpenseType.name) {
      const nameCheckQuery = 'SELECT id FROM expense_types WHERE name = $1 AND id != $2';
      const nameCheckResult = await db.query(nameCheckQuery, [name, id]);

      if (nameCheckResult.rowCount > 0) {
        return res.conflict('费用类型名称已存在', ADMIN_ERRORS.EXPENSE_TYPE_EXISTS);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (default_split_method !== undefined) {
      updates.push(`default_split_method = $${index++}`);
      values.push(default_split_method);
    }

    if (icon !== undefined) {
      updates.push(`icon = $${index++}`);
      values.push(icon);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE expense_types 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedExpenseType = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_expense_type',
      'expense_type',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新费用类型成功`, { adminId, expenseTypeId: id });
    return res.success({ expense_type: updatedExpenseType }, '费用类型更新成功');
  } catch (error) {
    logger.error('更新费用类型失败:', error);
    return res.error('更新费用类型失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除费用类型
 * @route DELETE /admin/expense-types/:id
 * @access Private (Admin)
 */
async function deleteExpenseType(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除费用类型`, { adminId, expenseTypeId: id });

    // 检查费用类型是否存在
    const checkQuery = 'SELECT id, name FROM expense_types WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('费用类型不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const expenseType = checkResult.rows[0];

    // 检查是否有特殊支付规则使用此费用类型
    const ruleCheckQuery = 'SELECT COUNT(*) AS count FROM special_payment_rules WHERE expense_type_id = $1';
    const ruleCheckResult = await db.query(ruleCheckQuery, [id]);
    
    if (parseInt(ruleCheckResult.rows[0].count) > 0) {
      return res.conflict('该费用类型已被特殊支付规则使用，不能删除', ADMIN_ERRORS.EXPENSE_TYPE_IN_USE);
    }

    // 删除费用类型
    const deleteQuery = 'DELETE FROM expense_types WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('费用类型不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_expense_type',
      'expense_type',
      id,
      JSON.stringify({ name: expenseType.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除费用类型成功`, { adminId, expenseTypeId: id });
    return res.success(null, '费用类型删除成功');
  } catch (error) {
    logger.error('删除费用类型失败:', error);
    return res.error('删除费用类型失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取特殊支付规则列表
 * @route GET /admin/special-payment-rules
 * @access Private (Admin)
 */
async function getSpecialPaymentRules(req, res) {
  try {
    const { page = 1, limit = 10, expense_type_id, room_id, active } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取特殊支付规则列表', { page, limit, expense_type_id, room_id, active });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (expense_type_id) {
      whereClause += ` AND spr.expense_type_id = $${index++}`;
      values.push(expense_type_id);
    }

    if (room_id) {
      whereClause += ` AND spr.room_id = $${index++}`;
      values.push(room_id);
    }

    if (active !== undefined) {
      whereClause += ` AND spr.active = $${index++}`;
      values.push(active === 'true');
    }

    const query = `
      SELECT 
        spr.id,
        spr.name,
        spr.description,
        spr.expense_type_id,
        et.name AS expense_type_name,
        spr.room_id,
        d.name AS room_name,
        spr.split_method,
        spr.split_details,
        spr.active,
        spr.start_date,
        spr.end_date,
        spr.created_at,
        spr.updated_at
      FROM special_payment_rules spr
      LEFT JOIN expense_types et ON spr.expense_type_id = et.id
      LEFT JOIN dorms d ON spr.room_id = d.id
      ${whereClause}
      ORDER BY spr.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM special_payment_rules spr
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

    logger.info('获取特殊支付规则列表成功');
    return res.paginate(rules, pagination, '获取特殊支付规则列表成功');
  } catch (error) {
    logger.error('获取特殊支付规则列表失败:', error);
    return res.error('获取特殊支付规则列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取特殊支付规则详情
 * @route GET /admin/special-payment-rules/:id
 * @access Private (Admin)
 */
async function getSpecialPaymentRuleById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取特殊支付规则详情', { specialPaymentRuleId: id });

    const query = `
      SELECT 
        spr.id,
        spr.name,
        spr.description,
        spr.expense_type_id,
        et.name AS expense_type_name,
        spr.room_id,
        d.name AS room_name,
        spr.split_method,
        spr.split_details,
        spr.active,
        spr.start_date,
        spr.end_date,
        spr.created_at,
        spr.updated_at
      FROM special_payment_rules spr
      LEFT JOIN expense_types et ON spr.expense_type_id = et.id
      LEFT JOIN dorms d ON spr.room_id = d.id
      WHERE spr.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('特殊支付规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const rule = result.rows[0];

    logger.info('获取特殊支付规则详情成功');
    return res.success({ special_payment_rule: rule }, '获取特殊支付规则详情成功');
  } catch (error) {
    logger.error('获取特殊支付规则详情失败:', error);
    return res.error('获取特殊支付规则详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建特殊支付规则
 * @route POST /admin/special-payment-rules
 * @access Private (Admin)
 */
async function createSpecialPaymentRule(req, res) {
  try {
    const { name, description, expense_type_id, room_id, split_method, split_details, active, start_date, end_date } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建特殊支付规则`, { adminId, ruleName: name });

    // 检查费用类型是否存在（如果提供了）
    if (expense_type_id) {
      const expenseTypeCheckQuery = 'SELECT id FROM expense_types WHERE id = $1';
      const expenseTypeCheckResult = await db.query(expenseTypeCheckQuery, [expense_type_id]);

      if (expenseTypeCheckResult.rowCount === 0) {
        return res.notFound('费用类型不存在', COMMON_ERRORS.NOT_FOUND);
      }
    }

    // 检查寝室是否存在（如果提供了）
    if (room_id) {
      const roomCheckQuery = 'SELECT id FROM dorms WHERE id = $1';
      const roomCheckResult = await db.query(roomCheckQuery, [room_id]);

      if (roomCheckResult.rowCount === 0) {
        return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
      }
    }

    const query = `
      INSERT INTO special_payment_rules (
        name,
        description,
        expense_type_id,
        room_id,
        split_method,
        split_details,
        active,
        start_date,
        end_date,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      name,
      description || '',
      expense_type_id || null,
      room_id || null,
      split_method,
      JSON.stringify(split_details),
      active !== undefined ? active : true,
      start_date || null,
      end_date || null,
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
      'create_special_payment_rule',
      'special_payment_rule',
      rule.id,
      JSON.stringify({ name: rule.name, split_method: rule.split_method }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建特殊支付规则成功`, { adminId, ruleId: rule.id });
    return res.success({ special_payment_rule: rule }, '特殊支付规则创建成功');
  } catch (error) {
    logger.error('创建特殊支付规则失败:', error);
    return res.error('创建特殊支付规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新特殊支付规则
 * @route PUT /admin/special-payment-rules/:id
 * @access Private (Admin)
 */
async function updateSpecialPaymentRule(req, res) {
  try {
    const { id } = req.params;
    const { name, description, expense_type_id, room_id, split_method, split_details, active, start_date, end_date } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新特殊支付规则`, { adminId, ruleId: id });

    // 检查特殊支付规则是否存在
    const checkQuery = 'SELECT id FROM special_payment_rules WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('特殊支付规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 检查费用类型是否存在（如果提供了）
    if (expense_type_id) {
      const expenseTypeCheckQuery = 'SELECT id FROM expense_types WHERE id = $1';
      const expenseTypeCheckResult = await db.query(expenseTypeCheckQuery, [expense_type_id]);

      if (expenseTypeCheckResult.rowCount === 0) {
        return res.notFound('费用类型不存在', COMMON_ERRORS.NOT_FOUND);
      }
    }

    // 检查寝室是否存在（如果提供了）
    if (room_id) {
      const roomCheckQuery = 'SELECT id FROM dorms WHERE id = $1';
      const roomCheckResult = await db.query(roomCheckQuery, [room_id]);

      if (roomCheckResult.rowCount === 0) {
        return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (expense_type_id !== undefined) {
      updates.push(`expense_type_id = $${index++}`);
      values.push(expense_type_id);
    }

    if (room_id !== undefined) {
      updates.push(`room_id = $${index++}`);
      values.push(room_id);
    }

    if (split_method !== undefined) {
      updates.push(`split_method = $${index++}`);
      values.push(split_method);
    }

    if (split_details !== undefined) {
      updates.push(`split_details = $${index++}`);
      values.push(JSON.stringify(split_details));
    }

    if (active !== undefined) {
      updates.push(`active = $${index++}`);
      values.push(active);
    }

    if (start_date !== undefined) {
      updates.push(`start_date = $${index++}`);
      values.push(start_date);
    }

    if (end_date !== undefined) {
      updates.push(`end_date = $${index++}`);
      values.push(end_date);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE special_payment_rules 
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
      'update_special_payment_rule',
      'special_payment_rule',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新特殊支付规则成功`, { adminId, ruleId: id });
    return res.success({ special_payment_rule: updatedRule }, '特殊支付规则更新成功');
  } catch (error) {
    logger.error('更新特殊支付规则失败:', error);
    return res.error('更新特殊支付规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除特殊支付规则
 * @route DELETE /admin/special-payment-rules/:id
 * @access Private (Admin)
 */
async function deleteSpecialPaymentRule(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除特殊支付规则`, { adminId, ruleId: id });

    // 检查特殊支付规则是否存在
    const checkQuery = 'SELECT id, name FROM special_payment_rules WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('特殊支付规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const rule = checkResult.rows[0];

    // 删除特殊支付规则
    const deleteQuery = 'DELETE FROM special_payment_rules WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('特殊支付规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_special_payment_rule',
      'special_payment_rule',
      id,
      JSON.stringify({ name: rule.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除特殊支付规则成功`, { adminId, ruleId: id });
    return res.success(null, '特殊支付规则删除成功');
  } catch (error) {
    logger.error('删除特殊支付规则失败:', error);
    return res.error('删除特殊支付规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取房间支付规则列表
 * @route GET /admin/room-payment-rules
 * @access Private (Admin)
 */
async function getRoomPaymentRules(req, res) {
  try {
    const { page = 1, limit = 10, room_id, active } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取房间支付规则列表', { page, limit, room_id, active });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (room_id) {
      whereClause += ` AND rpr.room_id = $${index++}`;
      values.push(room_id);
    }

    if (active !== undefined) {
      whereClause += ` AND rpr.active = $${index++}`;
      values.push(active === 'true');
    }

    const query = `
      SELECT 
        rpr.id,
        rpr.name,
        rpr.description,
        rpr.room_id,
        d.name AS room_name,
        rpr.split_method,
        rpr.split_details,
        rpr.active,
        rpr.start_date,
        rpr.end_date,
        rpr.created_at,
        rpr.updated_at
      FROM room_payment_rules rpr
      LEFT JOIN dorms d ON rpr.room_id = d.id
      ${whereClause}
      ORDER BY rpr.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM room_payment_rules rpr
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

    logger.info('获取房间支付规则列表成功');
    return res.paginate(rules, pagination, '获取房间支付规则列表成功');
  } catch (error) {
    logger.error('获取房间支付规则列表失败:', error);
    return res.error('获取房间支付规则列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取房间支付规则详情
 * @route GET /admin/room-payment-rules/:id
 * @access Private (Admin)
 */
async function getRoomPaymentRuleById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取房间支付规则详情', { roomPaymentRuleId: id });

    const query = `
      SELECT 
        rpr.id,
        rpr.name,
        rpr.description,
        rpr.room_id,
        d.name AS room_name,
        rpr.split_method,
        rpr.split_details,
        rpr.active,
        rpr.start_date,
        rpr.end_date,
        rpr.created_at,
        rpr.updated_at
      FROM room_payment_rules rpr
      LEFT JOIN dorms d ON rpr.room_id = d.id
      WHERE rpr.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('房间支付规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const rule = result.rows[0];

    logger.info('获取房间支付规则详情成功');
    return res.success({ room_payment_rule: rule }, '获取房间支付规则详情成功');
  } catch (error) {
    logger.error('获取房间支付规则详情失败:', error);
    return res.error('获取房间支付规则详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建房间支付规则
 * @route POST /admin/room-payment-rules
 * @access Private (Admin)
 */
async function createRoomPaymentRule(req, res) {
  try {
    const { room_id, name, description, split_method, split_details, active, start_date, end_date } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建房间支付规则`, { adminId, ruleName: name });

    // 检查寝室是否存在
    const roomCheckQuery = 'SELECT id FROM dorms WHERE id = $1';
    const roomCheckResult = await db.query(roomCheckQuery, [room_id]);

    if (roomCheckResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      INSERT INTO room_payment_rules (
        room_id,
        name,
        description,
        split_method,
        split_details,
        active,
        start_date,
        end_date,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      room_id,
      name,
      description || '',
      split_method,
      JSON.stringify(split_details),
      active !== undefined ? active : true,
      start_date || null,
      end_date || null,
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
      'create_room_payment_rule',
      'room_payment_rule',
      rule.id,
      JSON.stringify({ name: rule.name, split_method: rule.split_method }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建房间支付规则成功`, { adminId, ruleId: rule.id });
    return res.success({ room_payment_rule: rule }, '房间支付规则创建成功');
  } catch (error) {
    logger.error('创建房间支付规则失败:', error);
    return res.error('创建房间支付规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新房间支付规则
 * @route PUT /admin/room-payment-rules/:id
 * @access Private (Admin)
 */
async function updateRoomPaymentRule(req, res) {
  try {
    const { id } = req.params;
    const { name, description, split_method, split_details, active, start_date, end_date } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新房间支付规则`, { adminId, ruleId: id });

    // 检查房间支付规则是否存在
    const checkQuery = 'SELECT id FROM room_payment_rules WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('房间支付规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (split_method !== undefined) {
      updates.push(`split_method = $${index++}`);
      values.push(split_method);
    }

    if (split_details !== undefined) {
      updates.push(`split_details = $${index++}`);
      values.push(JSON.stringify(split_details));
    }

    if (active !== undefined) {
      updates.push(`active = $${index++}`);
      values.push(active);
    }

    if (start_date !== undefined) {
      updates.push(`start_date = $${index++}`);
      values.push(start_date);
    }

    if (end_date !== undefined) {
      updates.push(`end_date = $${index++}`);
      values.push(end_date);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE room_payment_rules 
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
      'update_room_payment_rule',
      'room_payment_rule',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新房间支付规则成功`, { adminId, ruleId: id });
    return res.success({ room_payment_rule: updatedRule }, '房间支付规则更新成功');
  } catch (error) {
    logger.error('更新房间支付规则失败:', error);
    return res.error('更新房间支付规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除房间支付规则
 * @route DELETE /admin/room-payment-rules/:id
 * @access Private (Admin)
 */
async function deleteRoomPaymentRule(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除房间支付规则`, { adminId, ruleId: id });

    // 检查房间支付规则是否存在
    const checkQuery = 'SELECT id, name FROM room_payment_rules WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('房间支付规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const rule = checkResult.rows[0];

    // 删除房间支付规则
    const deleteQuery = 'DELETE FROM room_payment_rules WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('房间支付规则不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_room_payment_rule',
      'room_payment_rule',
      id,
      JSON.stringify({ name: rule.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除房间支付规则成功`, { adminId, ruleId: id });
    return res.success(null, '房间支付规则删除成功');
  } catch (error) {
    logger.error('删除房间支付规则失败:', error);
    return res.error('删除房间支付规则失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getExpenseTypes,
  getExpenseTypeById,
  createExpenseType,
  updateExpenseType,
  deleteExpenseType,
  getSpecialPaymentRules,
  getSpecialPaymentRuleById,
  createSpecialPaymentRule,
  updateSpecialPaymentRule,
  deleteSpecialPaymentRule,
  getRoomPaymentRules,
  getRoomPaymentRuleById,
  createRoomPaymentRule,
  updateRoomPaymentRule,
  deleteRoomPaymentRule
};