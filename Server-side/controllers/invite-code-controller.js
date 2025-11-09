const { pool } = require('../config/db');
const crypto = require('crypto');

/**
 * 邀请码管理控制器
 * 处理邀请码的生成、验证和使用限制等功能
 */
class InviteCodeController {
  constructor() {
    this.pool = pool;
  }

  /**
   * 生成新的邀请码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateInviteCode(req, res) {
    try {
      const { roomId, maxUses = 10, expiresAt } = req.body;
      const userId = req.user.sub;

      // 验证用户是否是房间管理员
      const roomQuery = 'SELECT creator_id FROM rooms WHERE id = $1';
      const roomResult = await this.pool.query(roomQuery, [roomId]);
      
      if (roomResult.rows.length === 0) {
        return res.error(404, '房间不存在');
      }

      if (roomResult.rows[0].creator_id !== userId) {
        return res.error(403, '只有房间管理员可以生成邀请码');
      }

      // 生成唯一的邀请码
      const code = this.generateRandomCode();
      
      // 设置默认过期时间为7天后
      const defaultExpiresAt = new Date();
      defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 7);
      
      const expirationDate = expiresAt ? new Date(expiresAt) : defaultExpiresAt;

      // 插入邀请码到数据库
      const insertQuery = `
        INSERT INTO invite_codes (code, room_id, created_by, max_uses, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, code, room_id, max_uses, expires_at, created_at
      `;
      
      const values = [code, roomId, userId, maxUses, expirationDate];
      const result = await this.pool.query(insertQuery, values);

      res.success(201, '邀请码生成成功', result.rows[0]);
    } catch (error) {
      console.error('生成邀请码失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 验证邀请码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async verifyInviteCode(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user.sub;

      if (!code) {
        return res.error(400, '邀请码不能为空');
      }

      // 查询邀请码信息
      const query = `
        SELECT ic.*, r.name as room_name, r.creator_id as room_admin
        FROM invite_codes ic
        JOIN rooms r ON ic.room_id = r.id
        WHERE ic.code = $1
      `;
      
      const result = await this.pool.query(query, [code]);
      
      if (result.rows.length === 0) {
        return res.error(404, '邀请码不存在');
      }

      const inviteCode = result.rows[0];

      // 检查邀请码是否已过期
      if (new Date() > new Date(inviteCode.expires_at)) {
        return res.error(400, '邀请码已过期');
      }

      // 检查邀请码是否已达到最大使用次数
      if (inviteCode.used_count >= inviteCode.max_uses) {
        return res.error(400, '邀请码使用次数已达上限');
      }

      // 检查用户是否已经是房间成员
      const memberQuery = 'SELECT user_id FROM user_room_relations WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE';
      const memberResult = await this.pool.query(memberQuery, [inviteCode.room_id, userId]);
      
      if (memberResult.rows.length > 0) {
        return res.error(400, '您已经是该房间的成员');
      }

      // 返回验证成功信息
      res.success(200, '邀请码验证成功', {
        id: inviteCode.id,
        room_id: inviteCode.room_id,
        room_name: inviteCode.room_name,
        room_admin: inviteCode.room_admin
      });
    } catch (error) {
      console.error('验证邀请码失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 使用邀请码加入房间
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async useInviteCode(req, res) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { code } = req.body;
      const userId = req.user.sub;

      // 查询邀请码信息
      const codeQuery = `
        SELECT ic.*, r.name as room_name
        FROM invite_codes ic
        JOIN rooms r ON ic.room_id = r.id
        WHERE ic.code = $1
      `;
      
      const codeResult = await client.query(codeQuery, [code]);
      
      if (codeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.error(404, '邀请码不存在');
      }

      const inviteCode = codeResult.rows[0];

      // 再次检查邀请码有效性
      if (new Date() > new Date(inviteCode.expires_at)) {
        await client.query('ROLLBACK');
        return res.error(400, '邀请码已过期');
      }

      if (inviteCode.used_count >= inviteCode.max_uses) {
        await client.query('ROLLBACK');
        return res.error(400, '邀请码使用次数已达上限');
      }

      // 检查用户是否已经是房间成员
      const memberQuery = 'SELECT user_id FROM user_room_relations WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE';
      const memberResult = await client.query(memberQuery, [inviteCode.room_id, userId]);
      
      if (memberResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.error(400, '您已经是该房间的成员');
      }

      // 将用户添加到房间
      const joinQuery = `
        INSERT INTO room_members (room_id, user_id, role)
        VALUES ($1, $2, 'member')
        RETURNING id
      `;
      
      const joinResult = await client.query(joinQuery, [inviteCode.room_id, userId]);

      // 更新邀请码使用次数
      const updateQuery = `
        UPDATE invite_codes 
        SET uses_count = uses_count + 1, updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [inviteCode.id]);

      // 记录邀请码使用日志
      const logQuery = `
        INSERT INTO invite_code_logs (invite_code_id, user_id, used_at)
        VALUES ($1, $2, NOW())
      `;
      
      await client.query(logQuery, [inviteCode.id, userId]);

      await client.query('COMMIT');

      res.success(200, '成功加入房间', {
        room_id: inviteCode.room_id,
        room_name: inviteCode.room_name,
        member_id: joinResult.rows[0].id
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('使用邀请码失败:', error);
      res.error(500, '服务器内部错误');
    } finally {
      client.release();
    }
  }

  /**
   * 获取房间的邀请码列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoomInviteCodes(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.sub;

      // 验证用户是否是房间管理员
      const roomQuery = 'SELECT creator_id FROM rooms WHERE id = $1';
      const roomResult = await this.pool.query(roomQuery, [roomId]);
      
      if (roomResult.rows.length === 0) {
        return res.error(404, '房间不存在');
      }

      if (roomResult.rows[0].creator_id !== userId) {
        return res.error(403, '只有房间管理员可以查看邀请码');
      }

      // 查询邀请码列表
      const query = `
        SELECT ic.*, 
               COUNT(icl.id) as actual_used_count
        FROM invite_codes ic
        LEFT JOIN invite_code_logs icl ON ic.id = icl.invite_code_id
        WHERE ic.room_id = $1
        GROUP BY ic.id
        ORDER BY ic.created_at DESC
      `;
      
      const result = await this.pool.query(query, [roomId]);

      res.success(200, '获取邀请码列表成功', result.rows);
    } catch (error) {
      console.error('获取邀请码列表失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 撤销邀请码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async revokeInviteCode(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub;

      // 查询邀请码信息并验证权限
      const query = `
        SELECT ic.*, r.creator_id as room_admin
        FROM invite_codes ic
        JOIN rooms r ON ic.room_id = r.id
        WHERE ic.id = $1
      `;
      
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.error(404, '邀请码不存在');
      }

      const inviteCode = result.rows[0];

      if (inviteCode.room_admin !== userId) {
        return res.error(403, '只有房间管理员可以撤销邀请码');
      }

      // 撤销邀请码（设置过期时间为当前时间）
      const revokeQuery = 'UPDATE invite_codes SET revoked = TRUE, updated_at = NOW() WHERE id = $1';
      await this.pool.query(revokeQuery, [id]);

      res.success(200, '邀请码已撤销');
    } catch (error) {
      console.error('撤销邀请码失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  /**
   * 生成随机邀请码
   * @returns {string} 随机邀请码
   */
  generateRandomCode() {
    // 生成8位随机字符串，包含大小写字母和数字
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // ===== 管理员API方法 =====

  /**
   * 管理员 - 获取邮请码列表
   */
  static async getInvites(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        creator_id,
        room_id,
        start_date,
        end_date
      } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        queryParams.push(status);
      }
      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }
      if (creator_id) {
        conditions.push(`created_by = $${paramIndex++}`);
        queryParams.push(creator_id);
      }
      if (room_id) {
        conditions.push(`room_id = $${paramIndex++}`);
        queryParams.push(room_id);
      }
      if (start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }
      if (end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (page - 1) * limit;

      const invitesQuery = `
        SELECT ic.*, u.username as creator_name, r.name as room_name
        FROM invite_codes ic
        LEFT JOIN users u ON ic.created_by = u.id
        LEFT JOIN rooms r ON ic.room_id = r.id
        ${whereClause}
        ORDER BY ic.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const invitesResult = await pool.query(invitesQuery, queryParams);
      const countQuery = `SELECT COUNT(*) FROM invite_codes ic ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

      const total = parseInt(countResult.rows[0].count);

      return res.success(200, '获取邮请码列表成功', {
        invites: invitesResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('获取邮请码列表失败:', error);
      return res.error(500, '获取邮请码列表失败', error.message);
    }
  }

  /**
   * 管理员 - 获取邮请码详情
   */
  static async getInviteById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT ic.*, u.username as creator_name, r.name as room_name
         FROM invite_codes ic
         LEFT JOIN users u ON ic.created_by = u.id
         LEFT JOIN rooms r ON ic.room_id = r.id
         WHERE ic.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在');
      }

      return res.success(200, '获取邮请码详情成功', { invite: result.rows[0] });
    } catch (error) {
      console.error('获取邮请码详情失败:', error);
      return res.error(500, '获取邮请码详情失败', error.message);
    }
  }

  /**
   * 管理员 - 创建邮请码
   */
  static async createInvite(req, res) {
    try {
      const {
        type,
        name,
        description,
        max_uses = 10,
        expires_at,
        room_id,
        permissions = []
      } = req.body;

      const userId = req.user.sub;
      const code = InviteCodeController.prototype.generateRandomCode();

      // 设置默认过期时间为7天后
      const defaultExpiresAt = new Date();
      defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 7);
      const expirationDate = expires_at ? new Date(expires_at) : defaultExpiresAt;

      const result = await pool.query(
        `INSERT INTO invite_codes (
          code, type, name, description, max_uses, expires_at,
          created_by, room_id, permissions, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())
        RETURNING *`,
        [code, type, name, description, max_uses, expirationDate, userId, room_id, JSON.stringify(permissions)]
      );

      return res.success(201, '邮请码创建成功', { invite: result.rows[0] });
    } catch (error) {
      console.error('创建邮请码失败:', error);
      return res.error(500, '创建邮请码失败', error.message);
    }
  }

  /**
   * 管理员 - 更新邮请码
   */
  static async updateInvite(req, res) {
    try {
      const { id } = req.params;
      const { name, description, max_uses, expires_at, status, permissions } = req.body;

      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (max_uses !== undefined) {
        updates.push(`max_uses = $${paramIndex++}`);
        values.push(max_uses);
      }
      if (expires_at !== undefined) {
        updates.push(`expires_at = $${paramIndex++}`);
        values.push(new Date(expires_at));
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }
      if (permissions !== undefined) {
        updates.push(`permissions = $${paramIndex++}`);
        values.push(JSON.stringify(permissions));
      }

      if (updates.length === 0) {
        return res.error(400, '没有可更新的字段');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE invite_codes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在');
      }

      return res.success(200, '邮请码更新成功', { invite: result.rows[0] });
    } catch (error) {
      console.error('更新邮请码失败:', error);
      return res.error(500, '更新邮请码失败', error.message);
    }
  }

  /**
   * 管理员 - 删除邮请码
   */
  static async deleteInvite(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM invite_codes WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在');
      }

      return res.success(200, '邮请码删除成功');
    } catch (error) {
      console.error('删除邮请码失败:', error);
      return res.error(500, '删除邮请码失败', error.message);
    }
  }

  /**
   * 管理员 - 禁用邮请码
   */
  static async disableInvite(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await pool.query(
        `UPDATE invite_codes 
         SET status = 'disabled', disabled_reason = $1, updated_at = NOW()
         WHERE id = $2 AND status = 'active'
         RETURNING *`,
        [reason, id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在或无法禁用');
      }

      return res.success(200, '邮请码禁用成功', { invite: result.rows[0] });
    } catch (error) {
      console.error('禁用邮请码失败:', error);
      return res.error(500, '禁用邮请码失败', error.message);
    }
  }

  /**
   * 管理员 - 启用邮请码
   */
  static async enableInvite(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE invite_codes 
         SET status = 'active', disabled_reason = NULL, updated_at = NOW()
         WHERE id = $1 AND status = 'disabled'
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在或无法启用');
      }

      return res.success(200, '邮请码启用成功', { invite: result.rows[0] });
    } catch (error) {
      console.error('启用邮请码失败:', error);
      return res.error(500, '启用邮请码失败', error.message);
    }
  }

  /**
   * 管理员 - 获取邮请码使用记录
   */
  static async getInviteUsages(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, status, start_date, end_date } = req.query;

      const conditions = [`invite_code_id = $1`];
      const queryParams = [id];
      let paramIndex = 2;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        queryParams.push(status);
      }
      if (start_date) {
        conditions.push(`used_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }
      if (end_date) {
        conditions.push(`used_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * limit;

      const usagesQuery = `
        SELECT icl.*, u.username, u.email
        FROM invite_code_logs icl
        LEFT JOIN users u ON icl.user_id = u.id
        WHERE ${whereClause}
        ORDER BY icl.used_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const usagesResult = await pool.query(usagesQuery, queryParams);
      const countQuery = `SELECT COUNT(*) FROM invite_code_logs WHERE ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

      const total = parseInt(countResult.rows[0].count);

      return res.success(200, '获取使用记录成功', {
        usages: usagesResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('获取使用记录失败:', error);
      return res.error(500, '获取使用记录失败', error.message);
    }
  }

  /**
   * 管理员 - 获取邮请码统计
   */
  static async getInviteStatistics(req, res) {
    try {
      const { start_date, end_date, type } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }
      if (end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }
      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await pool.query(
        `SELECT 
           COUNT(*) as total_count,
           COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
           COUNT(CASE WHEN status = 'used' THEN 1 END) as used_count,
           COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
           COUNT(CASE WHEN status = 'disabled' THEN 1 END) as disabled_count,
           SUM(uses_count) as total_uses
         FROM invite_codes
         ${whereClause}`,
        queryParams
      );

      return res.success(200, '获取邮请码统计成功', { statistics: result.rows[0] });
    } catch (error) {
      console.error('获取邮请码统计失败:', error);
      return res.error(500, '获取邮请码统计失败', error.message);
    }
  }

  /**
   * 管理员 - 批量创建邮请码
   */
  static async createBatchInvites(req, res) {
    const client = await pool.connect();
    try {
      const {
        count,
        type,
        name_template,
        description,
        max_uses = 10,
        expires_at,
        room_id,
        permissions = []
      } = req.body;

      const userId = req.user.sub;
      const defaultExpiresAt = new Date();
      defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 7);
      const expirationDate = expires_at ? new Date(expires_at) : defaultExpiresAt;

      await client.query('BEGIN');

      const invites = [];
      for (let i = 0; i < count; i++) {
        const code = InviteCodeController.prototype.generateRandomCode();
        const name = name_template.replace('{index}', i + 1);

        const result = await client.query(
          `INSERT INTO invite_codes (
            code, type, name, description, max_uses, expires_at,
            created_by, room_id, permissions, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())
          RETURNING *`,
          [code, type, name, description, max_uses, expirationDate, userId, room_id, JSON.stringify(permissions)]
        );
        invites.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return res.success(201, `批量创建${count}个邮请码成功`, { invites });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('批量创建邮请码失败:', error);
      return res.error(500, '批量创建邮请码失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 管理员 - 获取邮请码设置
   */
  static async getInviteSettings(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM invite_code_settings ORDER BY created_at DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        return res.success(200, '获取设置成功', {
          settings: {
            default_max_uses: 10,
            default_expires_days: 7,
            enable_room_invites: true,
            enable_admin_invites: false,
            require_approval: false
          }
        });
      }

      return res.success(200, '获取设置成功', { settings: result.rows[0] });
    } catch (error) {
      console.error('获取设置失败:', error);
      return res.error(500, '获取设置失败', error.message);
    }
  }

  /**
   * 管理员 - 更新邮请码设置
   */
  static async updateInviteSettings(req, res) {
    try {
      const {
        default_max_uses,
        default_expires_days,
        enable_room_invites,
        enable_admin_invites,
        require_approval
      } = req.body;

      const checkResult = await pool.query(
        'SELECT id FROM invite_code_settings ORDER BY created_at DESC LIMIT 1'
      );

      let result;
      if (checkResult.rows.length === 0) {
        result = await pool.query(
          `INSERT INTO invite_code_settings (
            default_max_uses, default_expires_days, enable_room_invites,
            enable_admin_invites, require_approval, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING *`,
          [
            default_max_uses ?? 10,
            default_expires_days ?? 7,
            enable_room_invites ?? true,
            enable_admin_invites ?? false,
            require_approval ?? false
          ]
        );
      } else {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (default_max_uses !== undefined) {
          updates.push(`default_max_uses = $${paramIndex++}`);
          values.push(default_max_uses);
        }
        if (default_expires_days !== undefined) {
          updates.push(`default_expires_days = $${paramIndex++}`);
          values.push(default_expires_days);
        }
        if (enable_room_invites !== undefined) {
          updates.push(`enable_room_invites = $${paramIndex++}`);
          values.push(enable_room_invites);
        }
        if (enable_admin_invites !== undefined) {
          updates.push(`enable_admin_invites = $${paramIndex++}`);
          values.push(enable_admin_invites);
        }
        if (require_approval !== undefined) {
          updates.push(`require_approval = $${paramIndex++}`);
          values.push(require_approval);
        }

        if (updates.length === 0) {
          return res.error(400, '没有可更新的字段');
        }

        updates.push(`updated_at = NOW()`);
        values.push(checkResult.rows[0].id);

        result = await pool.query(
          `UPDATE invite_code_settings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          values
        );
      }

      return res.success(200, '设置更新成功', { settings: result.rows[0] });
    } catch (error) {
      console.error('更新设置失败:', error);
      return res.error(500, '更新设置失败', error.message);
    }
  }

  /**
   * 管理员 - 验证邮请码
   */
  static async validateInvite(req, res) {
    try {
      const { code } = req.body;

      const result = await pool.query(
        `SELECT ic.*, r.name as room_name
         FROM invite_codes ic
         LEFT JOIN rooms r ON ic.room_id = r.id
         WHERE ic.code = $1`,
        [code]
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在');
      }

      const invite = result.rows[0];
      const isExpired = new Date() > new Date(invite.expires_at);
      const isMaxUsed = invite.uses_count >= invite.max_uses;
      const isValid = invite.status === 'active' && !isExpired && !isMaxUsed;

      return res.success(200, '验证完成', {
        invite,
        is_valid: isValid,
        is_expired: isExpired,
        is_max_used: isMaxUsed
      });
    } catch (error) {
      console.error('验证邮请码失败:', error);
      return res.error(500, '验证邮请码失败', error.message);
    }
  }

  /**
   * 管理员 - 使用邮请码
   */
  static async useInvite(req, res) {
    return res.error(501, '该功能仅限用户使用，请使用用户API');
  }

  /**
   * 管理员 - 获取邮请链接
   */
  static async getInviteLink(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT code, type FROM invite_codes WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在');
      }

      const invite = result.rows[0];
      const baseUrl = process.env.CLIENT_URL || 'http://localhost:8000';
      const link = `${baseUrl}/invite/${invite.code}`;

      return res.success(200, '获取邮请链接成功', { link, code: invite.code });
    } catch (error) {
      console.error('获取邮请链接失败:', error);
      return res.error(500, '获取邮请链接失败', error.message);
    }
  }

  /**
   * 管理员 - 重新生成邮请码
   */
  static async regenerateInvite(req, res) {
    try {
      const { id } = req.params;

      const newCode = InviteCodeController.prototype.generateRandomCode();

      const result = await pool.query(
        `UPDATE invite_codes 
         SET code = $1, uses_count = 0, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [newCode, id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在');
      }

      return res.success(200, '邮请码重新生成成功', { invite: result.rows[0] });
    } catch (error) {
      console.error('重新生成邮请码失败:', error);
      return res.error(500, '重新生成邮请码失败', error.message);
    }
  }

  /**
   * 管理员 - 获取邮请二维码
   */
  static async getInviteQRCode(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT code FROM invite_codes WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '邮请码不存在');
      }

      const baseUrl = process.env.CLIENT_URL || 'http://localhost:8000';
      const link = `${baseUrl}/invite/${result.rows[0].code}`;

      // 返回二维码链接，前端可以使用qrcode库生成
      return res.success(200, '获取二维码成功', { link, qr_data: link });
    } catch (error) {
      console.error('获取二维码失败:', error);
      return res.error(500, '获取二维码失败', error.message);
    }
  }
}

module.exports = InviteCodeController;