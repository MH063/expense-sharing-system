/**
 * 房间服务
 * 处理房间相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class RoomService extends BaseService {
  constructor() {
    super('rooms');
  }

  /**
   * 创建新房间
   * @param {Object} roomData - 房间数据
   * @returns {Promise<Object>} 创建的房间
   */
  async createRoom(roomData) {
    const id = uuidv4();
    const { name, description, creatorId } = roomData;
    const code = this.generateRoomCode();
    
    const sql = `
      INSERT INTO rooms (id, name, description, code, creator_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [id, name, description, code, creatorId, true];
    const result = await this.query(sql, values);
    
    // 创建房间后，将创建者添加为房间所有者
    if (result.rows.length > 0) {
      await this.addRoomMember(id, creatorId, 'owner');
    }
    
    return result.rows[0];
  }

  /**
   * 生成房间代码
   * @returns {string} 房间代码
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 根据代码查找房间
   * @param {string} code - 房间代码
   * @returns {Promise<Object|null>} 查找结果
   */
  async findByCode(code) {
    const sql = `SELECT * FROM rooms WHERE code = $1 AND is_active = $2`;
    const result = await this.query(sql, [code, true]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 获取用户创建的房间
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 用户创建的房间列表
   */
  async getUserCreatedRooms(userId) {
    const sql = `
      SELECT * FROM rooms 
      WHERE creator_id = $1 AND is_active = $2 
      ORDER BY created_at DESC
    `;
    const result = await this.query(sql, [userId, true]);
    return result.rows;
  }

  /**
   * 添加房间成员
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @param {string} relationType - 关系类型 (owner, admin, member)
   * @returns {Promise<Object>} 添加结果
   */
  async addRoomMember(roomId, userId, relationType = 'member') {
    const id = uuidv4();
    
    // 检查用户是否已经是房间成员
    const existingMember = await this.getRoomMember(roomId, userId);
    if (existingMember) {
      // 如果已经是成员，只更新关系类型和状态
      const sql = `
        UPDATE room_members 
        SET relation_type = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP
        WHERE room_id = $3 AND user_id = $4
        RETURNING *
      `;
      const result = await this.query(sql, [relationType, true, roomId, userId]);
      return result.rows[0];
    } else {
      // 如果不是成员，创建新记录
      const sql = `
        INSERT INTO room_members (id, room_id, user_id, relation_type, is_active, join_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const result = await this.query(sql, [id, roomId, userId, relationType, true]);
      return result.rows[0];
    }
  }

  /**
   * 获取房间成员
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} 房间成员信息
   */
  async getRoomMember(roomId, userId) {
    const sql = `
      SELECT * FROM room_members 
      WHERE room_id = $1 AND user_id = $2 AND is_active = $3
    `;
    const result = await this.query(sql, [roomId, userId, true]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 获取房间所有成员
   * @param {string} roomId - 房间ID
   * @returns {Promise<Array>} 房间成员列表
   */
  async getRoomMembers(roomId) {
    const sql = `
      SELECT u.*, rm.relation_type, rm.join_date
      FROM users u
      JOIN room_members rm ON u.id = rm.user_id
      WHERE rm.room_id = $1 AND rm.is_active = $2 AND u.is_active = $2
      ORDER BY rm.join_date ASC
    `;
    const result = await this.query(sql, [roomId, true]);
    return result.rows;
  }

  /**
   * 移除房间成员
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否移除成功
   */
  async removeRoomMember(roomId, userId) {
    const sql = `
      UPDATE room_members 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE room_id = $2 AND user_id = $3
    `;
    const result = await this.query(sql, [false, roomId, userId]);
    return result.rowCount > 0;
  }

  /**
   * 更新成员关系类型
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @param {string} relationType - 新的关系类型
   * @returns {Promise<Object|null>} 更新后的成员信息
   */
  async updateMemberRelation(roomId, userId, relationType) {
    const sql = `
      UPDATE room_members 
      SET relation_type = $1, updated_at = CURRENT_TIMESTAMP
      WHERE room_id = $2 AND user_id = $3 AND is_active = $4
      RETURNING *
    `;
    const result = await this.query(sql, [relationType, roomId, userId, true]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 检查用户是否是房间成员
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否是房间成员
   */
  async isRoomMember(roomId, userId) {
    const member = await this.getRoomMember(roomId, userId);
    return !!member;
  }

  /**
   * 检查用户是否有房间管理权限
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否有管理权限
   */
  async hasRoomPermission(roomId, userId) {
    const sql = `
      SELECT * FROM room_members 
      WHERE room_id = $1 AND user_id = $2 AND is_active = $3 
      AND relation_type IN ($4, $5)
    `;
    const result = await this.query(sql, [roomId, userId, true, 'owner', 'admin']);
    return result.rows.length > 0;
  }

  /**
   * 更新房间信息
   * @param {string} roomId - 房间ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object|null>} 更新后的房间信息
   */
  async updateRoom(roomId, updateData) {
    const allowedFields = ['name', 'description', 'is_active'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(roomId);

    const sql = `
      UPDATE rooms 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query(sql, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

module.exports = new RoomService();