const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取寝室列表
 * @route GET /admin/dorms
 * @access Private (Admin)
 */
async function getRooms(req, res) {
  try {
    const { page = 1, limit = 10, status, name, building, floor } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取寝室列表', { page, limit, status, name, building, floor });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      whereClause += ` AND r.status = $${index++}`;
      values.push(status);
    }

    if (name) {
      whereClause += ` AND r.name ILIKE $${index++}`;
      values.push(`%${name}%`);
    }

    if (building) {
      whereClause += ` AND r.building ILIKE $${index++}`;
      values.push(`%${building}%`);
    }

    if (floor) {
      whereClause += ` AND r.floor = $${index++}`;
      values.push(floor);
    }

    const query = `
      SELECT 
        r.id,
        r.name,
        r.building,
        r.floor,
        r.room_number,
        r.capacity,
        r.current_occupancy,
        r.description,
        r.status,
        r.created_at,
        r.updated_at,
        COUNT(rm.user_id) AS member_count
      FROM dorms r
      LEFT JOIN dorm_members rm ON r.id = rm.dorm_id AND rm.status = 'active'
      ${whereClause}
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dorms r
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const rooms = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取寝室列表成功');
    return res.paginate(rooms, pagination, '获取寝室列表成功');
  } catch (error) {
    logger.error('获取寝室列表失败:', error);
    return res.error('获取寝室列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取寝室详情
 * @route GET /admin/dorms/:id
 * @access Private (Admin)
 */
async function getRoomById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取寝室详情', { roomId: id });

    const query = `
      SELECT 
        r.id,
        r.name,
        r.building,
        r.floor,
        r.room_number,
        r.capacity,
        r.current_occupancy,
        r.description,
        r.status,
        r.created_at,
        r.updated_at
      FROM dorms r
      WHERE r.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const room = result.rows[0];

    logger.info('获取寝室详情成功');
    return res.success({ room: room }, '获取寝室详情成功');
  } catch (error) {
    logger.error('获取寝室详情失败:', error);
    return res.error('获取寝室详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建寝室
 * @route POST /admin/dorms
 * @access Private (Admin)
 */
async function createRoom(req, res) {
  try {
    const { name, building, floor, room_number, capacity, description, status } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建寝室`, { adminId, roomName: name });

    // 检查寝室名称是否已存在
    const checkQuery = 'SELECT id FROM dorms WHERE name = $1';
    const checkResult = await db.query(checkQuery, [name]);

    if (checkResult.rowCount > 0) {
      return res.conflict('寝室名称已存在', ADMIN_ERRORS.DORM_NAME_EXISTS);
    }

    const query = `
      INSERT INTO dorms (
        name,
        building,
        floor,
        room_number,
        capacity,
        current_occupancy,
        description,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      name,
      building,
      floor,
      room_number,
      capacity,
      0,
      description || '',
      status || 'active',
      new Date().toISOString(),
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const room = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_dorm',
      'dorm',
      room.id,
      JSON.stringify({ name: room.name, building: room.building, room_number: room.room_number }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建寝室成功`, { adminId, roomId: room.id });
    return res.success({ room: room }, '寝室创建成功');
  } catch (error) {
    logger.error('创建寝室失败:', error);
    return res.error('创建寝室失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新寝室
 * @route PUT /admin/dorms/:id
 * @access Private (Admin)
 */
async function updateRoom(req, res) {
  try {
    const { id } = req.params;
    const { name, building, floor, room_number, capacity, description, status } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新寝室`, { adminId, roomId: id });

    // 检查寝室是否存在
    const checkQuery = 'SELECT id, name FROM dorms WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingRoom = checkResult.rows[0];

    // 如果提供了新的寝室名称，检查是否已存在
    if (name && name !== existingRoom.name) {
      const nameCheckQuery = 'SELECT id FROM dorms WHERE name = $1 AND id != $2';
      const nameCheckResult = await db.query(nameCheckQuery, [name, id]);

      if (nameCheckResult.rowCount > 0) {
        return res.conflict('寝室名称已存在', ADMIN_ERRORS.DORM_NAME_EXISTS);
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

    if (building !== undefined) {
      updates.push(`building = $${index++}`);
      values.push(building);
    }

    if (floor !== undefined) {
      updates.push(`floor = $${index++}`);
      values.push(floor);
    }

    if (room_number !== undefined) {
      updates.push(`room_number = $${index++}`);
      values.push(room_number);
    }

    if (capacity !== undefined) {
      updates.push(`capacity = $${index++}`);
      values.push(capacity);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (status !== undefined) {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE dorms 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedRoom = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_dorm',
      'dorm',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新寝室成功`, { adminId, roomId: id });
    return res.success({ room: updatedRoom }, '寝室更新成功');
  } catch (error) {
    logger.error('更新寝室失败:', error);
    return res.error('更新寝室失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除寝室
 * @route DELETE /admin/dorms/:id
 * @access Private (Admin)
 */
async function deleteRoom(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除寝室`, { adminId, roomId: id });

    // 检查寝室是否存在
    const checkQuery = 'SELECT id, name FROM dorms WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const room = checkResult.rows[0];

    // 检查寝室是否有成员
    const memberCheckQuery = 'SELECT COUNT(*) AS count FROM dorm_members WHERE dorm_id = $1';
    const memberCheckResult = await db.query(memberCheckQuery, [id]);
    
    if (parseInt(memberCheckResult.rows[0].count) > 0) {
      return res.conflict('该寝室有成员，不能删除', ADMIN_ERRORS.DORM_HAS_MEMBERS);
    }

    // 开始事务删除寝室及相关数据
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 删除寝室费用设置
      const deleteSettingsQuery = 'DELETE FROM dorm_expense_settings WHERE dorm_id = $1';
      await client.query(deleteSettingsQuery, [id]);

      // 删除寝室邀请
      const deleteInvitationsQuery = 'DELETE FROM dorm_invitations WHERE dorm_id = $1';
      await client.query(deleteInvitationsQuery, [id]);

      // 删除寝室
      const deleteRoomQuery = 'DELETE FROM dorms WHERE id = $1 RETURNING id';
      const deleteResult = await client.query(deleteRoomQuery, [id]);

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
      }

      await client.query('COMMIT');

      // 记录操作日志
      const logQuery = `
        INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await db.query(logQuery, [
        adminId,
        'delete_dorm',
        'dorm',
        id,
        JSON.stringify({ name: room.name }),
        req.ip,
        req.get('User-Agent') || ''
      ]);

      logger.info(`管理员 ${adminName} 删除寝室成功`, { adminId, roomId: id });
      return res.success(null, '寝室删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('删除寝室失败:', error);
    return res.error('删除寝室失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取寝室成员列表
 * @route GET /admin/dorms/:id/members
 * @access Private (Admin)
 */
async function getRoomMembers(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取寝室成员列表', { roomId: id, page, limit, status });

    // 检查寝室是否存在
    const checkQuery = 'SELECT id FROM dorms WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建查询条件
    let whereClause = 'WHERE rm.dorm_id = $1';
    const values = [id];
    let index = 2;

    if (status) {
      whereClause += ` AND rm.status = $${index++}`;
      values.push(status);
    }

    const query = `
      SELECT 
        rm.id,
        rm.dorm_id,
        rm.user_id,
        u.username AS user_name,
        u.email AS user_email,
        rm.role,
        rm.status,
        rm.joined_at,
        rm.left_at
      FROM dorm_members rm
      LEFT JOIN users u ON rm.user_id = u.id
      ${whereClause}
      ORDER BY rm.joined_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dorm_members rm
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const members = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取寝室成员列表成功');
    return res.paginate(members, pagination, '获取寝室成员列表成功');
  } catch (error) {
    logger.error('获取寝室成员列表失败:', error);
    return res.error('获取寝室成员列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 添加寝室成员
 * @route POST /admin/dorms/:id/members
 * @access Private (Admin)
 */
async function addRoomMember(req, res) {
  try {
    const { id } = req.params;
    const { user_id, role, join_date } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 添加寝室成员`, { adminId, roomId: id, userId: user_id, role });

    // 检查寝室是否存在
    const roomCheckQuery = 'SELECT id, capacity, current_occupancy FROM dorms WHERE id = $1';
    const roomCheckResult = await db.query(roomCheckQuery, [id]);

    if (roomCheckResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const room = roomCheckResult.rows[0];

    // 检查寝室是否已满
    if (room.current_occupancy >= room.capacity) {
      return res.clientError('寝室已满', ADMIN_ERRORS.DORM_IS_FULL);
    }

    // 检查用户是否存在
    const userCheckQuery = 'SELECT id, username FROM users WHERE id = $1';
    const userCheckResult = await db.query(userCheckQuery, [user_id]);

    if (userCheckResult.rowCount === 0) {
      return res.notFound('用户不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const user = userCheckResult.rows[0];

    // 检查成员是否已存在
    const memberCheckQuery = `
      SELECT id FROM dorm_members 
      WHERE dorm_id = $1 AND user_id = $2 AND status = 'active'
    `;
    const memberCheckResult = await db.query(memberCheckQuery, [id, user_id]);

    if (memberCheckResult.rowCount > 0) {
      return res.conflict('用户已是寝室成员', ADMIN_ERRORS.DORM_MEMBER_EXISTS);
    }

    const query = `
      INSERT INTO dorm_members (
        dorm_id,
        user_id,
        role,
        status,
        joined_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      id,
      user_id,
      role || 'member',
      'active',
      join_date || new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const member = result.rows[0];

    // 更新寝室当前入住人数
    const updateRoomQuery = `
      UPDATE dorms 
      SET current_occupancy = current_occupancy + 1, updated_at = $1
      WHERE id = $2
    `;
    await db.query(updateRoomQuery, [new Date().toISOString(), id]);

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'add_dorm_member',
      'dorm',
      id,
      JSON.stringify({ user_id: user_id, user_name: user.username, role: role }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 添加寝室成员成功`, { adminId, roomId: id, userId: user_id });
    return res.success({ member: member }, '寝室成员添加成功');
  } catch (error) {
    logger.error('添加寝室成员失败:', error);
    return res.error('添加寝室成员失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 移除寝室成员
 * @route DELETE /admin/dorms/:id/members/:memberId
 * @access Private (Admin)
 */
async function removeRoomMember(req, res) {
  try {
    const { id, memberId } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 移除寝室成员`, { adminId, roomId: id, memberId: memberId });

    // 检查寝室是否存在
    const roomCheckQuery = 'SELECT id FROM dorms WHERE id = $1';
    const roomCheckResult = await db.query(roomCheckQuery, [id]);

    if (roomCheckResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 检查成员是否存在
    const memberCheckQuery = `
      SELECT id, user_id FROM dorm_members 
      WHERE id = $1 AND dorm_id = $2 AND status = 'active'
    `;
    const memberCheckResult = await db.query(memberCheckQuery, [memberId, id]);

    if (memberCheckResult.rowCount === 0) {
      return res.notFound('寝室成员不存在', ADMIN_ERRORS.DORM_MEMBER_NOT_FOUND);
    }

    const member = memberCheckResult.rows[0];

    // 获取用户信息
    const userQuery = 'SELECT username FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [member.user_id]);
    const user = userResult.rows[0];

    // 更新成员状态为已离开
    const updateQuery = `
      UPDATE dorm_members 
      SET status = 'inactive', left_at = $1
      WHERE id = $2
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [new Date().toISOString(), memberId]);

    if (updateResult.rowCount === 0) {
      return res.notFound('寝室成员不存在', ADMIN_ERRORS.DORM_MEMBER_NOT_FOUND);
    }

    const updatedMember = updateResult.rows[0];

    // 更新寝室当前入住人数
    const updateRoomQuery = `
      UPDATE dorms 
      SET current_occupancy = GREATEST(current_occupancy - 1, 0), updated_at = $1
      WHERE id = $2
    `;
    await db.query(updateRoomQuery, [new Date().toISOString(), id]);

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'remove_dorm_member',
      'dorm',
      id,
      JSON.stringify({ user_id: member.user_id, user_name: user.username }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 移除寝室成员成功`, { adminId, roomId: id, memberId: memberId });
    return res.success({ member: updatedMember }, '寝室成员移除成功');
  } catch (error) {
    logger.error('移除寝室成员失败:', error);
    return res.error('移除寝室成员失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 设置寝室长
 * @route PUT /admin/dorms/:id/leader
 * @access Private (Admin)
 */
async function setRoomLeader(req, res) {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 设置寝室长`, { adminId, roomId: id, userId: user_id });

    // 检查寝室是否存在
    const roomCheckQuery = 'SELECT id FROM dorms WHERE id = $1';
    const roomCheckResult = await db.query(roomCheckQuery, [id]);

    if (roomCheckResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 检查用户是否是寝室成员
    const memberCheckQuery = `
      SELECT id FROM dorm_members 
      WHERE dorm_id = $1 AND user_id = $2 AND status = 'active'
    `;
    const memberCheckResult = await db.query(memberCheckQuery, [id, user_id]);

    if (memberCheckResult.rowCount === 0) {
      return res.clientError('用户不是寝室成员', ADMIN_ERRORS.DORM_MEMBER_NOT_FOUND);
    }

    // 将当前寝室长降为普通成员
    const removeLeaderQuery = `
      UPDATE dorm_members 
      SET role = 'member'
      WHERE dorm_id = $1 AND role = 'leader'
    `;
    await db.query(removeLeaderQuery, [id]);

    // 设置新的寝室长
    const setLeaderQuery = `
      UPDATE dorm_members 
      SET role = 'leader'
      WHERE dorm_id = $1 AND user_id = $2
      RETURNING *
    `;
    const setLeaderResult = await db.query(setLeaderQuery, [id, user_id]);

    if (setLeaderResult.rowCount === 0) {
      return res.notFound('寝室成员不存在', ADMIN_ERRORS.DORM_MEMBER_NOT_FOUND);
    }

    const leader = setLeaderResult.rows[0];

    // 获取用户信息
    const userQuery = 'SELECT username FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [user_id]);
    const user = userResult.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'set_dorm_leader',
      'dorm',
      id,
      JSON.stringify({ user_id: user_id, user_name: user.username }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 设置寝室长成功`, { adminId, roomId: id, userId: user_id });
    return res.success({ leader: leader }, '寝室长设置成功');
  } catch (error) {
    logger.error('设置寝室长失败:', error);
    return res.error('设置寝室长失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取寝室邀请列表
 * @route GET /admin/dorms/:id/invitations
 * @access Private (Admin)
 */
async function getRoomInvitations(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取寝室邀请列表', { roomId: id, page, limit, status });

    // 检查寝室是否存在
    const checkQuery = 'SELECT id FROM dorms WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建查询条件
    let whereClause = 'WHERE di.dorm_id = $1';
    const values = [id];
    let index = 2;

    if (status) {
      whereClause += ` AND di.status = $${index++}`;
      values.push(status);
    }

    const query = `
      SELECT 
        di.id,
        di.dorm_id,
        d.name AS dorm_name,
        di.invitee_email,
        di.inviter_id,
        a.username AS inviter_name,
        di.message,
        di.status,
        di.expires_at,
        di.created_at
      FROM dorm_invitations di
      LEFT JOIN dorms d ON di.dorm_id = d.id
      LEFT JOIN admins a ON di.inviter_id = a.id
      ${whereClause}
      ORDER BY di.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dorm_invitations di
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const invitations = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取寝室邀请列表成功');
    return res.paginate(invitations, pagination, '获取寝室邀请列表成功');
  } catch (error) {
    logger.error('获取寝室邀请列表失败:', error);
    return res.error('获取寝室邀请列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建寝室邀请
 * @route POST /admin/dorms/:id/invitations
 * @access Private (Admin)
 */
async function createRoomInvitation(req, res) {
  try {
    const { id } = req.params;
    const { invitee_email, message, expires_at } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建寝室邀请`, { adminId, roomId: id, inviteeEmail: invitee_email });

    // 检查寝室是否存在
    const roomCheckQuery = 'SELECT id, name FROM dorms WHERE id = $1';
    const roomCheckResult = await db.query(roomCheckQuery, [id]);

    if (roomCheckResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const room = roomCheckResult.rows[0];

    // 检查邀请是否已存在且未过期
    const invitationCheckQuery = `
      SELECT id FROM dorm_invitations 
      WHERE dorm_id = $1 AND invitee_email = $2 AND status = 'pending' AND expires_at > $3
    `;
    const invitationCheckResult = await db.query(invitationCheckQuery, [
      id,
      invitee_email,
      new Date().toISOString()
    ]);

    if (invitationCheckResult.rowCount > 0) {
      return res.conflict('邀请已存在', ADMIN_ERRORS.DORM_INVITATION_EXISTS);
    }

    const query = `
      INSERT INTO dorm_invitations (
        dorm_id,
        invitee_email,
        inviter_id,
        message,
        status,
        expires_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      id,
      invitee_email,
      adminId,
      message || '',
      'pending',
      expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 默认7天后过期
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const invitation = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_dorm_invitation',
      'dorm',
      id,
      JSON.stringify({ invitee_email: invitee_email, dorm_name: room.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建寝室邀请成功`, { adminId, roomId: id, invitationId: invitation.id });
    return res.success({ invitation: invitation }, '寝室邀请创建成功');
  } catch (error) {
    logger.error('创建寝室邀请失败:', error);
    return res.error('创建寝室邀请失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除寝室邀请
 * @route DELETE /admin/dorms/invitations/:invitationId
 * @access Private (Admin)
 */
async function deleteRoomInvitation(req, res) {
  try {
    const { invitationId } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除寝室邀请`, { adminId, invitationId: invitationId });

    // 检查邀请是否存在
    const checkQuery = `
      SELECT id, dorm_id, invitee_email 
      FROM dorm_invitations 
      WHERE id = $1
    `;
    const checkResult = await db.query(checkQuery, [invitationId]);

    if (checkResult.rowCount === 0) {
      return res.notFound('邀请不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const invitation = checkResult.rows[0];

    // 删除邀请
    const deleteQuery = `
      DELETE FROM dorm_invitations 
      WHERE id = $1
      RETURNING id
    `;
    const deleteResult = await db.query(deleteQuery, [invitationId]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('邀请不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_dorm_invitation',
      'dorm',
      invitation.dorm_id,
      JSON.stringify({ invitee_email: invitation.invitee_email }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除寝室邀请成功`, { adminId, invitationId: invitationId });
    return res.success(null, '寝室邀请删除成功');
  } catch (error) {
    logger.error('删除寝室邀请失败:', error);
    return res.error('删除寝室邀请失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取寝室费用设置
 * @route GET /admin/dorms/:id/expense-settings
 * @access Private (Admin)
 */
async function getRoomExpenseSettings(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取寝室费用设置', { roomId: id });

    // 检查寝室是否存在
    const roomCheckQuery = 'SELECT id FROM dorms WHERE id = $1';
    const roomCheckResult = await db.query(roomCheckQuery, [id]);

    if (roomCheckResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      SELECT 
        id,
        dorm_id,
        split_method,
        default_categories,
        notification_settings,
        budget_limit,
        created_at,
        updated_at
      FROM dorm_expense_settings
      WHERE dorm_id = $1
    `;

    const result = await db.query(query, [id]);
    
    // 如果没有设置，返回默认值
    let settings = null;
    if (result.rowCount > 0) {
      settings = result.rows[0];
    } else {
      settings = {
        dorm_id: id,
        split_method: 'equal',
        default_categories: [],
        notification_settings: {},
        budget_limit: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    logger.info('获取寝室费用设置成功');
    return res.success({ settings: settings }, '获取寝室费用设置成功');
  } catch (error) {
    logger.error('获取寝室费用设置失败:', error);
    return res.error('获取寝室费用设置失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新寝室费用设置
 * @route PUT /admin/dorms/:id/expense-settings
 * @access Private (Admin)
 */
async function updateRoomExpenseSettings(req, res) {
  try {
    const { id } = req.params;
    const { split_method, default_categories, notification_settings, budget_limit } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新寝室费用设置`, { adminId, roomId: id });

    // 检查寝室是否存在
    const roomCheckQuery = 'SELECT id FROM dorms WHERE id = $1';
    const roomCheckResult = await db.query(roomCheckQuery, [id]);

    if (roomCheckResult.rowCount === 0) {
      return res.notFound('寝室不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 检查是否已存在费用设置
    const settingsCheckQuery = 'SELECT id FROM dorm_expense_settings WHERE dorm_id = $1';
    const settingsCheckResult = await db.query(settingsCheckQuery, [id]);

    let query, values;
    if (settingsCheckResult.rowCount > 0) {
      // 更新现有设置
      const updates = [];
      const updateValues = [];
      let index = 1;

      if (split_method !== undefined) {
        updates.push(`split_method = $${index++}`);
        updateValues.push(split_method);
      }

      if (default_categories !== undefined) {
        updates.push(`default_categories = $${index++}`);
        updateValues.push(JSON.stringify(default_categories));
      }

      if (notification_settings !== undefined) {
        updates.push(`notification_settings = $${index++}`);
        updateValues.push(JSON.stringify(notification_settings));
      }

      if (budget_limit !== undefined) {
        updates.push(`budget_limit = $${index++}`);
        updateValues.push(budget_limit);
      }

      // 添加更新时间
      updates.push(`updated_at = $${index++}`);
      updateValues.push(new Date().toISOString());
      
      updateValues.push(id); // WHERE条件

      query = `
        UPDATE dorm_expense_settings 
        SET ${updates.join(', ')}
        WHERE dorm_id = $${index}
        RETURNING *
      `;

      values = updateValues;
    } else {
      // 创建新设置
      query = `
        INSERT INTO dorm_expense_settings (
          dorm_id,
          split_method,
          default_categories,
          notification_settings,
          budget_limit,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      values = [
        id,
        split_method || 'equal',
        JSON.stringify(default_categories || []),
        JSON.stringify(notification_settings || {}),
        budget_limit || null,
        new Date().toISOString(),
        new Date().toISOString()
      ];
    }

    const result = await db.query(query, values);
    const settings = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_dorm_expense_settings',
      'dorm',
      id,
      JSON.stringify({ split_method: settings.split_method }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新寝室费用设置成功`, { adminId, roomId: id });
    return res.success({ settings: settings }, '寝室费用设置更新成功');
  } catch (error) {
    logger.error('更新寝室费用设置失败:', error);
    return res.error('更新寝室费用设置失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomMembers,
  addRoomMember,
  removeRoomMember,
  setRoomLeader,
  getRoomInvitations,
  createRoomInvitation,
  deleteRoomInvitation,
  getRoomExpenseSettings,
  updateRoomExpenseSettings
};