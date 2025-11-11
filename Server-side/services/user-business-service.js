const { AppError } = require('../middleware/global-error-handler');
const ERROR_CODES = require('../constants/error-codes');
const userService = require('./database/user-service');
const permissionService = require('./permission-service');
const { hashPassword, verifyPassword } = require('./password-service');
const { logger } = require('../config/logger');
const { recordFailure, recordSuccess } = require('../middleware/bruteForceRedis');
const { isAccountLocked, resetFailedLoginAttempts, recordFailedLoginAttempt } = require('../middleware/securityEnhancements');
const { totpVerify } = require('../utils/totp');
const TokenService = require('./token-service');

/**
 * 用户业务服务
 * 处理用户相关的业务逻辑
 */

class UserBusinessService {
  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 注册结果
   */
  async register(userData) {
    const { username, password, email, name } = userData;
    
    try {
      // 检查用户名是否已存在
      const existingUser = await userService.findByUsername(username);
      if (existingUser) {
        throw new AppError(
          ERROR_CODES.BUSINESS_CONFLICT,
          '用户名已被注册',
          409
        );
      }
      
      // 检查邮箱是否已存在
      const existingEmail = await userService.findByEmail(email);
      if (existingEmail) {
        throw new AppError(
          ERROR_CODES.BUSINESS_CONFLICT,
          '邮箱已被注册',
          409
        );
      }
      
      // 密码强度验证
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(password)) {
        throw new AppError(
          ERROR_CODES.BUSINESS_VALIDATION_ERROR,
          '密码需包含大小写、数字、特殊字符且至少8位',
          400
        );
      }
      
      // 加密密码
      const hashedPassword = await hashPassword(password);
      
      // 创建用户
      const newUser = await userService.createUser({
        username,
        email,
        password: hashedPassword,
        name: name || username
      });
      
      logger.info('用户注册成功', { userId: newUser.id, username });
      return newUser;
    } catch (error) {
      // 如果已经是AppError，重新抛出
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('用户注册失败', { error: error.message, username, email });
      throw new AppError(
        ERROR_CODES.SYSTEM_INTERNAL_ERROR,
        '用户注册失败',
        500,
        { originalError: error.message }
      );
    }
  }
  
  /**
   * 用户登录
   * @param {string} identifier - 用户名或邮箱
   * @param {string} password - 密码
   * @param {string} mfaCode - 多因素验证码（可选）
   * @param {Object} req - 请求对象（用于记录安全事件）
   * @returns {Promise<Object>} 登录结果
   */
  async login(identifier, password, mfaCode, req) {
    try {
      // 查找用户
      const user = await userService.findByUsernameOrEmail(identifier);
      if (!user) {
        // 记录失败尝试
        if (req && req.ip && identifier) {
          await recordFailure(req.ip, identifier);
        }
        throw new Error('用户名或密码错误');
      }
      
      // 检查账户是否被锁定
      const lockStatus = await isAccountLocked(user.id);
      if (lockStatus.locked) {
        throw new Error('账户已被锁定，请稍后再试');
      }
      
      // 验证密码
      const isPasswordValid = await verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        // 记录登录失败尝试
        await recordFailedLoginAttempt(user.id);
        // 记录失败尝试
        if (req && req.ip && identifier) {
          await recordFailure(req.ip, identifier);
        }
        throw new Error('用户名或密码错误');
      }
      
      // 若启用 MFA，需要校验 TOTP
      if (user.mfa_enabled) {
        if (!mfaCode) {
          throw new Error('需要多因素验证码');
        }
        const ok = totpVerify(String(mfaCode), user.mfa_secret, { window: 1 });
        if (!ok) {
          // 记录登录失败尝试
          await recordFailedLoginAttempt(user.id);
          throw new Error('多因素验证码错误');
        }
      }
      
      // 重置登录失败计数
      await resetFailedLoginAttempts(user.id);
      
      // 获取用户角色和权限
      const roles = await permissionService.getUserRoles(user.id);
      const userRole = roles.length > 0 ? roles[0] : 'user';
      const permissions = await permissionService.getUserPermissions(user.id);
      
      // 移除密码字段
      const { password_hash, ...userWithoutPassword } = user;
      userWithoutPassword.role = userRole;
      
      // 记录登录成功
      if (req && req.ip && identifier) {
        await recordSuccess(req.ip, identifier);
      }
      
      logger.info('用户登录成功', { userId: user.id, username: user.username });
      
      return {
        user: userWithoutPassword,
        role: userRole,
        permissions
      };
    } catch (error) {
      logger.error('用户登录失败', { error: error.message, identifier });
      throw error;
    }
  }
  
  /**
   * 管理员登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {Object} req - 请求对象（用于记录安全事件）
   * @returns {Promise<Object>} 登录结果
   */
  async adminLogin(username, password, req) {
    try {
      // 查询管理员用户信息
      const user = await userService.findAdminUser(username);
      if (!user) {
        // 记录Redis暴力破解防护失败
        if (req && req.ip && username) {
          await recordFailure(req.ip, username);
        }
        throw new Error('用户名或密码错误');
      }
      
      // 验证密码
      const isPasswordValid = await verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        // 记录Redis暴力破解防护失败
        if (req && req.ip && username) {
          await recordFailure(req.ip, username);
        }
        throw new Error('用户名或密码错误');
      }
      
      // 获取管理员角色信息
      const userRole = 'admin';
      const permissions = ['read', 'write', 'admin'];
      
      // 移除密码字段
      const { password_hash, ...userWithoutPassword } = user;
      userWithoutPassword.role = userRole;
      
      // 记录Redis暴力破解防护成功
      if (req && req.ip && username) {
        await recordSuccess(req.ip, username);
      }
      
      logger.info('管理员登录成功', { username: user.username });
      
      return {
        user: userWithoutPassword,
        role: userRole,
        permissions
      };
    } catch (error) {
      logger.error('管理员登录失败', { error: error.message, username });
      throw error;
    }
  }

  /**
   * 用户登出
   * @param {Object} logoutData - 登出数据
   * @returns {Promise<boolean>} 是否登出成功
   */
  async logout(logoutData) {
    const { userId, username, accessToken, refreshToken } = logoutData;
    
    try {
      // 将访问令牌加入黑名单
      if (accessToken) {
        const result = TokenService.revokeToken(accessToken);
        if (result) {
          logger.info('访问令牌已加入黑名单', { userId, username });
        } else {
          logger.warn('访问令牌加入黑名单失败', { userId, username });
        }
      }
      
      // 将刷新令牌加入黑名单
      if (refreshToken) {
        const result = TokenService.revokeToken(refreshToken);
        if (result) {
          logger.info('刷新令牌已加入黑名单', { userId, username });
        } else {
          logger.warn('刷新令牌加入黑名单失败', { userId, username });
        }
      }
      
      logger.info('用户登出成功', { userId, username });
      return true;
    } catch (error) {
      logger.error('用户登出失败', { error: error.message, userId, username });
      throw error;
    }
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUser(userId, updateData) {
    const { username, email, name, avatar, phone } = updateData;
    
    try {
      // 检查用户名是否已存在（如果要更新用户名）
      if (username) {
        const existingUser = await userService.findByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('用户名已存在');
        }
      }
      
      // 检查邮箱是否已存在（如果要更新邮箱）
      if (email) {
        const existingUser = await userService.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('邮箱已存在');
        }
      }
      
      // 更新用户信息
      const updatedUser = await userService.updateUser(userId, {
        username,
        email,
        name,
        avatar,
        phone
      });
      
      if (!updatedUser) {
        throw new Error('用户不存在');
      }
      
      logger.info('用户信息更新成功', { userId, username: updatedUser.username });
      return updatedUser;
    } catch (error) {
      logger.error('用户信息更新失败', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * 更新用户密码
   * @param {string} userId - 用户ID
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updatePassword(userId, oldPassword, newPassword) {
    try {
      // 获取用户信息
      const user = await userService.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 验证旧密码
      const isOldPasswordValid = await verifyPassword(oldPassword, user.password_hash);
      if (!isOldPasswordValid) {
        throw new Error('旧密码错误');
      }
      
      // 密码强度验证
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(newPassword)) {
        throw new Error('新密码需包含大小写、数字、特殊字符且至少8位');
      }
      
      // 加密新密码
      const hashedNewPassword = await hashPassword(newPassword);
      
      // 更新密码
      const result = await userService.updatePassword(userId, hashedNewPassword);
      
      if (result) {
        logger.info('用户密码更新成功', { userId });
      } else {
        logger.warn('用户密码更新失败', { userId });
      }
      
      return result;
    } catch (error) {
      logger.error('用户密码更新失败', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * 获取用户详情
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户详情
   */
  async getUserDetail(userId) {
    try {
      const user = await userService.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      // 获取用户房间信息
      const rooms = await userService.getUserRooms(userId);
      user.rooms = rooms;
      
      logger.debug('获取用户详情成功', { userId });
      return user;
    } catch (error) {
      logger.error('获取用户详情失败', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * 获取用户房间列表
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 房间列表
   */
  async getUserRooms(userId) {
    try {
      const rooms = await userService.getUserRooms(userId);
      logger.debug('获取用户房间列表成功', { userId, roomCount: rooms.length });
      return rooms;
    } catch (error) {
      logger.error('获取用户房间列表失败', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = new UserBusinessService();