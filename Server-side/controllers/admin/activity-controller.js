const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取活动列表
 * @route GET /admin/activities
 * @access Private (Admin)
 */
async function getActivities(req, res) {
  try {
    const { page = 1, limit = 10, status, type, name, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取活动列表', { page, limit, status, type, name });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      whereClause += ` AND a.status = $${index++}`;
      values.push(status);
    }

    if (type) {
      whereClause += ` AND a.type = $${index++}`;
      values.push(type);
    }

    if (name) {
      whereClause += ` AND a.name ILIKE $${index++}`;
      values.push(`%${name}%`);
    }

    if (start_date) {
      whereClause += ` AND a.start_time >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND a.end_time <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        a.id,
        a.name,
        a.description,
        a.type,
        a.status,
        a.location,
        a.start_time,
        a.end_time,
        a.registration_deadline,
        a.max_participants,
        a.current_participants,
        a.fee,
        a.tags,
        a.created_at,
        a.updated_at
      FROM activities a
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM activities a
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const activities = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取活动列表成功');
    return res.paginate(activities, pagination, '获取活动列表成功');
  } catch (error) {
    logger.error('获取活动列表失败:', error);
    return res.error('获取活动列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取活动详情
 * @route GET /admin/activities/:id
 * @access Private (Admin)
 */
async function getActivityById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取活动详情', { activityId: id });

    const query = `
      SELECT 
        a.id,
        a.name,
        a.description,
        a.type,
        a.status,
        a.location,
        a.start_time,
        a.end_time,
        a.registration_deadline,
        a.max_participants,
        a.current_participants,
        a.fee,
        a.tags,
        a.created_at,
        a.updated_at
      FROM activities a
      WHERE a.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('活动不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const activity = result.rows[0];

    logger.info('获取活动详情成功');
    return res.success({ activity: activity }, '获取活动详情成功');
  } catch (error) {
    logger.error('获取活动详情失败:', error);
    return res.error('获取活动详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建活动
 * @route POST /admin/activities
 * @access Private (Admin)
 */
async function createActivity(req, res) {
  try {
    const { name, description, type, start_time, end_time, location, max_participants, status, registration_deadline, fee, tags } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建活动`, { adminId, activityName: name });

    // 检查活动名称是否已存在
    const checkQuery = 'SELECT id FROM activities WHERE name = $1';
    const checkResult = await db.query(checkQuery, [name]);

    if (checkResult.rowCount > 0) {
      return res.conflict('活动名称已存在', ADMIN_ERRORS.ACTIVITY_NAME_EXISTS);
    }

    const query = `
      INSERT INTO activities (
        name,
        description,
        type,
        start_time,
        end_time,
        location,
        max_participants,
        current_participants,
        status,
        registration_deadline,
        fee,
        tags,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      name,
      description,
      type,
      start_time,
      end_time,
      location,
      max_participants,
      0,
      status || 'draft',
      registration_deadline || null,
      fee || 0,
      JSON.stringify(tags || []),
      new Date().toISOString(),
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const activity = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_activity',
      'activity',
      activity.id,
      JSON.stringify({ name: activity.name, type: activity.type, status: activity.status }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建活动成功`, { adminId, activityId: activity.id });
    return res.success({ activity: activity }, '活动创建成功');
  } catch (error) {
    logger.error('创建活动失败:', error);
    return res.error('创建活动失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新活动
 * @route PUT /admin/activities/:id
 * @access Private (Admin)
 */
async function updateActivity(req, res) {
  try {
    const { id } = req.params;
    const { name, description, type, start_time, end_time, location, max_participants, status, registration_deadline, fee, tags } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新活动`, { adminId, activityId: id });

    // 检查活动是否存在
    const checkQuery = 'SELECT id, name FROM activities WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('活动不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingActivity = checkResult.rows[0];

    // 如果提供了新的活动名称，检查是否已存在
    if (name && name !== existingActivity.name) {
      const nameCheckQuery = 'SELECT id FROM activities WHERE name = $1 AND id != $2';
      const nameCheckResult = await db.query(nameCheckQuery, [name, id]);

      if (nameCheckResult.rowCount > 0) {
        return res.conflict('活动名称已存在', ADMIN_ERRORS.ACTIVITY_NAME_EXISTS);
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

    if (type !== undefined) {
      updates.push(`type = $${index++}`);
      values.push(type);
    }

    if (start_time !== undefined) {
      updates.push(`start_time = $${index++}`);
      values.push(start_time);
    }

    if (end_time !== undefined) {
      updates.push(`end_time = $${index++}`);
      values.push(end_time);
    }

    if (location !== undefined) {
      updates.push(`location = $${index++}`);
      values.push(location);
    }

    if (max_participants !== undefined) {
      updates.push(`max_participants = $${index++}`);
      values.push(max_participants);
    }

    if (status !== undefined) {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    if (registration_deadline !== undefined) {
      updates.push(`registration_deadline = $${index++}`);
      values.push(registration_deadline);
    }

    if (fee !== undefined) {
      updates.push(`fee = $${index++}`);
      values.push(fee);
    }

    if (tags !== undefined) {
      updates.push(`tags = $${index++}`);
      values.push(JSON.stringify(tags));
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE activities 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedActivity = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_activity',
      'activity',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新活动成功`, { adminId, activityId: id });
    return res.success({ activity: updatedActivity }, '活动更新成功');
  } catch (error) {
    logger.error('更新活动失败:', error);
    return res.error('更新活动失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除活动
 * @route DELETE /admin/activities/:id
 * @access Private (Admin)
 */
async function deleteActivity(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除活动`, { adminId, activityId: id });

    // 检查活动是否存在
    const checkQuery = 'SELECT id, name FROM activities WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('活动不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const activity = checkResult.rows[0];

    // 检查活动是否有参与者
    const participantCheckQuery = 'SELECT COUNT(*) AS count FROM activity_participants WHERE activity_id = $1';
    const participantCheckResult = await db.query(participantCheckQuery, [id]);
    
    if (parseInt(participantCheckResult.rows[0].count) > 0) {
      return res.conflict('该活动有参与者，不能删除', ADMIN_ERRORS.ACTIVITY_HAS_PARTICIPANTS);
    }

    // 开始事务删除活动及相关数据
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 删除活动参与者
      const deleteParticipantsQuery = 'DELETE FROM activity_participants WHERE activity_id = $1';
      await client.query(deleteParticipantsQuery, [id]);

      // 删除活动
      const deleteActivityQuery = 'DELETE FROM activities WHERE id = $1 RETURNING id';
      const deleteResult = await client.query(deleteActivityQuery, [id]);

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.notFound('活动不存在', COMMON_ERRORS.NOT_FOUND);
      }

      await client.query('COMMIT');

      // 记录操作日志
      const logQuery = `
        INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await db.query(logQuery, [
        adminId,
        'delete_activity',
        'activity',
        id,
        JSON.stringify({ name: activity.name }),
        req.ip,
        req.get('User-Agent') || ''
      ]);

      logger.info(`管理员 ${adminName} 删除活动成功`, { adminId, activityId: id });
      return res.success(null, '活动删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('删除活动失败:', error);
    return res.error('删除活动失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取活动参与者
 * @route GET /admin/activities/:id/participants
 * @access Private (Admin)
 */
async function getActivityParticipants(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取活动参与者', { activityId: id, page, limit, status });

    // 检查活动是否存在
    const activityCheckQuery = 'SELECT id FROM activities WHERE id = $1';
    const activityCheckResult = await db.query(activityCheckQuery, [id]);

    if (activityCheckResult.rowCount === 0) {
      return res.notFound('活动不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建查询条件
    let whereClause = 'WHERE ap.activity_id = $1';
    const values = [id];
    let index = 2;

    if (status) {
      whereClause += ` AND ap.status = $${index++}`;
      values.push(status);
    }

    const query = `
      SELECT 
        ap.id,
        ap.activity_id,
        ap.user_id,
        u.username AS user_name,
        u.email AS user_email,
        ap.status,
        ap.notes,
        ap.registered_at,
        ap.attended_at
      FROM activity_participants ap
      LEFT JOIN users u ON ap.user_id = u.id
      ${whereClause}
      ORDER BY ap.registered_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM activity_participants ap
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const participants = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取活动参与者成功');
    return res.paginate(participants, pagination, '获取活动参与者成功');
  } catch (error) {
    logger.error('获取活动参与者失败:', error);
    return res.error('获取活动参与者失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 添加活动参与者
 * @route POST /admin/activities/:id/participants
 * @access Private (Admin)
 */
async function addActivityParticipant(req, res) {
  try {
    const { id } = req.params;
    const { user_id, status, notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 添加活动参与者`, { adminId, activityId: id, userId: user_id, status });

    // 检查活动是否存在
    const activityCheckQuery = 'SELECT id, max_participants, current_participants FROM activities WHERE id = $1';
    const activityCheckResult = await db.query(activityCheckQuery, [id]);

    if (activityCheckResult.rowCount === 0) {
      return res.notFound('活动不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const activity = activityCheckResult.rows[0];

    // 检查活动是否已满
    if (activity.current_participants >= activity.max_participants) {
      return res.clientError('活动已满', ADMIN_ERRORS.ACTIVITY_IS_FULL);
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
      SELECT id FROM activity_participants 
      WHERE activity_id = $1 AND user_id = $2
    `;
    const participantCheckResult = await db.query(participantCheckQuery, [id, user_id]);

    if (participantCheckResult.rowCount > 0) {
      return res.conflict('用户已是活动参与者', ADMIN_ERRORS.ACTIVITY_PARTICIPANT_EXISTS);
    }

    const query = `
      INSERT INTO activity_participants (
        activity_id,
        user_id,
        status,
        notes,
        registered_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      id,
      user_id,
      status || 'registered',
      notes || '',
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const participant = result.rows[0];

    // 更新活动当前参与人数
    const updateActivityQuery = `
      UPDATE activities 
      SET current_participants = current_participants + 1, updated_at = $1
      WHERE id = $2
    `;
    await db.query(updateActivityQuery, [new Date().toISOString(), id]);

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'add_activity_participant',
      'activity',
      id,
      JSON.stringify({ user_id: user_id, user_name: user.username, status: status }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 添加活动参与者成功`, { adminId, activityId: id, userId: user_id });
    return res.success({ participant: participant }, '活动参与者添加成功');
  } catch (error) {
    logger.error('添加活动参与者失败:', error);
    return res.error('添加活动参与者失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 移除活动参与者
 * @route DELETE /admin/activities/:id/participants/:userId
 * @access Private (Admin)
 */
async function removeActivityParticipant(req, res) {
  try {
    const { id, userId } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 移除活动参与者`, { adminId, activityId: id, userId: userId });

    // 检查活动是否存在
    const activityCheckQuery = 'SELECT id FROM activities WHERE id = $1';
    const activityCheckResult = await db.query(activityCheckQuery, [id]);

    if (activityCheckResult.rowCount === 0) {
      return res.notFound('活动不存在', COMMON_ERRORS.NOT_FOUND);
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
      SELECT id FROM activity_participants 
      WHERE activity_id = $1 AND user_id = $2
    `;
    const participantCheckResult = await db.query(participantCheckQuery, [id, userId]);

    if (participantCheckResult.rowCount === 0) {
      return res.notFound('用户不是活动参与者', ADMIN_ERRORS.ACTIVITY_PARTICIPANT_NOT_FOUND);
    }

    // 删除参与者
    const deleteQuery = `
      DELETE FROM activity_participants 
      WHERE activity_id = $1 AND user_id = $2
      RETURNING id
    `;
    const deleteResult = await db.query(deleteQuery, [id, userId]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('用户不是活动参与者', ADMIN_ERRORS.ACTIVITY_PARTICIPANT_NOT_FOUND);
    }

    // 更新活动当前参与人数
    const updateActivityQuery = `
      UPDATE activities 
      SET current_participants = GREATEST(current_participants - 1, 0), updated_at = $1
      WHERE id = $2
    `;
    await db.query(updateActivityQuery, [new Date().toISOString(), id]);

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'remove_activity_participant',
      'activity',
      id,
      JSON.stringify({ user_id: userId, user_name: user.username }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 移除活动参与者成功`, { adminId, activityId: id, userId: userId });
    return res.success(null, '活动参与者移除成功');
  } catch (error) {
    logger.error('移除活动参与者失败:', error);
    return res.error('移除活动参与者失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取活动统计数据
 * @route GET /admin/activities/statistics
 * @access Private (Admin)
 */
async function getActivityStatistics(req, res) {
  try {
    const { start_date, end_date, group_by = 'status' } = req.query;
    
    logger.info('管理员获取活动统计数据', { start_date, end_date, group_by });

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
      case 'type':
        groupByField = 'type';
        break;
      case 'status':
        groupByField = 'status';
        break;
    }

    const query = `
      SELECT 
        ${groupByField} AS group_field,
        COUNT(*) AS count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) AS draft_count,
        COUNT(CASE WHEN status = 'published' THEN 1 END) AS published_count,
        COUNT(CASE WHEN status = 'ongoing' THEN 1 END) AS ongoing_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count,
        SUM(current_participants) AS total_participants
      FROM activities
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
        COUNT(CASE WHEN status = 'draft' THEN 1 END) AS draft_total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) AS published_total,
        COUNT(CASE WHEN status = 'ongoing' THEN 1 END) AS ongoing_total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_total,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_total,
        SUM(current_participants) AS total_participants
      FROM activities
      WHERE 1=1 ${whereClause}
    `;

    const totalResult = await db.query(totalQuery, values);
    const totalStats = totalResult.rows[0];

    logger.info('获取活动统计数据成功');
    return res.success({ 
      stats: stats,
      total: totalStats
    }, '获取活动统计数据成功');
  } catch (error) {
    logger.error('获取活动统计数据失败:', error);
    return res.error('获取活动统计数据失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityParticipants,
  addActivityParticipant,
  removeActivityParticipant,
  getActivityStatistics
};