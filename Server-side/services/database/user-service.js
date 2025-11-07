/**
 * 用户服务
 * 处理用户相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class UserService extends BaseService {
  constructor() {
    super('users');
  }

  /**
   * 根据用户名查找用户
   * @param {string} username - 用户名
   * @returns {Promise<Object|null>} 查找结果
   */
  async findByUsername(username) {
    const sql = `SELECT * FROM users WHERE username = $1`;
    const result = await this.query(sql, [username]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 根据邮箱查找用户
   * @param {string} email - 邮箱
   * @returns {Promise<Object|null>} 查找结果
   */
  async findByEmail(email) {
    const sql = `SELECT * FROM users WHERE email = $1`;
    const result = await this.query(sql, [email]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 创建新用户
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 创建的用户
   */
  async createUser(userData) {
    const id = uuidv4();
    const { username, email, password, name, avatar, phone } = userData;

    // 统一使用 password-service 进行哈希
    const { hashPassword } = require('../../password-service');
    const passwordHash = await hashPassword(password);
    
    const sql = `
      INSERT INTO users (id, username, email, password_hash, name, avatar, phone, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [id, username, email, passwordHash, name, avatar, phone, true];
    const result = await this.query(sql, values);
    const user = result.rows[0];
    delete user.password_hash;
    return user;
  }

  /**
   * 验证用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object|null>} 验证结果
   */
  async validateLogin(username, password) {
    const sql = `SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = $2`;
    const result = await this.query(sql, [username, true]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    const { verifyPassword } = require('../../password-service');
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return null;
    }
    
    // 返回用户信息，但不包含密码哈希
    delete user.password_hash;
    return user;
  }

  /**
   * 更新用户密码
   * @param {string} userId - 用户ID
   * @param {string} newPassword - 新密码
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updatePassword(userId, newPassword) {
    const sql = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    const result = await this.query(sql, [newPassword, userId]);
    return result.rowCount > 0;
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object|null>} 更新后的用户信息
   */
  async updateUser(userId, updateData) {
    const allowedFields = ['username', 'email', 'name', 'avatar', 'phone', 'is_active'];
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
    values.push(userId);

    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query(sql, values);
    if (result.rows.length === 0) {
      return null;
    }

    // 返回用户信息，但不包含密码
    const user = result.rows[0];
    delete user.password;
    return user;
  }

  /**
   * 获取用户所属的房间
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 用户所属的房间列表
   */
  async getUserRooms(userId) {
    const sql = `
      SELECT r.*, rm.relation_type, rm.join_date
      FROM rooms r
      JOIN room_members rm ON r.id = rm.room_id
      WHERE rm.user_id = $1 AND rm.is_active = $2 AND r.is_active = $2
      ORDER BY rm.join_date DESC
    `;
    const result = await this.query(sql, [userId, true]);
    return result.rows;
  }

  /**
   * 获取房间中的用户
   * @param {string} roomId - 房间ID
   * @returns {Promise<Array>} 房间中的用户列表
   */
  async getRoomUsers(roomId) {
    const sql = `
      SELECT u.id, u.username, u.email, u.name, u.avatar, u.phone, rm.relation_type, rm.join_date
      FROM users u
      JOIN room_members rm ON u.id = rm.user_id
      WHERE rm.room_id = $1 AND rm.is_active = $2 AND u.is_active = $2
      ORDER BY rm.join_date ASC
    `;
    const result = await this.query(sql, [roomId, true]);
    return result.rows;
  }
}

module.exports = new UserService();