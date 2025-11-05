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
        return res.status(404).json({ 
          success: false, 
          message: '房间不存在' 
        });
      }

      if (roomResult.rows[0].creator_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: '只有房间管理员可以生成邀请码' 
        });
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

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: '邀请码生成成功'
      });
    } catch (error) {
      console.error('生成邀请码失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
        return res.status(400).json({
          success: false,
          message: '邀请码不能为空'
        });
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
        return res.status(404).json({
          success: false,
          message: '邀请码不存在'
        });
      }

      const inviteCode = result.rows[0];

      // 检查邀请码是否已过期
      if (new Date() > new Date(inviteCode.expires_at)) {
        return res.status(400).json({
          success: false,
          message: '邀请码已过期'
        });
      }

      // 检查邀请码是否已达到最大使用次数
      if (inviteCode.used_count >= inviteCode.max_uses) {
        return res.status(400).json({
          success: false,
          message: '邀请码使用次数已达上限'
        });
      }

      // 检查用户是否已经是房间成员
      const memberQuery = 'SELECT user_id FROM user_room_relations WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE';
      const memberResult = await this.pool.query(memberQuery, [inviteCode.room_id, userId]);
      
      if (memberResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: '您已经是该房间的成员'
        });
      }

      // 返回验证成功信息
      res.status(200).json({
        success: true,
        data: {
          id: inviteCode.id,
          room_id: inviteCode.room_id,
          room_name: inviteCode.room_name,
          room_admin: inviteCode.room_admin
        },
        message: '邀请码验证成功'
      });
    } catch (error) {
      console.error('验证邀请码失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
        return res.status(404).json({
          success: false,
          message: '邀请码不存在'
        });
      }

      const inviteCode = codeResult.rows[0];

      // 再次检查邀请码有效性
      if (new Date() > new Date(inviteCode.expires_at)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: '邀请码已过期'
        });
      }

      if (inviteCode.used_count >= inviteCode.max_uses) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: '邀请码使用次数已达上限'
        });
      }

      // 检查用户是否已经是房间成员
      const memberQuery = 'SELECT user_id FROM user_room_relations WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE';
      const memberResult = await client.query(memberQuery, [inviteCode.room_id, userId]);
      
      if (memberResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: '您已经是该房间的成员'
        });
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

      res.status(200).json({
        success: true,
        data: {
          room_id: inviteCode.room_id,
          room_name: inviteCode.room_name,
          member_id: joinResult.rows[0].id
        },
        message: '成功加入房间'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('使用邀请码失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
        return res.status(404).json({ 
          success: false, 
          message: '房间不存在' 
        });
      }

      if (roomResult.rows[0].creator_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: '只有房间管理员可以查看邀请码' 
        });
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

      res.status(200).json({
        success: true,
        data: result.rows,
        message: '获取邀请码列表成功'
      });
    } catch (error) {
      console.error('获取邀请码列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
        return res.status(404).json({
          success: false,
          message: '邀请码不存在'
        });
      }

      const inviteCode = result.rows[0];

      if (inviteCode.room_admin !== userId) {
        return res.status(403).json({
          success: false,
          message: '只有房间管理员可以撤销邀请码'
        });
      }

      // 撤销邀请码（设置过期时间为当前时间）
      const revokeQuery = 'UPDATE invite_codes SET revoked = TRUE, updated_at = NOW() WHERE id = $1';
      await this.pool.query(revokeQuery, [id]);

      res.status(200).json({
        success: true,
        message: '邀请码已撤销'
      });
    } catch (error) {
      console.error('撤销邀请码失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
}

module.exports = InviteCodeController;