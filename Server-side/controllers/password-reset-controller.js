/**
 * 密码重置控制器
 * 处理用户密码重置相关的业务逻辑
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { 
  User, 
  PasswordResetToken, 
  PasswordResetLog, 
  PasswordResetConfig,
  PasswordResetTemplate,
  PasswordResetAuditLog,
  PasswordResetTask,
  PasswordResetConfigTemplate,
  sequelize
} = require('../models');
const { sendEmail } = require('../utils/notification-service');
const { validatePassword } = require('../utils/password-validator');
const { Op } = require('sequelize');
const logger = require('../config/logger').logger;

class PasswordResetController {
  /**
   * 请求密码重置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: '请提供邮箱地址'
        });
      }
      
      // 查找用户
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        // 为了安全，即使用户不存在也返回成功消息
        logger.warn(`密码重置请求失败，邮箱不存在: ${email}`);
        return res.status(200).json({
          success: true,
          message: '如果该邮箱已注册，您将收到密码重置邮件'
        });
      }
      
      // 检查用户状态
      if (user.status !== 'active') {
        logger.warn(`密码重置请求失败，用户状态不活跃: ${email}`);
        return res.status(400).json({
          success: false,
          message: '账户已被禁用，请联系管理员'
        });
      }
      
      // 检查是否已有未过期的重置令牌
      const existingToken = await PasswordResetToken.findOne({
        where: {
          userId: user.id,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        }
      });
      
      if (existingToken) {
        // 如果已有未过期的令牌，不生成新令牌
        logger.info(`用户 ${email} 已有未过期的密码重置令牌`);
        return res.status(200).json({
          success: true,
          message: '密码重置邮件已发送，请检查您的邮箱'
        });
      }
      
      // 生成重置令牌
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // 设置令牌过期时间（1小时）
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // 保存重置令牌
      await PasswordResetToken.create({
        userId: user.id,
        token: hashedToken,
        expiresAt,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // 记录日志
      await PasswordResetLog.create({
        userId: user.id,
        action: 'request',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      
      // 发送重置邮件
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendEmail({
        to: email,
        subject: '密码重置请求',
        template: 'password-reset',
        data: {
          userName: user.username || user.email,
          resetUrl,
          expiresAt: expiresAt.toLocaleString()
        }
      });
      
      logger.info(`密码重置邮件已发送给用户: ${email}`);
      
      res.status(200).json({
        success: true,
        message: '密码重置邮件已发送，请检查您的邮箱'
      });
    } catch (error) {
      logger.error('请求密码重置失败:', error);
      res.status(500).json({
        success: false,
        message: '请求密码重置失败，请稍后再试'
      });
    }
  }
  
  /**
   * 验证重置令牌
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async verifyResetToken(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: '缺少重置令牌'
        });
      }
      
      // 哈希令牌
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // 查找令牌
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token: hashedToken,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ]
      });
      
      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message: '重置令牌无效或已过期'
        });
      }
      
      // 记录日志
      await PasswordResetLog.create({
        userId: resetToken.userId,
        action: 'verify',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      
      res.status(200).json({
        success: true,
        message: '重置令牌有效',
        data: {
          userId: resetToken.User.id,
          username: resetToken.User.username,
          email: resetToken.User.email
        }
      });
    } catch (error) {
      logger.error('验证重置令牌失败:', error);
      res.status(500).json({
        success: false,
        message: '验证重置令牌失败，请稍后再试'
      });
    }
  }
  
  /**
   * 重置密码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: '缺少重置令牌或新密码'
        });
      }
      
      // 验证密码强度
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: '密码不符合要求',
          errors: passwordValidation.errors
        });
      }
      
      // 哈希令牌
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // 查找令牌
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token: hashedToken,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        }
      });
      
      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message: '重置令牌无效或已过期'
        });
      }
      
      // 查找用户
      const user = await User.findByPk(resetToken.userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 哈希新密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新用户密码
      await user.update({ password: hashedPassword });
      
      // 标记令牌为已使用
      await resetToken.update({ isUsed: true });
      
      // 记录日志
      await PasswordResetLog.create({
        userId: user.id,
        action: 'reset',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      
      // 发送密码重置成功通知邮件
      await sendEmail({
        to: user.email,
        subject: '密码重置成功',
        template: 'password-reset-success',
        data: {
          userName: user.username || user.email,
          resetTime: new Date().toLocaleString()
        }
      });
      
      logger.info(`用户 ${user.email} 密码重置成功`);
      
      res.status(200).json({
        success: true,
        message: '密码重置成功'
      });
    } catch (error) {
      logger.error('重置密码失败:', error);
      res.status(500).json({
        success: false,
        message: '重置密码失败，请稍后再试'
      });
    }
  }
  
  /**
   * 检查重置令牌状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkResetTokenStatus(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: '缺少重置令牌'
        });
      }
      
      // 哈希令牌
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // 查找令牌
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token: hashedToken
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ]
      });
      
      if (!resetToken) {
        return res.status(404).json({
          success: false,
          message: '重置令牌不存在'
        });
      }
      
      const now = new Date();
      const isExpired = resetToken.expiresAt < now;
      const isUsed = resetToken.isUsed;
      
      res.status(200).json({
        success: true,
        data: {
          token: resetToken.id,
          userId: resetToken.User.id,
          username: resetToken.User.username,
          email: resetToken.User.email,
          createdAt: resetToken.createdAt,
          expiresAt: resetToken.expiresAt,
          isExpired,
          isUsed,
          ip: resetToken.ip,
          userAgent: resetToken.userAgent
        }
      });
    } catch (error) {
      logger.error('检查重置令牌状态失败:', error);
      res.status(500).json({
        success: false,
        message: '检查重置令牌状态失败，请稍后再试'
      });
    }
  }
  
  /**
   * 取消密码重置请求
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async cancelPasswordReset(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: '缺少重置令牌'
        });
      }
      
      // 哈希令牌
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // 查找令牌
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token: hashedToken,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        }
      });
      
      if (!resetToken) {
        return res.status(404).json({
          success: false,
          message: '重置令牌不存在或已过期'
        });
      }
      
      // 检查权限
      if (resetToken.userId !== req.user.sub && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '没有权限取消此密码重置请求'
        });
      }
      
      // 标记令牌为已使用
      await resetToken.update({ isUsed: true });
      
      // 记录日志
      await PasswordResetLog.create({
        userId: resetToken.userId,
        action: 'cancel',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      
      logger.info(`密码重置请求已取消，令牌ID: ${resetToken.id}`);
      
      res.status(200).json({
        success: true,
        message: '密码重置请求已取消'
      });
    } catch (error) {
      logger.error('取消密码重置请求失败:', error);
      res.status(500).json({
        success: false,
        message: '取消密码重置请求失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置历史
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetHistory(req, res) {
    try {
      const { page = 1, limit = 10, userId, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const whereClause = {};
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 查询密码重置历史
      const { count, rows: resetHistory } = await PasswordResetToken.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.status(200).json({
        success: true,
        data: {
          resetHistory,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取密码重置历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置历史失败，请稍后再试'
      });
    }
  }
  
  /**
   * 验证密码强度
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async validatePasswordStrength(req, res) {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          success: false,
          message: '请提供密码'
        });
      }
      
      // 验证密码强度
      const passwordValidation = validatePassword(password);
      
      res.status(200).json({
        success: true,
        data: passwordValidation
      });
    } catch (error) {
      logger.error('验证密码强度失败:', error);
      res.status(500).json({
        success: false,
        message: '验证密码强度失败，请稍后再试'
      });
    }
  }
  
  /**
   * 检查邮箱是否已注册
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkEmailExists(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: '请提供邮箱地址'
        });
      }
      
      // 查找用户
      const user = await User.findOne({ 
        where: { email },
        attributes: ['id', 'username', 'email', 'status']
      });
      
      res.status(200).json({
        success: true,
        data: {
          exists: !!user,
          user: user ? {
            id: user.id,
            username: user.username,
            email: user.email,
            status: user.status
          } : null
        }
      });
    } catch (error) {
      logger.error('检查邮箱是否已注册失败:', error);
      res.status(500).json({
        success: false,
        message: '检查邮箱是否已注册失败，请稍后再试'
      });
    }
  }
  
  /**
   * 发送重置验证码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async sendResetVerificationCode(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: '请提供邮箱地址'
        });
      }
      
      // 查找用户
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        // 为了安全，即使用户不存在也返回成功消息
        return res.status(200).json({
          success: true,
          message: '如果该邮箱已注册，您将收到验证码'
        });
      }
      
      // 生成6位验证码
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 设置验证码过期时间（10分钟）
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      
      // 保存验证码
      await PasswordResetToken.create({
        userId: user.id,
        token: verificationCode,
        tokenType: 'verification_code',
        expiresAt,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // 发送验证码邮件
      await sendEmail({
        to: email,
        subject: '密码重置验证码',
        template: 'password-reset-code',
        data: {
          userName: user.username || user.email,
          verificationCode,
          expiresAt: expiresAt.toLocaleString()
        }
      });
      
      logger.info(`密码重置验证码已发送给用户: ${email}`);
      
      res.status(200).json({
        success: true,
        message: '验证码已发送，请检查您的邮箱'
      });
    } catch (error) {
      logger.error('发送重置验证码失败:', error);
      res.status(500).json({
        success: false,
        message: '发送验证码失败，请稍后再试'
      });
    }
  }
  
  /**
   * 验证重置验证码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async verifyResetCode(req, res) {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: '请提供邮箱和验证码'
        });
      }
      
      // 查找用户
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 查找验证码
      const resetToken = await PasswordResetToken.findOne({
        where: {
          userId: user.id,
          token: code,
          tokenType: 'verification_code',
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        }
      });
      
      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message: '验证码无效或已过期'
        });
      }
      
      // 记录日志
      await PasswordResetLog.create({
        userId: user.id,
        action: 'verify_code',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      
      res.status(200).json({
        success: true,
        message: '验证码验证成功',
        data: {
          userId: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      logger.error('验证重置验证码失败:', error);
      res.status(500).json({
        success: false,
        message: '验证验证码失败，请稍后再试'
      });
    }
  }
  
  /**
   * 通过验证码重置密码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async resetPasswordByCode(req, res) {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          message: '请提供邮箱、验证码和新密码'
        });
      }
      
      // 验证密码强度
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: '密码不符合要求',
          errors: passwordValidation.errors
        });
      }
      
      // 查找用户
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 查找验证码
      const resetToken = await PasswordResetToken.findOne({
        where: {
          userId: user.id,
          token: code,
          tokenType: 'verification_code',
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        }
      });
      
      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message: '验证码无效或已过期'
        });
      }
      
      // 哈希新密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新用户密码
      await user.update({ password: hashedPassword });
      
      // 标记验证码为已使用
      await resetToken.update({ isUsed: true });
      
      // 记录日志
      await PasswordResetLog.create({
        userId: user.id,
        action: 'reset_by_code',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      
      // 发送密码重置成功通知邮件
      await sendEmail({
        to: user.email,
        subject: '密码重置成功',
        template: 'password-reset-success',
        data: {
          userName: user.username || user.email,
          resetTime: new Date().toLocaleString()
        }
      });
      
      logger.info(`用户 ${user.email} 通过验证码重置密码成功`);
      
      res.status(200).json({
        success: true,
        message: '密码重置成功'
      });
    } catch (error) {
      logger.error('通过验证码重置密码失败:', error);
      res.status(500).json({
        success: false,
        message: '重置密码失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置配置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetConfig(req, res) {
    try {
      // 获取密码重置配置
      const config = await PasswordResetConfig.findOne();
      
      if (!config) {
        // 如果没有配置，创建默认配置
        const defaultConfig = await PasswordResetConfig.create({
          tokenExpiryHours: 1,
          maxAttemptsPerHour: 5,
          maxAttemptsPerDay: 10,
          requireEmailVerification: true,
          enableTwoFactorAuth: false,
          passwordMinLength: 8,
          passwordRequireUppercase: true,
          passwordRequireLowercase: true,
          passwordRequireNumbers: true,
          passwordRequireSpecialChars: true,
          preventReuse: true,
          preventReuseCount: 5,
          sessionInvalidateOnReset: true,
          emailNotificationOnReset: true,
          ipWhitelistEnabled: false,
          ipWhitelist: [],
          enabled: true
        });
        
        return res.status(200).json({
          success: true,
          data: defaultConfig
        });
      }
      
      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('获取密码重置配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置配置失败，请稍后再试'
      });
    }
  }
  
  /**
   * 更新密码重置配置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePasswordResetConfig(req, res) {
    try {
      const configData = req.body;
      
      // 获取现有配置
      let config = await PasswordResetConfig.findOne();
      
      if (!config) {
        // 如果没有配置，创建新配置
        config = await PasswordResetConfig.create({
          ...configData,
          updatedBy: req.user.sub
        });
      } else {
        // 更新现有配置
        await config.update({
          ...configData,
          updatedBy: req.user.sub
        });
      }
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'update_config',
        details: JSON.stringify(configData),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`密码重置配置已更新，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: '密码重置配置已更新',
        data: config
      });
    } catch (error) {
      logger.error('更新密码重置配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新密码重置配置失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // 构建日期范围
      const dateRange = {};
      if (startDate && endDate) {
        dateRange.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 获取密码重置统计
      const totalRequests = await PasswordResetToken.count({ where: dateRange });
      const successfulResets = await PasswordResetLog.count({
        where: {
          action: 'reset',
          status: 'success',
          ...dateRange
        }
      });
      const failedResets = await PasswordResetLog.count({
        where: {
          action: 'reset',
          status: 'failed',
          ...dateRange
        }
      });
      
      // 获取每日统计
      const dailyStats = await PasswordResetLog.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          ...dateRange
        },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
      });
      
      // 获取统计结果
      const formattedStats = dailyStats.map(stat => ({
        date: stat.createdAt,
        count: parseInt(stat.count),
        avgDuration: parseFloat(stat.avgDuration)
      }));

      return res.json({
        success: true,
        data: {
          totalRequests,
          successfulResets,
          failedResets,
          successRate: totalRequests > 0 ? (successfulResets / totalRequests * 100).toFixed(2) : 0,
          dailyStats: formattedStats
        }
      });
      
      res.status(200).json({
        success: true,
        data: {
          totalRequests,
          successfulResets,
          failedResets,
          successRate: totalRequests > 0 ? (successfulResets / totalRequests * 100).toFixed(2) : 0,
          dailyStats,
          actionStats
        }
      });
    } catch (error) {
      logger.error('获取密码重置统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置统计失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetLogs(req, res) {
    try {
      const { page = 1, limit = 10, userId, action, status, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const whereClause = {};
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      if (action) {
        whereClause.action = action;
      }
      
      if (status) {
        whereClause.status = status;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 查询密码重置日志
      const { count, rows: logs } = await PasswordResetLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取密码重置日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置日志失败，请稍后再试'
      });
    }
  }
  
  /**
   * 导出密码重置日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async exportPasswordResetLogs(req, res) {
    try {
      const { userId, action, status, startDate, endDate, format = 'csv' } = req.query;
      
      // 构建查询条件
      const whereClause = {};
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      if (action) {
        whereClause.action = action;
      }
      
      if (status) {
        whereClause.status = status;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 查询密码重置日志
      const logs = await PasswordResetLog.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      // 格式化数据
      const formattedLogs = logs.map(log => ({
        ID: log.id,
        用户ID: log.userId,
        用户名: log.User ? log.User.username : '',
        邮箱: log.User ? log.User.email : '',
        操作: log.action,
        状态: log.status,
        IP地址: log.ip,
        用户代理: log.userAgent,
        创建时间: log.createdAt,
        更新时间: log.updatedAt
      }));
      
      if (format === 'csv') {
        // 生成CSV
        const csv = this.convertToCSV(formattedLogs);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="password-reset-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        
        return res.status(200).send(csv);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="password-reset-logs-${new Date().toISOString().split('T')[0]}.json"`);
        
        return res.status(200).json({
          success: true,
          data: formattedLogs
        });
      } else {
        return res.status(400).json({
          success: false,
          message: '不支持的导出格式'
        });
      }
    } catch (error) {
      logger.error('导出密码重置日志失败:', error);
      res.status(500).json({
        success: false,
        message: '导出密码重置日志失败，请稍后再试'
      });
    }
  }
  
  /**
   * 批量取消密码重置请求
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async batchCancelPasswordReset(req, res) {
    try {
      const { tokenIds } = req.body;
      
      if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供要取消的令牌ID列表'
        });
      }
      
      // 批量更新令牌状态
      const [updatedCount] = await PasswordResetToken.update(
        { isUsed: true },
        {
          where: {
            id: {
              [Op.in]: tokenIds
            },
            isUsed: false,
            expiresAt: {
              [Op.gt]: new Date()
            }
          }
        }
      );
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'batch_cancel',
        details: JSON.stringify({ tokenIds, updatedCount }),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`批量取消密码重置请求完成，更新了 ${updatedCount} 个令牌，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: `成功取消 ${updatedCount} 个密码重置请求`,
        data: {
          requestedCount: tokenIds.length,
          updatedCount
        }
      });
    } catch (error) {
      logger.error('批量取消密码重置请求失败:', error);
      res.status(500).json({
        success: false,
        message: '批量取消密码重置请求失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取用户密码重置请求
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserPasswordResetRequests(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      // 查询用户的密码重置请求
      const { count, rows: requests } = await PasswordResetToken.findAndCountAll({
        where: {
          userId
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.status(200).json({
        success: true,
        data: {
          requests,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取用户密码重置请求失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户密码重置请求失败，请稍后再试'
      });
    }
  }
  
  /**
   * 清理过期的重置令牌
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async cleanupExpiredTokens(req, res) {
    try {
      // 删除过期的令牌
      const deletedCount = await PasswordResetToken.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      });
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'cleanup_expired_tokens',
        details: JSON.stringify({ deletedCount }),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`清理过期密码重置令牌完成，删除了 ${deletedCount} 个令牌，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: `成功清理 ${deletedCount} 个过期令牌`
      });
    } catch (error) {
      logger.error('清理过期重置令牌失败:', error);
      res.status(500).json({
        success: false,
        message: '清理过期令牌失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置安全设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetSecuritySettings(req, res) {
    try {
      // 获取密码重置配置
      const config = await PasswordResetConfig.findOne();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '密码重置配置不存在'
        });
      }
      
      // 提取安全相关设置
      const securitySettings = {
        tokenExpiryHours: config.tokenExpiryHours,
        maxAttemptsPerHour: config.maxAttemptsPerHour,
        maxAttemptsPerDay: config.maxAttemptsPerDay,
        requireEmailVerification: config.requireEmailVerification,
        enableTwoFactorAuth: config.enableTwoFactorAuth,
        passwordMinLength: config.passwordMinLength,
        passwordRequireUppercase: config.passwordRequireUppercase,
        passwordRequireLowercase: config.passwordRequireLowercase,
        passwordRequireNumbers: config.passwordRequireNumbers,
        passwordRequireSpecialChars: config.passwordRequireSpecialChars,
        preventReuse: config.preventReuse,
        preventReuseCount: config.preventReuseCount,
        sessionInvalidateOnReset: config.sessionInvalidateOnReset,
        ipWhitelistEnabled: config.ipWhitelistEnabled,
        ipWhitelist: config.ipWhitelist
      };
      
      res.status(200).json({
        success: true,
        data: securitySettings
      });
    } catch (error) {
      logger.error('获取密码重置安全设置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置安全设置失败，请稍后再试'
      });
    }
  }
  
  /**
   * 更新密码重置安全设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePasswordResetSecuritySettings(req, res) {
    try {
      const securitySettings = req.body;
      
      // 获取现有配置
      let config = await PasswordResetConfig.findOne();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '密码重置配置不存在'
        });
      }
      
      // 更新安全设置
      await config.update({
        tokenExpiryHours: securitySettings.tokenExpiryHours,
        maxAttemptsPerHour: securitySettings.maxAttemptsPerHour,
        maxAttemptsPerDay: securitySettings.maxAttemptsPerDay,
        requireEmailVerification: securitySettings.requireEmailVerification,
        enableTwoFactorAuth: securitySettings.enableTwoFactorAuth,
        passwordMinLength: securitySettings.passwordMinLength,
        passwordRequireUppercase: securitySettings.passwordRequireUppercase,
        passwordRequireLowercase: securitySettings.passwordRequireLowercase,
        passwordRequireNumbers: securitySettings.passwordRequireNumbers,
        passwordRequireSpecialChars: securitySettings.passwordRequireSpecialChars,
        preventReuse: securitySettings.preventReuse,
        preventReuseCount: securitySettings.preventReuseCount,
        sessionInvalidateOnReset: securitySettings.sessionInvalidateOnReset,
        ipWhitelistEnabled: securitySettings.ipWhitelistEnabled,
        ipWhitelist: securitySettings.ipWhitelist,
        updatedBy: req.user.sub
      });
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'update_security_settings',
        details: JSON.stringify(securitySettings),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`密码重置安全设置已更新，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: '密码重置安全设置已更新',
        data: config
      });
    } catch (error) {
      logger.error('更新密码重置安全设置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新密码重置安全设置失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置模板
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetTemplate(req, res) {
    try {
      const { type } = req.params;
      
      if (!type) {
        return res.status(400).json({
          success: false,
          message: '请提供模板类型'
        });
      }
      
      // 查找模板
      const template = await PasswordResetTemplate.findOne({
        where: {
          type
        }
      });
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        });
      }
      
      res.status(200).json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('获取密码重置模板失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置模板失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetStats(req, res) {
    try {
      const dailyStats = await PasswordResetStats.findAll({
        order: [['createdAt', 'DESC']]
      });
      
      // 获取统计结果
      const formattedStats = dailyStats.map(stat => ({
        date: stat.createdAt,
        count: parseInt(stat.count),
        avgDuration: parseFloat(stat.avgDuration)
      }));

      return res.json({
        success: true,
        data: formattedStats
      });
    } catch (error) {
      logger.error('获取密码重置统计失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
  /**
   * 更新密码重置模板
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePasswordResetTemplate(req, res) {
    try {
      const { type } = req.params;
      const { subject, content, htmlContent } = req.body;
      
      if (!type) {
        return res.status(400).json({
          success: false,
          message: '请提供模板类型'
        });
      }
      
      // 查找模板
      let template = await PasswordResetTemplate.findOne({
        where: {
          type
        }
      });
      
      if (!template) {
        // 如果模板不存在，创建新模板
        template = await PasswordResetTemplate.create({
          type,
          subject,
          content,
          htmlContent,
          updatedBy: req.user.sub
        });
      } else {
        // 更新现有模板
        await template.update({
          subject,
          content,
          htmlContent,
          updatedBy: req.user.sub
        });
      }
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'update_template',
        details: JSON.stringify({ type, subject }),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`密码重置模板已更新，类型: ${type}，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: '密码重置模板已更新',
        data: template
      });
    } catch (error) {
      logger.error('更新密码重置模板失败:', error);
      res.status(500).json({
        success: false,
        message: '更新密码重置模板失败，请稍后再试'
      });
    }
  }
  
  /**
   * 预览密码重置邮件
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async previewPasswordResetEmail(req, res) {
    try {
      const { type } = req.params;
      const { testEmail } = req.query;
      
      if (!type) {
        return res.status(400).json({
          success: false,
          message: '请提供模板类型'
        });
      }
      
      // 查找模板
      const template = await PasswordResetTemplate.findOne({
        where: {
          type
        }
      });
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        });
      }
      
      // 准备测试数据
      const testData = {
        userName: '测试用户',
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=test-token`,
        verificationCode: '123456',
        expiresAt: new Date(Date.now() + 3600000).toLocaleString(),
        resetTime: new Date().toLocaleString()
      };
      
      // 渲染模板
      let renderedContent = template.content;
      let renderedHtmlContent = template.htmlContent;
      
      // 简单的模板变量替换
      for (const [key, value] of Object.entries(testData)) {
        const placeholder = `{{${key}}}`;
        renderedContent = renderedContent.replace(new RegExp(placeholder, 'g'), value);
        if (renderedHtmlContent) {
          renderedHtmlContent = renderedHtmlContent.replace(new RegExp(placeholder, 'g'), value);
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          subject: template.subject,
          content: renderedContent,
          htmlContent: renderedHtmlContent
        }
      });
    } catch (error) {
      logger.error('预览密码重置邮件失败:', error);
      res.status(500).json({
        success: false,
        message: '预览密码重置邮件失败，请稍后再试'
      });
    }
  }
  
  /**
   * 测试密码重置邮件发送
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async testPasswordResetEmail(req, res) {
    try {
      const { type, testEmail } = req.body;
      
      if (!type || !testEmail) {
        return res.status(400).json({
          success: false,
          message: '请提供模板类型和测试邮箱'
        });
      }
      
      // 查找模板
      const template = await PasswordResetTemplate.findOne({
        where: {
          type
        }
      });
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        });
      }
      
      // 准备测试数据
      const testData = {
        userName: '测试用户',
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=test-token`,
        verificationCode: '123456',
        expiresAt: new Date(Date.now() + 3600000).toLocaleString(),
        resetTime: new Date().toLocaleString()
      };
      
      // 发送测试邮件
      await sendEmail({
        to: testEmail,
        subject: `[测试] ${template.subject}`,
        template: 'test-password-reset',
        data: {
          ...testData,
          templateSubject: template.subject,
          templateContent: template.content,
          templateHtmlContent: template.htmlContent
        }
      });
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'test_email',
        details: JSON.stringify({ type, testEmail }),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`密码重置测试邮件已发送，类型: ${type}，收件人: ${testEmail}，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: '测试邮件已发送'
      });
    } catch (error) {
      logger.error('测试密码重置邮件发送失败:', error);
      res.status(500).json({
        success: false,
        message: '测试邮件发送失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置频率限制
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetRateLimit(req, res) {
    try {
      // 获取密码重置配置
      const config = await PasswordResetConfig.findOne();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '密码重置配置不存在'
        });
      }
      
      // 提取频率限制设置
      const rateLimit = {
        maxAttemptsPerHour: config.maxAttemptsPerHour,
        maxAttemptsPerDay: config.maxAttemptsPerDay,
        tokenExpiryHours: config.tokenExpiryHours
      };
      
      res.status(200).json({
        success: true,
        data: rateLimit
      });
    } catch (error) {
      logger.error('获取密码重置频率限制失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置频率限制失败，请稍后再试'
      });
    }
  }
  
  /**
   * 更新密码重置频率限制
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePasswordResetRateLimit(req, res) {
    try {
      const { maxAttemptsPerHour, maxAttemptsPerDay, tokenExpiryHours } = req.body;
      
      // 获取现有配置
      let config = await PasswordResetConfig.findOne();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '密码重置配置不存在'
        });
      }
      
      // 更新频率限制设置
      await config.update({
        maxAttemptsPerHour,
        maxAttemptsPerDay,
        tokenExpiryHours,
        updatedBy: req.user.sub
      });
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'update_rate_limit',
        details: JSON.stringify({ maxAttemptsPerHour, maxAttemptsPerDay, tokenExpiryHours }),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`密码重置频率限制已更新，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: '密码重置频率限制已更新',
        data: config
      });
    } catch (error) {
      logger.error('更新密码重置频率限制失败:', error);
      res.status(500).json({
        success: false,
        message: '更新密码重置频率限制失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置IP白名单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetIpWhitelist(req, res) {
    try {
      // 获取密码重置配置
      const config = await PasswordResetConfig.findOne();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '密码重置配置不存在'
        });
      }
      
      // 提取IP白名单设置
      const ipWhitelist = {
        enabled: config.ipWhitelistEnabled,
        ips: config.ipWhitelist || []
      };
      
      res.status(200).json({
        success: true,
        data: ipWhitelist
      });
    } catch (error) {
      logger.error('获取密码重置IP白名单失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置IP白名单失败，请稍后再试'
      });
    }
  }
  
  /**
   * 更新密码重置IP白名单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePasswordResetIpWhitelist(req, res) {
    try {
      const { enabled, ips } = req.body;
      
      // 获取现有配置
      let config = await PasswordResetConfig.findOne();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '密码重置配置不存在'
        });
      }
      
      // 更新IP白名单设置
      await config.update({
        ipWhitelistEnabled: enabled,
        ipWhitelist: ips,
        updatedBy: req.user.sub
      });
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'update_ip_whitelist',
        details: JSON.stringify({ enabled, ips }),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`密码重置IP白名单已更新，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: '密码重置IP白名单已更新',
        data: config
      });
    } catch (error) {
      logger.error('更新密码重置IP白名单失败:', error);
      res.status(500).json({
        success: false,
        message: '更新密码重置IP白名单失败，请稍后再试'
      });
    }
  }
  
  /**
   * 检查IP是否在白名单中
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkIpInWhitelist(req, res) {
    try {
      const { ip } = req.body;
      
      if (!ip) {
        return res.status(400).json({
          success: false,
          message: '请提供IP地址'
        });
      }
      
      // 获取密码重置配置
      const config = await PasswordResetConfig.findOne();
      
      if (!config || !config.ipWhitelistEnabled) {
        return res.status(200).json({
          success: true,
          data: {
            inWhitelist: true,
            message: 'IP白名单未启用'
          }
        });
      }
      
      // 检查IP是否在白名单中
      const ipWhitelist = config.ipWhitelist || [];
      const inWhitelist = ipWhitelist.includes(ip);
      
      res.status(200).json({
        success: true,
        data: {
          ip,
          inWhitelist,
          whitelist: ipWhitelist
        }
      });
    } catch (error) {
      logger.error('检查IP是否在白名单中失败:', error);
      res.status(500).json({
        success: false,
        message: '检查IP是否在白名单中失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置黑名单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetBlacklist(req, res) {
    try {
      // 获取密码重置配置
      const config = await PasswordResetConfig.findOne();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '密码重置配置不存在'
        });
      }
      
      // 提取黑名单设置
      const blacklist = {
        enabled: config.blacklistEnabled,
        items: config.blacklist || []
      };
      
      res.status(200).json({
        success: true,
        data: blacklist
      });
    } catch (error) {
      logger.error('获取密码重置黑名单失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置黑名单失败，请稍后再试'
      });
    }
  }
  
  /**
   * 更新密码重置黑名单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePasswordResetBlacklist(req, res) {
    try {
      const { enabled, items } = req.body;
      
      // 获取现有配置
      let config = await PasswordResetConfig.findOne();
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '密码重置配置不存在'
        });
      }
      
      // 更新黑名单设置
      await config.update({
        blacklistEnabled: enabled,
        blacklist: items,
        updatedBy: req.user.sub
      });
      
      // 记录审计日志
      await PasswordResetAuditLog.create({
        userId: req.user.sub,
        action: 'update_blacklist',
        details: JSON.stringify({ enabled, items }),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      logger.info(`密码重置黑名单已更新，操作者ID: ${req.user.sub}`);
      
      res.status(200).json({
        success: true,
        message: '密码重置黑名单已更新',
        data: config
      });
    } catch (error) {
      logger.error('更新密码重置黑名单失败:', error);
      res.status(500).json({
        success: false,
        message: '更新密码重置黑名单失败，请稍后再试'
      });
    }
  }
  
  /**
   * 检查项目是否在黑名单中
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkItemInBlacklist(req, res) {
    try {
      const { item, type } = req.body;
      
      if (!item) {
        return res.status(400).json({
          success: false,
          message: '请提供要检查的项目'
        });
      }
      
      // 获取密码重置配置
      const config = await PasswordResetConfig.findOne();
      
      if (!config || !config.blacklistEnabled) {
        return res.status(200).json({
          success: true,
          data: {
            inBlacklist: false,
            message: '黑名单未启用'
          }
        });
      }
      
      // 检查项目是否在黑名单中
      const blacklist = config.blacklist || [];
      let inBlacklist = false;
      
      if (type === 'email') {
        inBlacklist = blacklist.some(entry => entry.type === 'email' && entry.value === item);
      } else if (type === 'ip') {
        inBlacklist = blacklist.some(entry => entry.type === 'ip' && entry.value === item);
      } else {
        // 通用检查
        inBlacklist = blacklist.some(entry => entry.value === item);
      }
      
      res.status(200).json({
        success: true,
        data: {
          item,
          type,
          inBlacklist,
          blacklist
        }
      });
    } catch (error) {
      logger.error('检查项目是否在黑名单中失败:', error);
      res.status(500).json({
        success: false,
        message: '检查项目是否在黑名单中失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置审计日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetAuditLogs(req, res) {
    try {
      const { page = 1, limit = 10, userId, action, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const whereClause = {};
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      if (action) {
        whereClause.action = action;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 查询密码重置审计日志
      const { count, rows: logs } = await PasswordResetAuditLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取密码重置审计日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置审计日志失败，请稍后再试'
      });
    }
  }
  
  /**
   * 导出密码重置审计日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async exportPasswordResetAuditLogs(req, res) {
    try {
      const { userId, action, startDate, endDate, format = 'csv' } = req.query;
      
      // 构建查询条件
      const whereClause = {};
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      if (action) {
        whereClause.action = action;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 查询密码重置审计日志
      const logs = await PasswordResetAuditLog.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      // 格式化数据
      const formattedLogs = logs.map(log => ({
        ID: log.id,
        用户ID: log.userId,
        用户名: log.User ? log.User.username : '',
        邮箱: log.User ? log.User.email : '',
        操作: log.action,
        详情: log.details,
        IP地址: log.ip,
        用户代理: log.userAgent,
        创建时间: log.createdAt,
        更新时间: log.updatedAt
      }));
      
      if (format === 'csv') {
        // 生成CSV
        const csv = this.convertToCSV(formattedLogs);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="password-reset-audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        
        return res.status(200).send(csv);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="password-reset-audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
        
        return res.status(200).json({
          success: true,
          data: formattedLogs
        });
      } else {
        return res.status(400).json({
          success: false,
          message: '不支持的导出格式'
        });
      }
    } catch (error) {
      logger.error('导出密码重置审计日志失败:', error);
      res.status(500).json({
        success: false,
        message: '导出密码重置审计日志失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置报告
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // 构建日期范围
      const dateRange = {};
      if (startDate && endDate) {
        dateRange.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 获取密码重置统计
      const totalRequests = await PasswordResetToken.count({ where: dateRange });
      const successfulResets = await PasswordResetLog.count({
        where: {
          action: 'reset',
          status: 'success',
          ...dateRange
        }
      });
      const failedResets = await PasswordResetLog.count({
        where: {
          action: 'reset',
          status: 'failed',
          ...dateRange
        }
      });
      
      // 获取每日统计
      const dailyStats = await PasswordResetLog.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          ...dateRange
        },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
      });
      
      // 获取统计结果
      const formattedStats = dailyStats.map(stat => ({
        date: stat.createdAt,
        count: parseInt(stat.count),
        avgDuration: parseFloat(stat.avgDuration)
      }));

      return res.json({
        success: true,
        data: {
          totalRequests,
          successfulResets,
          failedResets,
          successRate: totalRequests > 0 ? (successfulResets / totalRequests * 100).toFixed(2) : 0,
          dailyStats: formattedStats
        }
      });
    } catch (error) {
      logger.error('获取密码重置报告失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置报告失败，请稍后再试'
      });
    }
  }
  
  /**
   * 生成密码重置报告
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generatePasswordResetReport(req, res) {
    try {
      const { startDate, endDate, format = 'pdf' } = req.body;
      
      // 构建日期范围
      const dateRange = {};
      if (startDate && endDate) {
        dateRange.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 获取密码重置统计
      const totalRequests = await PasswordResetToken.count({ where: dateRange });
      const successfulResets = await PasswordResetLog.count({
        where: {
          action: 'reset',
          status: 'success',
          ...dateRange
        }
      });
      const failedResets = await PasswordResetLog.count({
        where: {
          action: 'reset',
          status: 'failed',
          ...dateRange
        }
      });
      
      // 获取每日统计
      const dailyStats = await PasswordResetLog.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          ...dateRange
        },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
      });
      
      // 获取统计结果
      const formattedStats = dailyStats.map(stat => ({
        date: stat.createdAt,
        count: parseInt(stat.count),
        avgDuration: parseFloat(stat.avgDuration)
      }));

      return res.json({
        success: true,
        data: {
          totalRequests,
          successfulResets,
          failedResets,
          successRate: totalRequests > 0 ? (successfulResets / totalRequests * 100).toFixed(2) : 0,
          dailyStats: formattedStats
        }
      });
      
      // 获取状态统计
      const statusStats = await PasswordResetLog.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          ...dateRange
        },
        group: ['status']
      });
      
      // 获取IP统计
      const ipStats = await PasswordResetLog.findAll({
        attributes: [
          'ip',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          ...dateRange
        },
        group: ['ip'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10
      });
      
      // 获取用户代理统计
      const userAgentStats = await PasswordResetLog.findAll({
        attributes: [
          'userAgent',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          ...dateRange
        },
        group: ['userAgent'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10
      });
      
      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalRequests,
            successfulResets,
            failedResets,
            successRate: totalRequests > 0 ? (successfulResets / totalRequests * 100).toFixed(2) : 0
          },
          dailyStats,
          actionStats,
          statusStats,
          ipStats,
          userAgentStats
        }
      });
    } catch (error) {
      logger.error('获取密码重置报告失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置报告失败，请稍后再试'
      });
    }
  }
  
  /**
   * 生成密码重置报告
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generatePasswordResetReport(req, res) {
    try {
      const { startDate, endDate, format = 'pdf' } = req.body;
      
      // 构建日期范围
      const dateRange = {};
      if (startDate && endDate) {
        dateRange.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 获取密码重置统计
      const totalRequests = await PasswordResetToken.count({ where: dateRange });
      const successfulResets = await PasswordResetLog.count({
        where: {
          action: 'reset',
          status: 'success',
          ...dateRange
        }
      });
      const failedResets = await PasswordResetLog.count({
        where: {
          action: 'reset',
          status: 'failed',
          ...dateRange
        }
      });
      
      // 获取每日统计
      const dailyStats = await PasswordResetLog.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          ...dateRange
        },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
      });
      
      // 获取统计结果
      const formattedStats = dailyStats.map(stat => ({
        date: stat.createdAt,
        count: parseInt(stat.count),
        avgDuration: parseFloat(stat.avgDuration)
      }));

      return res.json({
        success: true,
        data: {
          totalRequests,
          successfulResets,
          failedResets,
          successRate: totalRequests > 0 ? (successfulResets / totalRequests * 100).toFixed(2) : 0,
          dailyStats: formattedStats
        }
      });
    } catch (error) {
      logger.error('获取密码重置统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取密码重置统计失败，请稍后再试'
      });
    }
  }
  
  /**
   * 获取密码重置分析数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPasswordResetAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // 构建日期范围
      const dateRange = {};
      if (startDate && endDate) {
        dateRange.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      // 获取密码重置请求趋势
      const requestTrends = await PasswordResetToken.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          ...dateRange
        },
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
      });
      
      // 获取统计结果
      const formattedStats = requestTrends.map(trend => ({
        date: trend.date,
        count: parseInt(trend.count)
      }));

      return res.json({
        success: true,
        data: formattedStats
      });
    } catch (error) {
      logger.error('获取密码重置分析数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new PasswordResetController();