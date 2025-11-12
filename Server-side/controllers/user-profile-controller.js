/**
 * 用户资料和设置控制器
 * 处理用户个人资料和系统设置相关的API请求
 */

const { validationResult } = require('express-validator');
const logger = require('../config/logger');
const { getEnvironmentConfig } = require('../config/environment');
const config = getEnvironmentConfig();
const { 
  User, 
  UserProfile, 
  UserSetting, 
  UserActivityLog, 
  LoginHistory,
  ThirdPartyAccount
} = require('../models');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

class UserProfileController {
  /**
   * 获取当前用户资料
   */
  async getUserProfile(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户资料，包括关联的用户信息
      const userProfile = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }, // 排除密码字段
        include: [
          {
            model: UserProfile,
            as: 'profile',
            attributes: { exclude: ['userId'] }
          },
          {
            model: UserSetting,
            as: 'settings',
            attributes: { exclude: ['userId'] }
          }
        ]
      });

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      logger.info('获取用户资料成功', { userId });
      
      return res.json({
        success: true,
        data: userProfile
      });
    } catch (error) {
      logger.error('获取用户资料失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新用户资料
   */
  async updateUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { username, email, phone, firstName, lastName, bio, website, location } = req.body;
      
      // 更新用户基本信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 检查用户名是否已被其他用户使用
      if (username && username !== user.username) {
        const existingUser = await User.findOne({
          where: {
            username: username,
            id: {
              [Op.ne]: userId
            }
          }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: '用户名已被使用'
          });
        }
        
        user.username = username;
      }

      // 检查邮箱是否已被其他用户使用
      if (email && email !== user.email) {
        const existingUser = await User.findOne({
          where: {
            email: email,
            id: {
              [Op.ne]: userId
            }
          }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: '邮箱已被使用'
          });
        }
        
        user.email = email;
      }

      if (phone) user.phone = phone;
      
      await user.save();

      // 更新或创建用户详细资料
      let profile = await UserProfile.findOne({ where: { userId } });
      
      if (!profile) {
        profile = await UserProfile.create({
          userId,
          firstName,
          lastName,
          bio,
          website,
          location
        });
      } else {
        await profile.update({
          firstName,
          lastName,
          bio,
          website,
          location
        });
      }

      logger.info('更新用户资料成功', { userId });
      
      return res.json({
        success: true,
        message: '用户资料更新成功',
        data: {
          user,
          profile
        }
      });
    } catch (error) {
      logger.error('更新用户资料失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新用户头像
   */
  async updateUserAvatar(req, res) {
    try {
      const userId = req.user.id;
      
      // 检查是否有上传的文件
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的头像文件'
        });
      }

      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        // 删除已上传的文件
        try {
          await fs.unlink(req.file.path);
        } catch (err) {
          logger.warn('删除未使用的头像文件失败:', err);
        }
        
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 删除旧头像文件（如果存在）
      if (user.avatar_url) {
        try {
          const oldAvatarPath = path.join(__dirname, '..', 'uploads', path.basename(user.avatar_url));
          await fs.unlink(oldAvatarPath);
        } catch (err) {
          logger.warn('删除旧头像文件失败:', err);
        }
      }

      // 更新用户头像URL
      const avatarUrl = `${config.server.baseUrl}/uploads/${req.file.filename}`;
      user.avatar_url = avatarUrl;
      await user.save();

      logger.info('更新用户头像成功', { userId, avatarUrl });
      
      return res.json({
        success: true,
        message: '头像更新成功',
        data: {
          avatar: avatarUrl
        }
      });
    } catch (error) {
      // 删除可能已上传的文件
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (err) {
          logger.warn('删除问题头像文件失败:', err);
        }
      }
      
      logger.error('更新用户头像失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更改密码
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证当前密码
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: '当前密码不正确'
        });
      }

      // 检查新密码是否与当前密码相同
      const isNewPasswordSame = await bcrypt.compare(newPassword, user.password);
      if (isNewPasswordSame) {
        return res.status(400).json({
          success: false,
          message: '新密码不能与当前密码相同'
        });
      }

      // 加密新密码
      const saltRounds = config.security.bcryptSaltRounds;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新密码
      user.password = hashedPassword;
      await user.save();

      // 记录密码更改日志
      await UserActivityLog.create({
        userId,
        action: 'change_password',
        details: '用户更改了密码'
      });

      logger.info('更改密码成功', { userId });
      
      return res.json({
        success: true,
        message: '密码更改成功'
      });
    } catch (error) {
      logger.error('更改密码失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取用户设置
   */
  async getUserSettings(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户设置
      let settings = await UserSetting.findOne({ where: { userId } });
      
      // 如果没有设置，创建默认设置
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          language: 'zh-CN',
          theme: 'light',
          timezone: 'Asia/Shanghai',
          currency: 'CNY',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          privacy: {
            profileVisibility: 'public',
            activityVisibility: 'friends'
          }
        });
      }

      logger.info('获取用户设置成功', { userId });
      
      return res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('获取用户设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新用户设置
   */
  async updateUserSettings(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const settingsData = req.body;
      
      // 更新或创建用户设置
      let settings = await UserSetting.findOne({ where: { userId } });
      
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          ...settingsData
        });
      } else {
        await settings.update(settingsData);
      }

      logger.info('更新用户设置成功', { userId });
      
      return res.json({
        success: true,
        message: '设置更新成功',
        data: settings
      });
    } catch (error) {
      logger.error('更新用户设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取支持的语言列表
   */
  async getSupportedLanguages(req, res) {
    try {
      const languages = [
        { code: 'zh-CN', name: '简体中文' },
        { code: 'zh-TW', name: '繁體中文' },
        { code: 'en', name: 'English' },
        { code: 'ja', name: '日本語' },
        { code: 'ko', name: '한국어' }
      ];

      return res.json({
        success: true,
        data: languages
      });
    } catch (error) {
      logger.error('获取支持的语言列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取支持的主题列表
   */
  async getSupportedThemes(req, res) {
    try {
      const themes = [
        { id: 'light', name: '浅色主题' },
        { id: 'dark', name: '深色主题' },
        { id: 'auto', name: '自动' }
      ];

      return res.json({
        success: true,
        data: themes
      });
    } catch (error) {
      logger.error('获取支持的主题列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;
      
      // 这里应该实现邮箱验证逻辑
      // 由于这是一个示例，我们直接返回成功
      
      // 记录邮箱验证日志
      await UserActivityLog.create({
        userId,
        action: 'verify_email',
        details: '用户验证了邮箱'
      });

      logger.info('邮箱验证成功', { userId });
      
      return res.json({
        success: true,
        message: '邮箱验证成功'
      });
    } catch (error) {
      logger.error('邮箱验证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendVerificationEmail(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 这里应该实现发送验证邮件的逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('发送邮箱验证邮件成功', { userId, email: user.email });
      
      return res.json({
        success: true,
        message: '验证邮件已发送到您的邮箱'
      });
    } catch (error) {
      logger.error('发送邮箱验证邮件失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新邮箱
   */
  async updateEmail(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: '密码不正确'
        });
      }

      // 检查邮箱是否已被其他用户使用
      const existingUser = await User.findOne({
        where: {
          email: email,
          id: {
            [Op.ne]: userId
          }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被使用'
        });
      }

      // 更新邮箱
      user.email = email;
      await user.save();

      // 记录邮箱更新日志
      await UserActivityLog.create({
        userId,
        action: 'update_email',
        details: `用户更新了邮箱为: ${email}`
      });

      logger.info('更新邮箱成功', { userId, email });
      
      return res.json({
        success: true,
        message: '邮箱更新成功',
        data: {
          email: user.email
        }
      });
    } catch (error) {
      logger.error('更新邮箱失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取安全设置
   */
  async getSecuritySettings(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 构建安全设置数据
      const securitySettings = {
        twoFactorAuth: user.twoFactorAuthEnabled || false,
        lastPasswordChange: user.updatedAt,
        loginAttempts: user.failedLoginAttempts || 0,
        lastLogin: user.lastLoginAt,
        trustedDevices: [] // 这里应该从设备管理表获取数据
      };

      return res.json({
        success: true,
        data: securitySettings
      });
    } catch (error) {
      logger.error('获取安全设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新安全设置
   */
  async updateSecuritySettings(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { twoFactorAuth } = req.body;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 更新安全设置
      if (twoFactorAuth !== undefined) {
        user.twoFactorAuthEnabled = twoFactorAuth;
      }
      
      await user.save();

      logger.info('更新安全设置成功', { userId });
      
      return res.json({
        success: true,
        message: '安全设置更新成功',
        data: {
          twoFactorAuth: user.twoFactorAuthEnabled
        }
      });
    } catch (error) {
      logger.error('更新安全设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取隐私设置
   */
  async getPrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户隐私设置
      let settings = await UserSetting.findOne({ where: { userId } });
      
      // 如果没有设置，创建默认设置
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          privacy: {
            profileVisibility: 'public',
            activityVisibility: 'friends'
          }
        });
      }

      const privacySettings = settings.privacy || {
        profileVisibility: 'public',
        activityVisibility: 'friends'
      };

      return res.json({
        success: true,
        data: privacySettings
      });
    } catch (error) {
      logger.error('获取隐私设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新隐私设置
   */
  async updatePrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const privacyData = req.body;
      
      // 更新用户隐私设置
      let settings = await UserSetting.findOne({ where: { userId } });
      
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          privacy: privacyData
        });
      } else {
        await settings.update({
          privacy: {
            ...settings.privacy,
            ...privacyData
          }
        });
      }

      logger.info('更新隐私设置成功', { userId });
      
      return res.json({
        success: true,
        message: '隐私设置更新成功',
        data: settings.privacy
      });
    } catch (error) {
      logger.error('更新隐私设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取通知设置
   */
  async getNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户通知设置
      let settings = await UserSetting.findOne({ where: { userId } });
      
      // 如果没有设置，创建默认设置
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        });
      }

      const notificationSettings = settings.notifications || {
        email: true,
        push: true,
        sms: false
      };

      return res.json({
        success: true,
        data: notificationSettings
      });
    } catch (error) {
      logger.error('获取通知设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新通知设置
   */
  async updateNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const notificationData = req.body;
      
      // 更新用户通知设置
      let settings = await UserSetting.findOne({ where: { userId } });
      
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          notifications: notificationData
        });
      } else {
        await settings.update({
          notifications: {
            ...settings.notifications,
            ...notificationData
          }
        });
      }

      logger.info('更新通知设置成功', { userId });
      
      return res.json({
        success: true,
        message: '通知设置更新成功',
        data: settings.notifications
      });
    } catch (error) {
      logger.error('更新通知设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取账户链接状态
   */
  async getAccountLinks(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户链接的第三方账户
      const linkedAccounts = await ThirdPartyAccount.findAll({
        where: { userId },
        attributes: ['id', 'provider', 'providerUserId', 'createdAt']
      });

      return res.json({
        success: true,
        data: linkedAccounts
      });
    } catch (error) {
      logger.error('获取账户链接状态失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 链接第三方账户
   */
  async linkThirdPartyAccount(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { provider, providerUserId, accessToken } = req.body;
      
      // 检查是否已经链接了该第三方账户
      const existingLink = await ThirdPartyAccount.findOne({
        where: {
          userId,
          provider
        }
      });
      
      if (existingLink) {
        return res.status(400).json({
          success: false,
          message: `您已经链接了${provider}账户`
        });
      }

      // 创建第三方账户链接
      const thirdPartyAccount = await ThirdPartyAccount.create({
        userId,
        provider,
        providerUserId,
        accessToken,
        refreshToken: req.body.refreshToken,
        expiresAt: req.body.expiresAt
      });

      logger.info('链接第三方账户成功', { userId, provider });
      
      return res.json({
        success: true,
        message: '第三方账户链接成功',
        data: thirdPartyAccount
      });
    } catch (error) {
      logger.error('链接第三方账户失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 断开第三方账户链接
   */
  async unlinkThirdPartyAccount(req, res) {
    try {
      const userId = req.user.id;
      const { provider } = req.params;
      
      // 查找要断开链接的第三方账户
      const thirdPartyAccount = await ThirdPartyAccount.findOne({
        where: {
          userId,
          provider
        }
      });
      
      if (!thirdPartyAccount) {
        return res.status(404).json({
          success: false,
          message: `未找到链接的${provider}账户`
        });
      }

      // 删除第三方账户链接
      await thirdPartyAccount.destroy();

      logger.info('断开第三方账户链接成功', { userId, provider });
      
      return res.json({
        success: true,
        message: '第三方账户链接已断开'
      });
    } catch (error) {
      logger.error('断开第三方账户链接失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取双因素认证状态
   */
  async getTwoFactorAuthStatus(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      return res.json({
        success: true,
        data: {
          enabled: user.twoFactorAuthEnabled || false,
          secret: user.twoFactorAuthSecret ? true : false
        }
      });
    } catch (error) {
      logger.error('获取双因素认证状态失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 启用双因素认证
   */
  async enableTwoFactorAuth(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 这里应该实现双因素认证启用逻辑
      // 由于这是一个示例，我们直接返回成功
      user.twoFactorAuthEnabled = true;
      await user.save();

      logger.info('启用双因素认证成功', { userId });
      
      return res.json({
        success: true,
        message: '双因素认证已启用'
      });
    } catch (error) {
      logger.error('启用双因素认证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 禁用双因素认证
   */
  async disableTwoFactorAuth(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 禁用双因素认证
      user.twoFactorAuthEnabled = false;
      user.twoFactorAuthSecret = null;
      await user.save();

      logger.info('禁用双因素认证成功', { userId });
      
      return res.json({
        success: true,
        message: '双因素认证已禁用'
      });
    } catch (error) {
      logger.error('禁用双因素认证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 验证双因素认证代码
   */
  async verifyTwoFactorAuthCode(req, res) {
    try {
      const userId = req.user.id;
      const { code } = req.body;
      
      // 这里应该实现双因素认证代码验证逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('验证双因素认证代码成功', { userId });
      
      return res.json({
        success: true,
        message: '双因素认证代码验证成功'
      });
    } catch (error) {
      logger.error('验证双因素认证代码失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取双因素认证恢复代码
   */
  async getTwoFactorRecoveryCodes(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现获取双因素认证恢复代码逻辑
      // 由于这是一个示例，我们返回模拟数据
      
      const recoveryCodes = [
        'XXXX-XXXX-XXXX-XXXX',
        'YYYY-YYYY-YYYY-YYYY',
        'ZZZZ-ZZZZ-ZZZZ-ZZZZ'
      ];

      return res.json({
        success: true,
        data: recoveryCodes
      });
    } catch (error) {
      logger.error('获取双因素认证恢复代码失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 生成新的双因素认证恢复代码
   */
  async generateTwoFactorRecoveryCodes(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现生成新的双因素认证恢复代码逻辑
      // 由于这是一个示例，我们返回模拟数据
      
      const recoveryCodes = [
        'AAAA-AAAA-AAAA-AAAA',
        'BBBB-BBBB-BBBB-BBBB',
        'CCCC-CCCC-CCCC-CCCC'
      ];

      logger.info('生成新的双因素认证恢复代码成功', { userId });
      
      return res.json({
        success: true,
        message: '新的恢复代码已生成',
        data: recoveryCodes
      });
    } catch (error) {
      logger.error('生成新的双因素认证恢复代码失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取账户活动日志
   */
  async getUserActivityLogs(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      
      // 获取用户活动日志
      const { rows, count } = await UserActivityLog.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      return res.json({
        success: true,
        data: {
          logs: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('获取账户活动日志失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取登录历史
   */
  async getLoginHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      
      // 获取登录历史
      const { rows, count } = await LoginHistory.findAndCountAll({
        where: { userId },
        order: [['loginAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      return res.json({
        success: true,
        data: {
          history: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('获取登录历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 注销所有设备
   */
  async logoutAllDevices(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现注销所有设备的逻辑
      // 例如清除所有用户的会话或令牌
      
      logger.info('注销所有设备成功', { userId });
      
      return res.json({
        success: true,
        message: '所有设备已注销'
      });
    } catch (error) {
      logger.error('注销所有设备失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除账户
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { password } = req.body;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: '密码不正确'
        });
      }

      // 这里应该实现账户删除逻辑
      // 由于这是一个示例，我们只记录日志而不实际删除
      
      logger.info('账户删除请求', { userId });
      
      return res.json({
        success: true,
        message: '账户删除请求已提交，将在24小时内处理'
      });
    } catch (error) {
      logger.error('删除账户失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 导出用户数据
   */
  async exportUserData(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现用户数据导出逻辑
      // 由于这是一个示例，我们返回模拟数据
      
      const userData = {
        user: {
          id: userId,
          username: 'example_user',
          email: 'user@example.com',
          createdAt: new Date()
        },
        profile: {
          firstName: 'Example',
          lastName: 'User',
          bio: 'Example user bio'
        },
        settings: {
          language: 'zh-CN',
          theme: 'light'
        }
      };

      logger.info('导出用户数据成功', { userId });
      
      return res.json({
        success: true,
        message: '用户数据导出请求已提交',
        data: userData
      });
    } catch (error) {
      logger.error('导出用户数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取数据使用统计
   */
  async getDataUsage(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现数据使用统计逻辑
      // 由于这是一个示例，我们返回模拟数据
      
      const usageStats = {
        storageUsed: '150MB',
        storageLimit: '1GB',
        fileCount: 42,
        lastActivity: new Date()
      };

      return res.json({
        success: true,
        data: usageStats
      });
    } catch (error) {
      logger.error('获取数据使用统计失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取账户统计信息
   */
  async getAccountStats(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现账户统计信息逻辑
      // 由于这是一个示例，我们返回模拟数据
      
      const accountStats = {
        totalLogins: 128,
        lastLogin: new Date(),
        accountAge: '2 years',
        totalActivity: 1256
      };

      return res.json({
        success: true,
        data: accountStats
      });
    } catch (error) {
      logger.error('获取账户统计信息失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取最近活动
   */
  async getRecentActivity(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;
      
      // 获取最近活动
      const recentActivity = await UserActivityLog.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      return res.json({
        success: true,
        data: recentActivity
      });
    } catch (error) {
      logger.error('获取最近活动失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取偏好设置
   */
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户偏好设置
      let settings = await UserSetting.findOne({ where: { userId } });
      
      // 如果没有设置，创建默认设置
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          preferences: {
            dashboardLayout: 'default',
            defaultView: 'list'
          }
        });
      }

      const preferences = settings.preferences || {
        dashboardLayout: 'default',
        defaultView: 'list'
      };

      return res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      logger.error('获取偏好设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新偏好设置
   */
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const preferencesData = req.body;
      
      // 更新用户偏好设置
      let settings = await UserSetting.findOne({ where: { userId } });
      
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          preferences: preferencesData
        });
      } else {
        await settings.update({
          preferences: {
            ...settings.preferences,
            ...preferencesData
          }
        });
      }

      logger.info('更新偏好设置成功', { userId });
      
      return res.json({
        success: true,
        message: '偏好设置更新成功',
        data: settings.preferences
      });
    } catch (error) {
      logger.error('更新偏好设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取自定义字段
   */
  async getCustomFields(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户自定义字段
      let settings = await UserSetting.findOne({ where: { userId } });
      
      // 如果没有设置，创建默认设置
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          customFields: {}
        });
      }

      const customFields = settings.customFields || {};

      return res.json({
        success: true,
        data: customFields
      });
    } catch (error) {
      logger.error('获取自定义字段失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新自定义字段
   */
  async updateCustomFields(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const customFieldsData = req.body;
      
      // 更新用户自定义字段
      let settings = await UserSetting.findOne({ where: { userId } });
      
      if (!settings) {
        settings = await UserSetting.create({
          userId,
          customFields: customFieldsData
        });
      } else {
        await settings.update({
          customFields: {
            ...settings.customFields,
            ...customFieldsData
          }
        });
      }

      logger.info('更新自定义字段成功', { userId });
      
      return res.json({
        success: true,
        message: '自定义字段更新成功',
        data: settings.customFields
      });
    } catch (error) {
      logger.error('更新自定义字段失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 验证当前密码
   */
  async validateCurrentPassword(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { password } = req.body;
      
      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      return res.json({
        success: true,
        data: {
          valid: isPasswordValid
        }
      });
    } catch (error) {
      logger.error('验证当前密码失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 检查用户名可用性
   */
  async checkUsernameAvailability(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { username } = req.body;
      
      // 检查用户名是否已被其他用户使用
      const existingUser = await User.findOne({
        where: {
          username: username,
          id: {
            [Op.ne]: userId
          }
        }
      });
      
      const available = !existingUser;

      return res.json({
        success: true,
        data: {
          available,
          message: available ? '用户名可用' : '用户名已被使用'
        }
      });
    } catch (error) {
      logger.error('检查用户名可用性失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 检查邮箱可用性
   */
  async checkEmailAvailability(req, res) {
    try {
      const userId = req.user.id;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { email } = req.body;
      
      // 检查邮箱是否已被其他用户使用
      const existingUser = await User.findOne({
        where: {
          email: email,
          id: {
            [Op.ne]: userId
          }
        }
      });
      
      const available = !existingUser;

      return res.json({
        success: true,
        data: {
          available,
          message: available ? '邮箱可用' : '邮箱已被使用'
        }
      });
    } catch (error) {
      logger.error('检查邮箱可用性失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取时区列表
   */
  async getTimezones(req, res) {
    try {
      // 这里应该返回实际的时区列表
      // 由于这是一个示例，我们返回一些常用的时区
      
      const timezones = [
        { id: 'Asia/Shanghai', name: '中国标准时间 (UTC+8)' },
        { id: 'Asia/Tokyo', name: '日本标准时间 (UTC+9)' },
        { id: 'America/New_York', name: '美国东部时间 (UTC-5)' },
        { id: 'Europe/London', name: '格林威治标准时间 (UTC+0)' },
        { id: 'Australia/Sydney', name: '澳大利亚东部时间 (UTC+10)' }
      ];

      return res.json({
        success: true,
        data: timezones
      });
    } catch (error) {
      logger.error('获取时区列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取货币列表
   */
  async getCurrencies(req, res) {
    try {
      // 这里应该返回实际的货币列表
      // 由于这是一个示例，我们返回一些常用的货币
      
      const currencies = [
        { code: 'CNY', name: '人民币', symbol: '¥' },
        { code: 'USD', name: '美元', symbol: '$' },
        { code: 'EUR', name: '欧元', symbol: '€' },
        { code: 'JPY', name: '日元', symbol: '¥' },
        { code: 'GBP', name: '英镑', symbol: '£' }
      ];

      return res.json({
        success: true,
        data: currencies
      });
    } catch (error) {
      logger.error('获取货币列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取国家列表
   */
  async getCountries(req, res) {
    try {
      // 这里应该返回实际的国家列表
      // 由于这是一个示例，我们返回一些常用的国家
      
      const countries = [
        { code: 'CN', name: '中国' },
        { code: 'US', name: '美国' },
        { code: 'JP', name: '日本' },
        { code: 'GB', name: '英国' },
        { code: 'AU', name: '澳大利亚' }
      ];

      return res.json({
        success: true,
        data: countries
      });
    } catch (error) {
      logger.error('获取国家列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取用户角色
   */
  async getUserRoles(req, res) {
    try {
      const userId = req.user.id;
      
      // 获取用户信息，包括角色
      const user = await User.findByPk(userId, {
        include: ['roles'] // 假设User模型有关联的角色关系
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 由于这是一个示例，我们返回模拟的角色数据
      const roles = [
        { id: 1, name: 'user', description: '用户' }
      ];

      return res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      logger.error('获取用户角色失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 请求账户数据删除
   */
  async requestDataDeletion(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现账户数据删除请求逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('请求账户数据删除', { userId });
      
      return res.json({
        success: true,
        message: '账户数据删除请求已提交，将在24小时内处理'
      });
    } catch (error) {
      logger.error('请求账户数据删除失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 取消账户数据删除请求
   */
  async cancelDataDeletionRequest(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现取消账户数据删除请求逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('取消账户数据删除请求', { userId });
      
      return res.json({
        success: true,
        message: '账户数据删除请求已取消'
      });
    } catch (error) {
      logger.error('取消账户数据删除请求失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取账户数据删除状态
   */
  async getDataDeletionStatus(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现获取账户数据删除状态逻辑
      // 由于这是一个示例，我们返回模拟数据
      
      const deletionStatus = {
        requested: false,
        scheduledDeletionDate: null,
        cancellationAllowed: false
      };

      return res.json({
        success: true,
        data: deletionStatus
      });
    } catch (error) {
      logger.error('获取账户数据删除状态失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取账户备份
   */
  async getAccountBackups(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现获取账户备份逻辑
      // 由于这是一个示例，我们返回模拟数据
      
      const backups = [
        {
          id: 1,
          name: '账户备份 2023-01-01',
          createdAt: new Date('2023-01-01'),
          size: '150MB'
        },
        {
          id: 2,
          name: '账户备份 2023-02-01',
          createdAt: new Date('2023-02-01'),
          size: '155MB'
        }
      ];

      return res.json({
        success: true,
        data: backups
      });
    } catch (error) {
      logger.error('获取账户备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建账户备份
   */
  async createAccountBackup(req, res) {
    try {
      const userId = req.user.id;
      
      // 这里应该实现创建账户备份逻辑
      // 由于这是一个示例，我们直接返回成功
      
      const backup = {
        id: 3,
        name: '账户备份 ' + new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        size: '160MB'
      };

      logger.info('创建账户备份成功', { userId, backupId: backup.id });
      
      return res.json({
        success: true,
        message: '账户备份创建成功',
        data: backup
      });
    } catch (error) {
      logger.error('创建账户备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 恢复账户备份
   */
  async restoreAccountBackup(req, res) {
    try {
      const userId = req.user.id;
      const { backupId } = req.params;
      
      // 这里应该实现恢复账户备份逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('恢复账户备份成功', { userId, backupId });
      
      return res.json({
        success: true,
        message: '账户备份恢复成功'
      });
    } catch (error) {
      logger.error('恢复账户备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除账户备份
   */
  async deleteAccountBackup(req, res) {
    try {
      const userId = req.user.id;
      const { backupId } = req.params;
      
      // 这里应该实现删除账户备份逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('删除账户备份成功', { userId, backupId });
      
      return res.json({
        success: true,
        message: '账户备份删除成功'
      });
    } catch (error) {
      logger.error('删除账户备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取账户备份详情
   */
  async getAccountBackupDetails(req, res) {
    try {
      const userId = req.user.id;
      const { backupId } = req.params;
      
      // 这里应该实现获取账户备份详情逻辑
      // 由于这是一个示例，我们返回模拟数据
      
      const backupDetails = {
        id: backupId,
        name: '账户备份 ' + new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        size: '160MB',
        files: [
          { name: '用户资料.json', size: '2KB' },
          { name: '设置.json', size: '1KB' },
          { name: '照片.zip', size: '159MB' }
        ]
      };

      return res.json({
        success: true,
        data: backupDetails
      });
    } catch (error) {
      logger.error('获取账户备份详情失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 下载账户备份
   */
  async downloadAccountBackup(req, res) {
    try {
      const userId = req.user.id;
      const { backupId } = req.params;
      
      // 这里应该实现下载账户备份逻辑
      // 由于这是一个示例，我们返回模拟响应
      
      logger.info('下载账户备份请求', { userId, backupId });
      
      return res.json({
        success: true,
        message: '账户备份下载链接已生成',
        data: {
          downloadUrl: `${config.server.baseUrl}/downloads/backup-${backupId}.zip`
        }
      });
    } catch (error) {
      logger.error('下载账户备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new UserProfileController();