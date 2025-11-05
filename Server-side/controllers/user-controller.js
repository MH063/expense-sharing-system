const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const { TokenManager } = require('../middleware/tokenManager');
const crypto = require('crypto');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/user-controller.log' })
  ]
});

// 用户控制器
class UserController {
  constructor() {
    this.logger = logger;
  }

  // 用户注册
  async register(req, res) {
    try {
      const { username, password, email, displayName } = req.body;

      // 基于 express-validator 的校验已在路由层，额外后备校验
      if (!username || !password || !email) {
        return res.status(400).json({ success: false, message: '用户名、密码和邮箱为必填项' });
      }
      // 密码强度：至少8位，包含大小写、数字、特殊字符各一
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(password)) {
        return res.status(400).json({ success: false, message: '密码需包含大小写、数字、特殊字符且至少8位' });
      }

      // 检查用户名是否已存在
      const existingUserResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      const existingUser = existingUserResult.rows;

      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: '用户名已被注册'
        });
      }

      // 检查邮箱是否已存在
      const existingEmailResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      const existingEmail = existingEmailResult.rows;

      if (existingEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: '邮箱已被注册'
        });
      }

      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 插入用户记录并返回ID
      const result = await pool.query(
        `INSERT INTO users (username, password_hash, email, display_name, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [username, hashedPassword, email, displayName || username]
      );

      const userId = result.rows[0].id;

      // 获取创建的用户记录
      const userRowsResult = await pool.query(
        'SELECT id, username, email, display_name, created_at FROM users WHERE id = $1',
        [userId]
      );
      const userRows = userRowsResult.rows;

      const user = userRows[0];

      logger.info(`用户注册成功: ${username}`);

      res.status(201).json({
        success: true,
        message: '用户注册成功',
        data: user
      });

    } catch (error) {
      logger.error('用户注册失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 管理员登录
  async adminLogin(req, res) {
    try {
      const { username, password } = req.body;
      
      // 查询用户信息
      const userResult = await pool.query(
        'SELECT id, username, password_hash, is_active FROM users WHERE username = $1',
        [username]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }
      
      const user = userResult.rows[0];
      
      // 检查用户是否激活
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: '账户已被禁用'
        });
      }
      
      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }
      
      // 生成JWT令牌
      const payload = {
        userId: user.id,
        username: user.username,
        role: 'admin' // 由于数据库中没有role字段，暂时硬编码为admin
      };
      
      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
      
      // 更新最后登录时间
      await pool.query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      logger.info(`管理员登录成功: ${user.username}`);
      
      res.status(200).json({
        success: true,
        message: '管理员登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: 'admin'
          },
          accessToken,
          refreshToken
        }
      });
      
    } catch (error) {
      logger.error('管理员登录失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 用户登录
  login = async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
        return res.status(400).json({ success: false, message: '登录信息不完整' });
      }

      // 查找用户 - 支持用户名或邮箱登录
      const usersResult = await pool.query(
        'SELECT u.*, r.name as role_name FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id LEFT JOIN roles r ON ur.role_id = r.id WHERE u.username = $1 OR u.email = $1',
        [username]
      );
      const users = usersResult.rows;

      if (users.length === 0) {
        if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
        return res.status(401).json({ success: false, message: '登录信息不正确' });
      }

      const user = users[0];

      // 若启用 MFA，需要校验一次 TOTP
      if (user.mfa_enabled) {
        const mfaCode = req.body && req.body.mfa_code;
        if (!mfaCode) {
          if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
          return res.status(401).json({ success: false, message: '需要多因素验证码' });
        }
        const { totpVerify } = require('../utils/totp');
        const ok = totpVerify(String(mfaCode), user.mfa_secret, { window: 1 });
        if (!ok) {
          if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
          return res.status(401).json({ success: false, message: '多因素验证码错误' });
        }
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
        return res.status(401).json({ success: false, message: '登录信息不正确' });
      }

      // 移除密码字段
      const { password_hash: userPassword, ...userWithoutPassword } = user;

      // 使用TokenManager生成JWT token
      const { TokenManager } = require('../middleware/tokenManager');
      const accessToken = TokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: [user.role_name || 'user'],
        permissions: ['read', 'write']
      });
      
      const refreshToken = TokenManager.generateRefreshToken(user.id.toString());

      // 记录登录成功
      if (typeof req._recordLoginSuccess === 'function') req._recordLoginSuccess(username);

      logger.info(`用户登录成功: ${username}`);

      res.status(200).json({
        success: true,
        message: '登录成功',
        data: {
          token: accessToken,
          refreshToken: refreshToken,
          user: userWithoutPassword
        }
      });

    } catch (error) {
      logger.error('用户登录失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 刷新Token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: '刷新Token为必填项'
        });
      }

      // 使用TokenManager验证刷新Token
      const { TokenManager } = require('../middleware/tokenManager');
      let decoded;
      
      try {
        decoded = TokenManager.verifyRefreshToken(refreshToken);
        if (!decoded) {
          return res.status(401).json({
            success: false,
            message: '无效的刷新Token'
          });
        }
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: '无效的刷新Token'
        });
      }

      // 查找用户
      const usersResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [decoded.sub]
      );
      const users = usersResult.rows;

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }

      const user = users[0];

      // 使用TokenManager生成新的JWT token
      const newAccessToken = TokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: ['user'],
        permissions: ['read', 'write']
      });
      
      const newRefreshToken = TokenManager.generateRefreshToken(user.id.toString());

      logger.info(`Token刷新成功: ${user.username}`);

      res.status(200).json({
        success: true,
        message: 'Token刷新成功',
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      logger.error('Token刷新失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户详情
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      // 查询用户信息
      const userResult = await pool.query(
        'SELECT id, username, email, name, phone, avatar_url, role, status, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const user = userResult.rows[0];
      
      // 查询用户寝室关联信息
      const roomRelationResult = await pool.query(
        `SELECT urr.room_id, urr.relation_type, urr.join_date, urr.leave_date, urr.is_active,
                r.name as room_name, r.code as room_code
         FROM user_room_relations urr
         JOIN rooms r ON urr.room_id = r.id
         WHERE urr.user_id = $1 AND urr.is_active = TRUE`,
        [id]
      );
      
      user.rooms = roomRelationResult.rows;
      
      logger.info(`获取用户详情成功: ${user.username}`);
      
      res.status(200).json({
        success: true,
        message: '获取用户详情成功',
        data: user
      });
      
    } catch (error) {
      logger.error('获取用户详情失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户信息
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, avatar_url } = req.body;
      
      // 验证用户是否存在
      const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 如果更新邮箱，检查邮箱是否已被其他用户使用
      if (email) {
        const emailCheckResult = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, id]
        );
        
        if (emailCheckResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: '邮箱已被其他用户使用'
          });
        }
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }
      
      if (phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        updateValues.push(phone);
      }
      
      if (avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        updateValues.push(avatar_url);
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);
      
      // 执行更新
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, username, email, name, phone, avatar_url, role, status, updated_at
      `;
      
      const result = await pool.query(updateQuery, updateValues);
      const updatedUser = result.rows[0];
      
      logger.info(`用户信息更新成功: ${updatedUser.username}`);
      
      res.status(200).json({
        success: true,
        message: '用户信息更新成功',
        data: updatedUser
      });
      
    } catch (error) {
      logger.error('用户信息更新失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户列表
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 20, role, status } = req.query;
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;
      
      if (role) {
        conditions.push(`role = $${paramIndex++}`);
        queryParams.push(role);
      }
      
      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        queryParams.push(status);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // 查询用户列表
      const usersQuery = `
        SELECT id, username, email, name, phone, avatar_url, role, status, created_at, updated_at
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      
      const usersResult = await pool.query(usersQuery, queryParams);
      const users = usersResult.rows;
      
      // 查询总数
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].count);
      
      logger.info(`获取用户列表成功，共 ${totalCount} 条记录`);
      
      res.status(200).json({
        success: true,
        message: '获取用户列表成功',
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 分配用户角色
  async assignUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // 验证角色值
      const validRoles = ['system_admin', 'admin', '寝室长', 'payer', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: '无效的角色值'
        });
      }
      
      // 验证用户是否存在
      const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const user = userResult.rows[0];
      
      // 获取角色ID
      const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      const roleId = roleResult.rows[0].id;
      
      // 检查用户是否已有角色
      const existingRoleResult = await pool.query(
        'SELECT role_id FROM user_roles WHERE user_id = $1',
        [id]
      );
      
      if (existingRoleResult.rows.length > 0) {
        // 更新现有角色
        await pool.query(
          'UPDATE user_roles SET role_id = $1, assigned_at = NOW(), assigned_by = $2 WHERE user_id = $3',
          [roleId, req.user.sub, id]
        );
      } else {
        // 分配新角色
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
          [id, roleId, req.user.sub]
        );
      }
      
      logger.info(`用户角色分配成功: ${user.username} -> ${role}`);
      
      res.status(200).json({
        success: true,
        message: '用户角色分配成功',
        data: {
          userId: id,
          role: role
        }
      });
      
    } catch (error) {
      logger.error('用户角色分配失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户角色
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // 验证角色值
      const validRoles = ['system_admin', 'admin', '寝室长', 'payer', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: '无效的角色值'
        });
      }
      
      // 验证用户是否存在
      const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const user = userResult.rows[0];
      
      // 获取角色ID
      const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      const roleId = roleResult.rows[0].id;
      
      // 检查用户是否已有角色
      const existingRoleResult = await pool.query(
        'SELECT role_id FROM user_roles WHERE user_id = $1',
        [id]
      );
      
      if (existingRoleResult.rows.length > 0) {
        // 更新现有角色
        await pool.query(
          'UPDATE user_roles SET role_id = $1, assigned_at = NOW(), assigned_by = $2 WHERE user_id = $3',
          [roleId, req.user.sub, id]
        );
        logger.info(`用户角色更新成功: ${user.username} -> ${role}`);
      } else {
        // 分配新角色
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
          [id, roleId, req.user.sub]
        );
        logger.info(`用户角色分配成功: ${user.username} -> ${role}`);
      }
      
      res.status(200).json({
        success: true,
        message: '用户角色更新成功',
        data: {
          userId: id,
          role: role
        }
      });
      
    } catch (error) {
      logger.error('用户角色更新失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户角色
  async getUserRole(req, res) {
    try {
      const { id } = req.params;
      
      // 验证用户是否存在
      const userResult = await pool.query(
        'SELECT id, username FROM users WHERE id = $1',
        [id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const user = userResult.rows[0];
      
      // 获取用户角色
      const roleResult = await pool.query(
        `SELECT r.name as role 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = $1`,
        [id]
      );
      
      let role = null;
      if (roleResult.rows.length > 0) {
        role = roleResult.rows[0].role;
      }
      
      logger.info(`获取用户角色成功: ${user.username} -> ${role || '无角色'}`);
      
      res.status(200).json({
        success: true,
        message: '获取用户角色成功',
        data: {
          userId: user.id,
          username: user.username,
          role: role
        }
      });
      
    } catch (error) {
      logger.error('获取用户角色失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取当前用户资料
  async getProfile(req, res) {
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      // 查询用户信息
      const userResult = await pool.query(
        `SELECT id, username, email, display_name, avatar_url, is_active, created_at, updated_at
         FROM users WHERE id = $1`,
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const user = userResult.rows[0];
      
      logger.info(`获取用户资料成功: ${user.username}`);
      
      res.status(200).json({
        success: true,
        message: '获取用户资料成功',
        data: user
      });
      
    } catch (error) {
      logger.error('获取用户资料失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新当前用户资料
  async updateProfile(req, res) {
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { displayName, email, avatar_url } = req.body;
      
      // 验证用户是否存在
      const userResult = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const user = userResult.rows[0];
      
      // 如果更新邮箱，检查邮箱是否已被其他用户使用
      if (email && email !== user.email) {
        const emailCheckResult = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );
        
        if (emailCheckResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: '邮箱已被其他用户使用'
          });
        }
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (displayName !== undefined) {
        updateFields.push(`display_name = $${paramIndex++}`);
        updateValues.push(displayName);
      }
      
      if (email !== undefined && email !== user.email) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }
      
      if (avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        updateValues.push(avatar_url);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有提供要更新的字段'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(userId);
      
      // 执行更新
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, username, email, display_name, avatar_url, is_active, updated_at
      `;
      
      const result = await pool.query(updateQuery, updateValues);
      const updatedUser = result.rows[0];
      
      logger.info(`用户资料更新成功: ${updatedUser.username}`);
      
      res.status(200).json({
        success: true,
        message: '用户资料更新成功',
        data: updatedUser
      });
      
    } catch (error) {
      logger.error('用户资料更新失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 修改密码
  async changePassword(req, res) {
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { currentPassword, newPassword } = req.body;
      
      // 验证必填字段
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: '当前密码和新密码为必填项'
        });
      }
      
      // 验证新密码长度
      // 强密码策略（同注册）
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(newPassword)) {
        return res.status(400).json({ success: false, message: '新密码需包含大小写、数字、特殊字符且至少8位' });
      }
      
      // 查询用户
      const userResult = await pool.query(
        'SELECT id, username, password_hash FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const user = userResult.rows[0];
      
      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: '当前密码错误'
        });
      }
      
      // 加密新密码
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新密码
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, userId]
      );
      
      logger.info(`用户密码修改成功: ${user.username}`);
      
      res.status(200).json({
        success: true,
        message: '密码修改成功'
      });
      
    } catch (error) {
      logger.error('密码修改失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 忘记密码
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      // 验证必填字段
      if (!email) {
        return res.status(400).json({
          success: false,
          message: '邮箱为必填项'
        });
      }
      
      // 查找用户
      const userResult = await pool.query(
        'SELECT id, username, email FROM users WHERE email = $1',
        [email]
      );
      
      // 无论用户是否存在都返回成功，避免邮箱枚举攻击
      if (userResult.rows.length === 0) {
        logger.info(`忘记密码请求: 邮箱 ${email} 不存在，但返回成功`);
        return res.status(200).json({
          success: true,
          message: '如果该邮箱已注册，您将收到密码重置邮件'
        });
      }
      
      const user = userResult.rows[0];
      
      // 生成重置令牌
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1小时后过期
      
      // 保存重置令牌到数据库
      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, resetToken, expiresAt]
      );
      
      // 这里应该发送邮件，暂时只记录日志
      logger.info(`密码重置令牌已生成: 用户 ${user.username}, 邮箱 ${user.email}, 令牌 ${resetToken}`);
      
      // 在实际应用中，这里应该调用邮件服务发送重置链接
      // 例如: await emailService.sendPasswordResetEmail(user.email, resetToken);
      
      res.status(200).json({
        success: true,
        message: '如果该邮箱已注册，您将收到密码重置邮件'
      });
      
    } catch (error) {
      logger.error('忘记密码处理失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 重置密码
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      
      // 验证必填字段
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: '重置令牌和新密码为必填项'
        });
      }
      
      // 验证新密码强度
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: '新密码需包含大小写、数字、特殊字符且至少8位'
        });
      }
      
      // 查找有效的重置令牌
      const tokenResult = await pool.query(
        `SELECT t.user_id, u.username 
         FROM password_reset_tokens t
         JOIN users u ON t.user_id = u.id
         WHERE t.token = $1 AND t.expires_at > NOW() AND t.is_used = false`,
        [token]
      );
      
      if (tokenResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '重置令牌无效或已过期'
        });
      }
      
      const { user_id, username } = tokenResult.rows[0];
      
      // 加密新密码
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 更新用户密码
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [hashedNewPassword, user_id]
        );
        
        // 标记令牌为已使用
        await client.query(
          'UPDATE password_reset_tokens SET is_used = true WHERE token = $1',
          [token]
        );
        
        await client.query('COMMIT');
        
        logger.info(`密码重置成功: ${username}`);
        
        res.status(200).json({
          success: true,
          message: '密码重置成功'
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('密码重置失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户设置
  async getUserSettings(req, res) {
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      // 查询用户设置
      const settingsResult = await pool.query(
        'SELECT setting_key, setting_value FROM user_settings WHERE user_id = $1',
        [userId]
      );
      
      // 将设置转换为键值对对象
      const settings = {};
      settingsResult.rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      
      logger.info(`获取用户设置成功: 用户ID ${userId}`);
      
      res.status(200).json({
        success: true,
        message: '获取用户设置成功',
        data: settings
      });
      
    } catch (error) {
      logger.error('获取用户设置失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户设置
  async updateUserSettings(req, res) {
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { settings } = req.body;
      
      // 验证设置对象
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          message: '设置对象为必填项'
        });
      }
      
      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 遍历设置并更新
        for (const [key, value] of Object.entries(settings)) {
          // 使用UPSERT操作更新或插入设置
          await client.query(
            `INSERT INTO user_settings (user_id, setting_key, setting_value)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, setting_key)
             DO UPDATE SET setting_value = $3, updated_at = NOW()`,
            [userId, key, value]
          );
        }
        
        await client.query('COMMIT');
        
        logger.info(`用户设置更新成功: 用户ID ${userId}`);
        
        res.status(200).json({
          success: true,
          message: '用户设置更新成功',
          data: settings
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('更新用户设置失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
      

}

module.exports = new UserController();