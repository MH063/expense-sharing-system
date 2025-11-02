const { pool } = require('../config/db');
const winston = require('winston');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/room-controller.log' })
  ]
});

// 寝室控制器
class RoomController {
  constructor() {
    this.logger = logger;
  }

  // 生成唯一的寝室邀请码
  static generateRoomCode() {
    // 生成6位随机字符串，包含数字和字母
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // 创建寝室
  async createRoom(req, res) {
    try {
      const { name, description, max_members } = req.body;
      const creatorId = req.user.sub; // 从认证中间件获取用户ID

      // 验证必填字段
      if (!name) {
        return res.status(400).json({
          success: false,
          message: '寝室名称为必填项'
        });
      }

      // 生成唯一的寝室邀请码
      const roomCode = RoomController.generateRoomCode();

      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // 插入寝室记录
        const roomResult = await client.query(
          `INSERT INTO rooms (name, description, code, max_members, creator_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, name, description, code, max_members, creator_id, created_at`,
          [name, description || '', roomCode, max_members || 6, creatorId]
        );

        const room = roomResult.rows[0];

        // 创建者自动加入寝室，角色为owner
        await client.query(
          `INSERT INTO user_room_relations (user_id, room_id, relation_type, join_date, is_active, created_at, updated_at) 
           VALUES ($1, $2, 'owner', CURRENT_DATE, TRUE, NOW(), NOW())`,
          [creatorId, room.id]
        );

        // 更新创建者的角色为寝室长
        await client.query(
          'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
          ['room_owner', creatorId]
        );

        await client.query('COMMIT');

        // 获取完整的寝室信息
        const fullRoomResult = await pool.query(
          `SELECT r.id, r.name, r.description, r.code, r.max_members, r.status, r.created_at, 
                  u.username as creator_username, u.name as creator_name
           FROM rooms r
           JOIN users u ON r.creator_id = u.id
           WHERE r.id = $1`,
          [room.id]
        );

        const fullRoom = fullRoomResult.rows[0];

        logger.info(`寝室创建成功: ${name} (ID: ${room.id})`);

        res.status(201).json({
          success: true,
          message: '寝室创建成功',
          data: fullRoom
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('寝室创建失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取寝室列表
  async getRooms(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`r.status = $${paramIndex++}`);
        queryParams.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 查询寝室列表
      const roomsQuery = `
        SELECT r.id, r.name, r.description, r.code, r.max_members, r.status, r.created_at,
               u.username as creator_username, u.name as creator_name,
               (SELECT COUNT(*) FROM user_room_relations urr WHERE urr.room_id = r.id AND urr.is_active = TRUE) as current_members
        FROM rooms r
        JOIN users u ON r.creator_id = u.id
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const roomsResult = await pool.query(roomsQuery, queryParams);
      const rooms = roomsResult.rows;

      // 查询总数
      const countQuery = `SELECT COUNT(*) FROM rooms r ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].count);

      logger.info(`获取寝室列表成功，共 ${totalCount} 条记录`);

      res.status(200).json({
        success: true,
        message: '获取寝室列表成功',
        data: {
          rooms,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      logger.error('获取寝室列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取寝室详情
  async getRoomById(req, res) {
    try {
      const { id } = req.params;

      // 查询寝室基本信息
      const roomResult = await pool.query(
        `SELECT r.id, r.name, r.description, r.code, r.max_members, r.status, r.created_at, r.updated_at,
                u.username as creator_username, u.name as creator_name
         FROM rooms r
         JOIN users u ON r.creator_id = u.id
         WHERE r.id = $1`,
        [id]
      );

      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '寝室不存在'
        });
      }

      const room = roomResult.rows[0];

      // 查询寝室成员
      const membersResult = await pool.query(
        `SELECT u.id, u.username, u.name, u.email, u.avatar_url, u.role as user_role,
                urr.relation_type, urr.join_date, urr.leave_date, urr.is_active
         FROM user_room_relations urr
         JOIN users u ON urr.user_id = u.id
         WHERE urr.room_id = $1
         ORDER BY urr.join_date`,
        [id]
      );

      room.members = membersResult.rows;

      logger.info(`获取寝室详情成功: ${room.name} (ID: ${room.id})`);

      res.status(200).json({
        success: true,
        message: '获取寝室详情成功',
        data: room
      });

    } catch (error) {
      logger.error('获取寝室详情失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新寝室信息
  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const { name, description, max_members, status } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证寝室是否存在
      const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);

      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '寝室不存在'
        });
      }

      const room = roomResult.rows[0];

      // 验证用户是否有权限更新寝室（创建者或寝室长）
      const permissionResult = await pool.query(
        `SELECT urr.relation_type FROM user_room_relations urr
         JOIN users u ON urr.user_id = u.id
         WHERE urr.room_id = $1 AND urr.user_id = $2 AND urr.is_active = TRUE`,
        [id, userId]
      );

      if (permissionResult.rows.length === 0 || 
          (permissionResult.rows[0].relation_type !== 'owner' && room.creator_id !== userId)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }

      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }

      if (max_members !== undefined) {
        updateFields.push(`max_members = $${paramIndex++}`);
        updateValues.push(max_members);
      }

      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(status);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      // 执行更新
      const updateQuery = `
        UPDATE rooms 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, description, code, max_members, status, updated_at
      `;

      const result = await pool.query(updateQuery, updateValues);
      const updatedRoom = result.rows[0];

      logger.info(`寝室信息更新成功: ${updatedRoom.name} (ID: ${updatedRoom.id})`);

      res.status(200).json({
        success: true,
        message: '寝室信息更新成功',
        data: updatedRoom
      });

    } catch (error) {
      logger.error('寝室信息更新失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除寝室
  async deleteRoom(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证寝室是否存在
      const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);

      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '寝室不存在'
        });
      }

      const room = roomResult.rows[0];

      // 验证用户是否有权限删除寝室（只有创建者可以删除）
      if (room.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: '只有寝室创建者可以删除寝室'
        });
      }

      // 开始事务
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 删除用户寝室关联记录
        await client.query(
          'DELETE FROM user_room_relations WHERE room_id = $1',
          [id]
        );

        // 删除寝室
        await client.query('DELETE FROM rooms WHERE id = $1', [id]);

        await client.query('COMMIT');

        logger.info(`寝室删除成功: ${room.name} (ID: ${room.id})`);

        res.status(200).json({
          success: true,
          message: '寝室删除成功'
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('寝室删除失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 加入寝室
  async joinRoom(req, res) {
    try {
      const { roomCode } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证邀请码
      const roomResult = await pool.query(
        'SELECT * FROM rooms WHERE code = $1 AND status = $2',
        [roomCode, 'active']
      );

      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '邀请码无效或寝室不存在'
        });
      }

      const room = roomResult.rows[0];

      // 检查用户是否已经是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, room.id]
      );

      if (membershipResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '您已经是该寝室的成员'
        });
      }

      // 检查寝室是否已满员
      const memberCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_room_relations WHERE room_id = $1 AND is_active = TRUE',
        [room.id]
      );

      const currentMembers = parseInt(memberCountResult.rows[0].count);

      if (currentMembers >= room.max_members) {
        return res.status(409).json({
          success: false,
          message: '寝室已满员'
        });
      }

      // 加入寝室
      await pool.query(
        `INSERT INTO user_room_relations (user_id, room_id, relation_type, join_date, is_active, created_at, updated_at) 
         VALUES ($1, $2, 'member', CURRENT_DATE, TRUE, NOW(), NOW())`,
        [userId, room.id]
      );

      logger.info(`用户加入寝室成功: 用户ID ${userId} -> 寝室 ${room.name} (ID: ${room.id})`);

      res.status(200).json({
        success: true,
        message: '加入寝室成功',
        data: {
          roomId: room.id,
          roomName: room.name
        }
      });

    } catch (error) {
      logger.error('加入寝室失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 离开寝室
  async leaveRoom(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证寝室是否存在
      const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);

      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '寝室不存在'
        });
      }

      const room = roomResult.rows[0];

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, room.id]
      );

      if (membershipResult.rows.length === 0) {
        return res.status(409).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 创建者不能离开自己的寝室
      if (room.creator_id === userId) {
        return res.status(403).json({
          success: false,
          message: '寝室创建者不能离开寝室，请先转让寝室或删除寝室'
        });
      }

      // 离开寝室
      await pool.query(
        'UPDATE user_room_relations SET is_active = FALSE, leave_date = CURRENT_DATE, updated_at = NOW() WHERE user_id = $1 AND room_id = $2',
        [userId, room.id]
      );

      logger.info(`用户离开寝室成功: 用户ID ${userId} -> 寝室 ${room.name} (ID: ${room.id})`);

      res.status(200).json({
        success: true,
        message: '离开寝室成功'
      });

    } catch (error) {
      logger.error('离开寝室失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 管理寝室成员
  async manageMember(req, res) {
    try {
      const { roomId, userId } = req.params;
      const { relation_type } = req.body;
      const operatorId = req.user.sub; // 从认证中间件获取用户ID

      // 验证寝室是否存在
      const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);

      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '寝室不存在'
        });
      }

      const room = roomResult.rows[0];

      // 验证操作者是否有权限（寝室创建者）
      if (room.creator_id !== operatorId) {
        return res.status(403).json({
          success: false,
          message: '只有寝室创建者可以管理成员'
        });
      }

      // 验证目标用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, roomId]
      );

      if (membershipResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不是该寝室的成员'
        });
      }

      // 更新成员关系类型
      await pool.query(
        'UPDATE user_room_relations SET relation_type = $1, updated_at = NOW() WHERE user_id = $2 AND room_id = $3',
        [relation_type, userId, roomId]
      );

      logger.info(`寝室成员管理成功: 寝室 ${room.name} (ID: ${room.id}) -> 用户ID ${userId} -> 角色 ${relation_type}`);

      res.status(200).json({
        success: true,
        message: '成员角色更新成功',
        data: {
          userId,
          roomId,
          relation_type
        }
      });

    } catch (error) {
      logger.error('寝室成员管理失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 生成唯一的寝室邀请码
  generateRoomCode() {
    // 生成6位随机字符串，包含数字和字母
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = new RoomController();