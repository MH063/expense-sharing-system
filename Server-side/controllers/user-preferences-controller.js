/**
 * 用户偏好设置控制器
 * 处理用户偏好设置相关的请求
 */

const userPreferencesService = require('../services/database/user-preferences-service');
const { logger } = require('../config/logger');

class UserPreferencesController {
  /**
   * 获取用户所有偏好设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserPreferences(req, res) {
    try {
      const userId = req.user.sub;
      const { category } = req.query;
      
      let preferences;
      if (category) {
        preferences = await userPreferencesService.getUserPreferences(userId, category);
      } else {
        preferences = await userPreferencesService.getUserPreferencesGrouped(userId);
      }
      
      logger.info(`获取用户偏好设置成功，用户ID: ${userId}`);
      
      res.success(200, '获取用户偏好设置成功', preferences);
    } catch (error) {
      logger.error('获取用户偏好设置失败:', error);
      res.error(500, '获取用户偏好设置失败', error.message);
    }
  }

  /**
   * 获取用户特定偏好设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserPreference(req, res) {
    try {
      const userId = req.user.sub;
      const { category, key } = req.params;
      
      const preference = await userPreferencesService.getUserPreference(userId, category, key);
      
      if (!preference) {
        return res.error(404, '偏好设置不存在');
      }
      
      logger.info(`获取用户偏好设置成功，用户ID: ${userId}, 类别: ${category}, 键: ${key}`);
      
      res.success(200, '获取用户偏好设置成功', preference);
    } catch (error) {
      logger.error('获取用户偏好设置失败:', error);
      res.error(500, '获取用户偏好设置失败', error.message);
    }
  }

  /**
   * 更新用户偏好设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateUserPreference(req, res) {
    try {
      const userId = req.user.sub;
      const { category, key } = req.params;
      const { value } = req.body;
      
      if (value === undefined) {
        return res.error(400, '偏好设置值不能为空');
      }
      
      const preference = await userPreferencesService.upsertUserPreference(userId, category, key, value);
      
      logger.info(`更新用户偏好设置成功，用户ID: ${userId}, 类别: ${category}, 键: ${key}`);
      
      res.success(200, '更新用户偏好设置成功', preference);
    } catch (error) {
      logger.error('更新用户偏好设置失败:', error);
      res.error(500, '更新用户偏好设置失败', error.message);
    }
  }

  /**
   * 批量更新用户偏好设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async batchUpdateUserPreferences(req, res) {
    try {
      const userId = req.user.sub;
      const { category } = req.params;
      const { preferences } = req.body;
      
      if (!preferences || typeof preferences !== 'object') {
        return res.error(400, '偏好设置对象不能为空');
      }
      
      const results = await userPreferencesService.batchUpdateUserPreferences(userId, category, preferences);
      
      logger.info(`批量更新用户偏好设置成功，用户ID: ${userId}, 类别: ${category}`);
      
      res.success(200, '批量更新用户偏好设置成功', results);
    } catch (error) {
      logger.error('批量更新用户偏好设置失败:', error);
      res.error(500, '批量更新用户偏好设置失败', error.message);
    }
  }

  /**
   * 删除用户偏好设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deleteUserPreference(req, res) {
    try {
      const userId = req.user.sub;
      const { category, key } = req.params;
      
      const success = await userPreferencesService.deleteUserPreference(userId, category, key);
      
      if (!success) {
        return res.error(404, '偏好设置不存在');
      }
      
      logger.info(`删除用户偏好设置成功，用户ID: ${userId}, 类别: ${category}, 键: ${key}`);
      
      res.success(200, '删除用户偏好设置成功');
    } catch (error) {
      logger.error('删除用户偏好设置失败:', error);
      res.error(500, '删除用户偏好设置失败', error.message);
    }
  }
}

module.exports = new UserPreferencesController();