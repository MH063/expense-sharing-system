/**
 * 第三方账号管理控制器
 */
const logger = require('../config/logger');
const { sequelize } = require('../models');
const {
  ThirdPartyAccount,
  ThirdPartyPlatform,
  ThirdPartyAccountLog
} = require('../models');

class ThirdPartyAccountController {
  /**
   * 获取用户的第三方账号列表
   */
  async getUserThirdPartyAccounts(req, res) {
    try {
      const userId = req.user.id;
      
      const accounts = await ThirdPartyAccount.findAll({
        where: { userId },
        include: [{
          model: ThirdPartyPlatform,
          as: 'platform',
          attributes: ['id', 'name', 'displayName', 'icon', 'isEnabled']
        }],
        attributes: { exclude: ['accessToken', 'refreshToken'] } // 不返回敏感信息
      });
      
      logger.info('获取用户第三方账号列表成功', { userId });
      res.success(200, '获取第三方账号列表成功', accounts);
    } catch (error) {
      logger.error('获取用户第三方账号列表失败:', error);
      res.error(500, '获取第三方账号列表失败', error.message);
    }
  }

  /**
   * 连接新的第三方账号
   */
  async connectThirdPartyAccount(req, res) {
    const t = await sequelize.transaction();
    try {
      const userId = req.user.id;
      const { platformId, accessToken, refreshToken, expiresAt } = req.body;
      
      // 验证平台是否存在且启用
      const platform = await ThirdPartyPlatform.findOne({
        where: { id: platformId, isEnabled: true }
      });
      
      if (!platform) {
        await t.rollback();
        return res.error(400, '平台不存在或未启用');
      }
      
      // 检查是否已经连接了该平台的账号
      const existingAccount = await ThirdPartyAccount.findOne({
        where: { userId, platformId }
      });
      
      if (existingAccount) {
        await t.rollback();
        return res.error(400, '该平台账号已连接');
      }
      
      // 创建第三方账号记录
      const account = await ThirdPartyAccount.create({
        userId,
        platformId,
        accessToken,
        refreshToken,
        expiresAt,
        isConnected: true
      }, { transaction: t });
      
      // 记录日志
      await ThirdPartyAccountLog.create({
        accountId: account.id,
        action: 'connect',
        details: `用户连接了${platform.displayName}账号`
      }, { transaction: t });
      
      await t.commit();
      
      logger.info('连接第三方账号成功', { userId, platformId });
      res.success(201, '连接第三方账号成功', account);
    } catch (error) {
      await t.rollback();
      logger.error('连接第三方账号失败:', error);
      res.error(500, '连接第三方账号失败', error.message);
    }
  }

  /**
   * 更新第三方账号配置
   */
  async updateThirdPartyAccount(req, res) {
    const t = await sequelize.transaction();
    try {
      const userId = req.user.id;
      const accountId = req.params.id;
      const { settings } = req.body;
      
      // 验证账号所有权
      const account = await ThirdPartyAccount.findOne({
        where: { id: accountId, userId }
      });
      
      if (!account) {
        await t.rollback();
        return res.error(404, '账号不存在或无权限');
      }
      
      // 更新账号配置
      await account.update({ settings }, { transaction: t });
      
      // 记录日志
      await ThirdPartyAccountLog.create({
        accountId: account.id,
        action: 'update',
        details: '用户更新了第三方账号配置'
      }, { transaction: t });
      
      await t.commit();
      
      logger.info('更新第三方账号配置成功', { userId, accountId });
      res.success(200, '更新第三方账号配置成功', account);
    } catch (error) {
      await t.rollback();
      logger.error('更新第三方账号配置失败:', error);
      res.error(500, '更新第三方账号配置失败', error.message);
    }
  }

