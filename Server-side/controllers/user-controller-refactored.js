/**
 * 重构后的用户控制器
 * 使用BaseController和DatabaseHelper简化代码，提高代码质量和可维护性
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { BaseController } = require('./base-controller');
const { DatabaseHelper } = require('../utils/database-helper');
const { TokenManager } = require('../middleware/tokenManager');
const { recordFailedLoginAttempt, resetFailedLoginAttempts, isAccountLocked } = require('../middleware/securityEnhancements');
const { recordFailure, recordSuccess } = require('../middleware/bruteForceRedis');
const { 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError, 
  ConflictError,
  DatabaseError
} = require('../middleware/unified-error-handler');

/**
 * 用户控制器
 * 处理用户相关的业务逻辑
 */
class UserController extends BaseController {
  constructor() {
    super('user');
  }

  /**
   * 用户注册
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async register(req, res, next) {
    const requestId = req.requestId;
    const { username, password, email, displayName } = req.body;

    // 验证必填字段
    this.validateRequiredFields(req.body, ['username', 'password', 'email'], requestId);

    // 密码强度验证：至少8位，包含大小写、数字、特殊字符各一
    const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    if (!strongPwd.test(password)) {
      throw new ValidationError('密码需包含大小写、数字、特殊字符且至少8位');
    }

    // 检查用户名是否已存在
    const existingUsername = await DatabaseHelper.queryOne(
      'SELECT id FROM users WHERE username = $1',
      [username],
      requestId
    );

    if (existingUsername) {
      throw new ConflictError('用户名已被注册');
    }

    // 检查邮箱是否已存在
    const existingEmail = await DatabaseHelper.queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email],
      requestId
    );

    if (existingEmail) {
      throw new ConflictError('邮箱已被注册');
    }

    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const user = await this.createResource(
      'users',
      {
        username,
        password_hash: hashedPassword,
        email,
        display_name: displayName || username
      },
      requestId
    );

    // 返回用户信息（不包含密码）
    const userResponse = await DatabaseHelper.queryOne(
      'SELECT id, username, email, display_name, created_at FROM users WHERE id = $1',
      [user.id],
      requestId
    );

    return res.success(201, '用户注册成功', userResponse);
  }

  /**
   * 管理员登录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async adminLogin(req, res, next) {
    const requestId = req.requestId;
    const { username, password } = req.body;

    // 验证必填字段
    this.validateRequiredFields(req.body, ['username', 'password'], requestId);

    // 查询管理员用户信息
    const user = await DatabaseHelper.queryOne(
      `SELECT u.id, u.username, u.password_hash 
       FROM users u 
       JOIN user_roles ur ON u.id = ur.user_id 
       JOIN roles r ON ur.role_id = r.id 
       WHERE u.username = $1 AND r.name = '系统管理员'`,
      [username],
      requestId
    );

    if (!user) {
      // 记录Redis暴力破解防护失败
      if (req.ip && username) {
        await recordFailure(req.ip, username);
      }
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // 记录Redis暴力破解防护失败
      if (req.ip && username) {
        await recordFailure(req.ip, username);
      }
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 生成JWT令牌
    const accessToken = TokenManager.generateAccessToken({
      sub: user.id.toString(),
      username: user.username,
      roles: ['admin'],
      permissions: ['read', 'write', 'admin']
    });

    const refreshToken = TokenManager.generateRefreshToken(user.id.toString());

    // 更新最后登录时间
    try {
      await DatabaseHelper.update(
        'users',
        { updated_at: new Date() },
        { id: user.id },
        requestId
      );
    } catch (error) {
      this.logger.warn(`[${requestId}] 无法更新users表的updated_at字段`, {
        requestId,
        error: error.message
      });
    }

    // 记录Redis暴力破解防护成功
    if (req.ip && username) {
      await recordSuccess(req.ip, username);
    }

    return res.success(200, '管理员登录成功', {
      user: {
        id: user.id,
        username: user.username,
        role: 'admin'
      },
      accessToken,
      refreshToken
    });
  }

  /**
   * 用户登录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async login(req, res, next) {
    const requestId = req.requestId;
    const { username, password } = req.body;

    // 验证必填字段
    this.validateRequiredFields(req.body, ['username', 'password'], requestId);

    // 查找用户 - 支持用户名或邮箱登录
    const user = await DatabaseHelper.queryOne(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username],
      requestId
    );

    if (!user) {
      // 记录Redis暴力破解防护失败
      if (req.ip && username) {
        await recordFailure(req.ip, username);
      }
      throw new UnauthorizedError('登录信息不正确');
    }

    // 检查账户是否被锁定
    const isLocked = await isAccountLocked(user.id);
    if (isLocked) {
      this.logger.warn(`[${requestId}] 用户账户被锁定`, {
        requestId,
        userId: user.id,
        username: user.username
      });
      
      throw new ForbiddenError('账户已被锁定，请稍后再试');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // 记录Redis暴力破解防护失败
      if (req.ip && username) {
        await recordFailure(req.ip, username);
      }
      
      // 记录失败登录尝试
      await recordFailedLoginAttempt(user.id);
      
      throw new UnauthorizedError('登录信息不正确');
    }

    // 重置失败登录尝试计数
    await resetFailedLoginAttempts(user.id);

    // 获取用户角色
    const userRoles = await DatabaseHelper.queryMany(
      `SELECT r.name FROM roles r 
       JOIN user_roles ur ON r.id = ur.role_id 
       WHERE ur.user_id = $1`,
      [user.id],
      requestId
    );

    const roles = userRoles.map(role => role.name);

    // 生成JWT令牌
    const accessToken = TokenManager.generateAccessToken({
      sub: user.id.toString(),
      username: user.username,
      roles,
      permissions: ['read', 'write']
    });

    const refreshToken = TokenManager.generateRefreshToken(user.id.toString());

    // 更新最后登录时间
    try {
      await DatabaseHelper.update(
        'users',
        { updated_at: new Date() },
        { id: user.id },
        requestId
      );
    } catch (error) {
      this.logger.warn(`[${requestId}] 无法更新users表的updated_at字段`, {
        requestId,
        error: error.message
      });
    }

    // 记录Redis暴力破解防护成功
    if (req.ip && username) {
      await recordSuccess(req.ip, username);
    }

    // 返回用户信息（不包含密码）
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      roles
    };

    return res.success(200, '登录成功', {
      user: userResponse,
      accessToken,
      refreshToken
    });
  }

  /**
   * 获取当前用户信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getCurrentUser(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;

    // 获取用户信息
    const user = await DatabaseHelper.queryOne(
      'SELECT id, username, email, display_name, created_at FROM users WHERE id = $1',
      [userId],
      requestId
    );

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 获取用户角色
    const userRoles = await DatabaseHelper.queryMany(
      `SELECT r.name FROM roles r 
       JOIN user_roles ur ON r.id = ur.role_id 
       WHERE ur.user_id = $1`,
      [userId],
      requestId
    );

    const roles = userRoles.map(role => role.name);

    const userResponse = {
      ...user,
      roles
    };

    return res.success(200, '获取用户信息成功', userResponse);
  }

  /**
   * 修改密码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async changePassword(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;
    const { currentPassword, newPassword } = req.body;

    // 验证必填字段
    this.validateRequiredFields(req.body, ['currentPassword', 'newPassword'], requestId);

    // 密码强度验证：至少8位，包含大小写、数字、特殊字符各一
    const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    if (!strongPwd.test(newPassword)) {
      throw new ValidationError('新密码需包含大小写、数字、特殊字符且至少8位');
    }

    // 获取用户当前密码
    const user = await DatabaseHelper.queryOne(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId],
      requestId
    );

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('当前密码不正确');
    }

    // 加密新密码
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await DatabaseHelper.update(
      'users',
      { 
        password_hash: hashedNewPassword,
        updated_at: new Date()
      },
      { id: userId },
      requestId
    );

    return res.success(200, '密码修改成功');
  }

  /**
   * 更新用户信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async updateProfile(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;
    const { email, displayName } = req.body;

    // 获取当前用户信息
    const currentUser = await DatabaseHelper.queryOne(
      'SELECT id, username, email, display_name FROM users WHERE id = $1',
      [userId],
      requestId
    );

    if (!currentUser) {
      throw new NotFoundError('用户不存在');
    }

    // 如果更新邮箱，检查邮箱是否已被其他用户使用
    if (email && email !== currentUser.email) {
      const existingEmail = await DatabaseHelper.queryOne(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId],
        requestId
      );

      if (existingEmail) {
        throw new ConflictError('邮箱已被其他用户使用');
      }
    }

    // 准备更新数据
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (displayName !== undefined) updateData.display_name = displayName;
    updateData.updated_at = new Date();

    // 更新用户信息
    const updatedUser = await DatabaseHelper.update(
      'users',
      updateData,
      { id: userId },
      requestId
    );

    // 返回更新后的用户信息（不包含密码）
    const userResponse = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      display_name: updatedUser.display_name
    };

    return res.success(200, '用户信息更新成功', userResponse);
  }

  /**
   * 刷新令牌
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async refreshToken(req, res, next) {
    const requestId = req.requestId;
    const { refreshToken } = req.body;

    // 验证必填字段
    this.validateRequiredFields(req.body, ['refreshToken'], requestId);

    // 验证刷新令牌
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const userId = decoded.userId;

      // 获取用户信息
      const user = await DatabaseHelper.queryOne(
        'SELECT id, username FROM users WHERE id = $1',
        [userId],
        requestId
      );

      if (!user) {
        throw new UnauthorizedError('用户不存在');
      }

      // 获取用户角色
      const userRoles = await DatabaseHelper.queryMany(
        `SELECT r.name FROM roles r 
         JOIN user_roles ur ON r.id = ur.role_id 
         WHERE ur.user_id = $1`,
        [userId],
        requestId
      );

      const roles = userRoles.map(role => role.name);

      // 生成新的JWT令牌
      const newAccessToken = TokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles,
        permissions: ['read', 'write']
      });

      const newRefreshToken = TokenManager.generateRefreshToken(user.id.toString());

      return res.success(200, '令牌刷新成功', {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      throw new UnauthorizedError('无效的刷新令牌');
    }
  }

  /**
   * 登出
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async logout(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;

    // 这里可以添加令牌黑名单逻辑
    // 目前只是返回成功响应

    this.logger.info(`[${requestId}] 用户登出`, {
      requestId,
      userId
    });

    return res.success(200, '登出成功');
  }
}

module.exports = {
  UserController
};