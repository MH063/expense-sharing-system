/**
 * 用户偏好设置服务
 * 处理用户偏好设置相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class UserPreferencesService extends BaseService {
  constructor() {
    super('user_preferences');
  }

  /**
   * 获取用户偏好设置
   * @param {string} userId - 用户ID
   * @param {string} category - 偏好设置类别 (personal, notification, privacy, system)
   * @returns {Promise<Array>} 用户偏好设置列表
   */
  async getUserPreferences(userId, category = null) {
    let sql = `SELECT * FROM user_preferences WHERE user_id = $1`;
    const params = [userId];
    
    if (category) {
      sql += ` AND preference_category = $2`;
      params.push(category);
    }
    
    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * 获取用户特定偏好设置
   * @param {string} userId - 用户ID
   * @param {string} category - 偏好设置类别
   * @param {string} key - 偏好设置键
   * @returns {Promise<Object|null>} 用户偏好设置
   */
  async getUserPreference(userId, category, key) {
    const sql = `SELECT * FROM user_preferences WHERE user_id = $1 AND preference_category = $2 AND preference_key = $3`;
    const result = await this.query(sql, [userId, category, key]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 获取用户所有偏好设置（按类别分组）
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 按类别分组的用户偏好设置
   */
  async getUserPreferencesGrouped(userId) {
    const preferences = await this.getUserPreferences(userId);
    const grouped = {
      personal: {},
      notification: {},
      privacy: {},
      system: {}
    };
    
    preferences.forEach(pref => {
      grouped[pref.preference_category][pref.preference_key] = pref.preference_value;
    });
    
    return grouped;
  }

  /**
   * 创建或更新用户偏好设置
   * @param {string} userId - 用户ID
   * @param {string} category - 偏好设置类别
   * @param {string} key - 偏好设置键
   * @param {any} value - 偏好设置值
   * @returns {Promise<Object>} 创建或更新的偏好设置
   */
  async upsertUserPreference(userId, category, key, value) {
    // 检查偏好设置是否已存在
    const existingPref = await this.getUserPreference(userId, category, key);
    
    if (existingPref) {
      // 更新现有偏好设置
      const sql = `
        UPDATE user_preferences 
        SET preference_value = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      const result = await this.query(sql, [JSON.stringify(value), existingPref.id]);
      return result.rows[0];
    } else {
      // 创建新偏好设置
      const id = uuidv4();
      const sql = `
        INSERT INTO user_preferences (id, user_id, preference_category, preference_key, preference_value)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const result = await this.query(sql, [id, userId, category, key, JSON.stringify(value)]);
      return result.rows[0];
    }
  }

  /**
   * 批量更新用户偏好设置
   * @param {string} userId - 用户ID
   * @param {string} category - 偏好设置类别
   * @param {Object} preferences - 偏好设置对象
   * @returns {Promise<Array>} 更新的偏好设置列表
   */
  async batchUpdateUserPreferences(userId, category, preferences) {
    const results = [];
    
    for (const [key, value] of Object.entries(preferences)) {
      const result = await this.upsertUserPreference(userId, category, key, value);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 删除用户偏好设置
   * @param {string} userId - 用户ID
   * @param {string} category - 偏好设置类别
   * @param {string} key - 偏好设置键
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteUserPreference(userId, category, key) {
    const sql = `DELETE FROM user_preferences WHERE user_id = $1 AND preference_category = $2 AND preference_key = $3`;
    const result = await this.query(sql, [userId, category, key]);
    return result.rowCount > 0;
  }

  /**
   * 删除用户所有偏好设置
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteUserAllPreferences(userId) {
    const sql = `DELETE FROM user_preferences WHERE user_id = $1`;
    const result = await this.query(sql, [userId]);
    return result.rowCount > 0;
  }
}

module.exports = new UserPreferencesService();