  /**
   * 断开第三方账号连接
   */
  async disconnectThirdPartyAccount(req, res) {
    const t = await sequelize.transaction();
    try {
      const userId = req.user.id;
      const accountId = req.params.id;
      
      // 验证账号所有权
      const account = await ThirdPartyAccount.findOne({
        where: { id: accountId, userId },
        include: [{
          model: ThirdPartyPlatform,
          as: 'platform',
          attributes: ['displayName']
        }]
      });
      
      if (!account) {
        await t.rollback();
        return res.error(404, '账号不存在或无权限');
      }
      
      // 断开连接
      await account.update({ 
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null
      }, { transaction: t });
      
      // 记录日志
      await ThirdPartyAccountLog.create({
        accountId: account.id,
        action: 'disconnect',
        details: `用户断开了${account.platform.displayName}账号连接`
      }, { transaction: t });
      
      await t.commit();
      
      logger.info('断开第三方账号连接成功', { userId, accountId });
      res.success(200, '断开第三方账号连接成功');
    } catch (error) {
      await t.rollback();
      logger.error('断开第三方账号连接失败:', error);
      res.error(500, '断开第三方账号连接失败', error.message);
    }
  }

  /**
   * 获取支持的第三方平台列表
   */
  async getSupportedPlatforms(req, res) {
    try {
      const platforms = await ThirdPartyPlatform.findAll({
        where: { isEnabled: true },
        attributes: ['id', 'name', 'displayName', 'description', 'icon', 'authType']
      });
      
      logger.info('获取支持的第三方平台列表成功');
      res.success(200, '获取第三方平台列表成功', platforms);
    } catch (error) {
      logger.error('获取支持的第三方平台列表失败:', error);
      res.error(500, '获取第三方平台列表失败', error.message);
    }
  }

  /**
   * 管理员获取所有用户的第三方账号（仅管理员）
   */
  async getAllThirdPartyAccounts(req, res) {
    try {
      const { page = 1, limit = 10, userId, platformId } = req.query;
      
      // 构建查询条件
      const whereClause = {};
      if (userId) whereClause.userId = userId;
      if (platformId) whereClause.platformId = platformId;
      
      const { rows: accounts, count: total } = await ThirdPartyAccount.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ThirdPartyPlatform,
            as: 'platform',
            attributes: ['id', 'name', 'displayName', 'icon']
          },
          {
            model: require('../models').User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ],
        attributes: { exclude: ['accessToken', 'refreshToken'] }, // 不返回敏感信息
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['createdAt', 'DESC']]
      });
      
      logger.info('管理员获取所有第三方账号列表成功');
      res.success(200, '获取第三方账号列表成功', {
        accounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('管理员获取所有第三方账号列表失败:', error);
      res.error(500, '获取第三方账号列表失败', error.message);
    }
  }

  /**
   * 管理员断开用户第三方账号连接（仅管理员）
   */
  async adminDisconnectThirdPartyAccount(req, res) {
    const t = await sequelize.transaction();
    try {
      const accountId = req.params.id;
      
      // 获取账号信息
      const account = await ThirdPartyAccount.findOne({
        where: { id: accountId },
        include: [{
          model: ThirdPartyPlatform,
          as: 'platform',
          attributes: ['displayName']
        }]
      });
      
      if (!account) {
        await t.rollback();
        return res.error(404, '账号不存在');
      }
      
      // 断开连接
      await account.update({ 
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null
      }, { transaction: t });
      
      // 记录日志
      await ThirdPartyAccountLog.create({
        accountId: account.id,
        action: 'admin_disconnect',
        details: `管理员断开了用户${account.userId}的${account.platform.displayName}账号连接`,
        createdBy: req.user.id
      }, { transaction: t });
      
      await t.commit();
      
      logger.info('管理员断开用户第三方账号连接成功', { adminId: req.user.id, accountId });
      res.success(200, '断开第三方账号连接成功');
    } catch (error) {
      await t.rollback();
      logger.error('管理员断开用户第三方账号连接失败:', error);
      res.error(500, '断开第三方账号连接失败', error.message);
    }
  }
}

module.exports = new ThirdPartyAccountController();