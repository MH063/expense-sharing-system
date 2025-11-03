const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const winston = require('winston');

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

      // 验证必填字段
      if (!username || !password || !email) {
        return res.status(400).json({
          success: false,
          message: '用户名、密码和邮箱为必填项'
        });
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
        `INSERT INTO users (username, password, email, name, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [username, hashedPassword, email, displayName || username]
      );

      const userId = result.rows[0].id;

      // 获取创建的用户记录
      const userRowsResult = await pool.query(
        'SELECT id, username, email, name, created_at FROM users WHERE id = $1',
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

  // 用户登录
  login = async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名/邮箱/手机号和密码为必填项'
        });
      }

      // 查找用户 - 支持用户名、邮箱或手机号登录
      const usersResult = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1 OR phone = $1',
        [username]
      );
      const users = usersResult.rows;

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户名/邮箱/手机号或密码错误'
        });
      }

      const user = users[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '用户名/邮箱/手机号或密码错误'
        });
      }

      // 移除密码字段
      const { password, ...userWithoutPassword } = user;

      // 生成JWT token
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign(
        { 
          sub: user.id.toString(),
          username: user.username,
          roles: ['user'],
          permissions: ['read', 'write']
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { sub: user.id.toString() },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

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

      // 验证刷新Token
      const jwt = require('jsonwebtoken');
      let decoded;
      
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
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

      // 生成新的JWT token
      const newAccessToken = jwt.sign(
        { 
          sub: user.id.toString(),
          username: user.username,
          roles: ['user'],
          permissions: ['read', 'write']
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      const newRefreshToken = jwt.sign(
        { sub: user.id.toString() },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

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
      
      // 更新用户角色
      await pool.query(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
        [role, id]
      );
      
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

  // 获取当前用户资料
  async getProfile(req, res) {
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      // 查询用户信息
      const userResult = await pool.query(
        `SELECT id, username, email, name, phone, avatar_url, role, status, created_at, updated_at
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
      const { name, email, phone, avatar_url } = req.body;
      
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
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (email !== undefined && email !== user.email) {
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
        RETURNING id, username, email, name, phone, avatar_url, role, status, updated_at
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
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: '新密码长度不能少于6位'
        });
      }
      
      // 查询用户
      const userResult = await pool.query(
        'SELECT id, username, password FROM users WHERE id = $1',
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
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
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
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
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
}

module.exports = new UserController();