const { pool } = require('../config/db');
const { logger } = require('../config/logger');

class RoleController {
  // 获取所有角色
  async getAllRoles(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      let whereClause = '';
      const queryParams = [];
      
      if (search) {
        whereClause = 'WHERE name ILIKE $1 OR description ILIKE $1';
        queryParams.push(`%${search}%`);
      }
      
      // 获取角色列表
      const rolesQuery = `
        SELECT id, name, description, level, is_active, created_at, updated_at
        FROM roles
        ${whereClause}
        ORDER BY level ASC, name ASC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;
      
      queryParams.push(limit, offset);
      const rolesResult = await pool.query(rolesQuery, queryParams);
      
      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM roles
        ${whereClause}
      `;
      
      const countParams = search ? [`${search}`] : [];
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      // 获取每个角色的用户数量
      const rolesWithUserCount = await Promise.all(
        rolesResult.rows.map(async (role) => {
          const userCountResult = await pool.query(
            'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
            [role.id]
          );
          
          return {
            ...role,
            user_count: parseInt(userCountResult.rows[0].count)
          };
        })
      );
      
      logger.info(`获取角色列表成功: 页码 ${page}, 每页 ${limit}, 总数 ${total}`);
      
      res.status(200).json({
        success: true,
        message: '获取角色列表成功',
        data: {
          roles: rolesWithUserCount,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('获取角色列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取角色列表 - 别名方法，用于路由
  async getRoles(req, res) {
    return this.getAllRoles(req, res);
  }

  // 根据ID获取角色
  async getRoleById(req, res) {
    try {
      const { id } = req.params;
      
      // 获取角色详情
      const roleResult = await pool.query(
        'SELECT id, name, description, level, is_active, created_at, updated_at FROM roles WHERE id = $1',
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      const role = roleResult.rows[0];
      
      // 获取角色用户数量
      const userCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
        [id]
      );
      
      role.user_count = parseInt(userCountResult.rows[0].count);
      
      logger.info(`获取角色详情成功: ID ${id}, 名称 ${role.name}`);
      
      res.status(200).json({
        success: true,
        message: '获取角色详情成功',
        data: role
      });
      
    } catch (error) {
      logger.error('获取角色详情失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 创建角色
  async createRole(req, res) {
    try {
      const { name, description, level = 0, is_active = true } = req.body;
      
      // 验证必填字段
      if (!name) {
        return res.status(400).json({
          success: false,
          message: '角色名称为必填项'
        });
      }
      
      // 检查角色名称是否已存在
      const existingRoleResult = await pool.query(
        'SELECT id FROM roles WHERE name = $1',
        [name]
      );
      
      if (existingRoleResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '角色名称已存在'
        });
      }
      
      // 创建角色
      const result = await pool.query(
        `INSERT INTO roles (name, description, level, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, name, description, level, is_active, created_at, updated_at`,
        [name, description || '', level, is_active]
      );
      
      const role = result.rows[0];
      
      logger.info(`创建角色成功: ${name}`);
      
      res.status(201).json({
        success: true,
        message: '创建角色成功',
        data: role
      });
      
    } catch (error) {
      logger.error('创建角色失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新角色
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description, level, is_active } = req.body;
      
      // 验证角色是否存在
      const roleResult = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1',
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      const existingRole = roleResult.rows[0];
      
      // 检查角色名称是否已存在（如果提供新名称）
      if (name && name !== existingRole.name) {
        const duplicateRoleResult = await pool.query(
          'SELECT id FROM roles WHERE name = $1 AND id != $2',
          [name, id]
        );
        
        if (duplicateRoleResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: '角色名称已存在'
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
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      
      if (level !== undefined) {
        updateFields.push(`level = $${paramIndex++}`);
        updateValues.push(level);
      }
      
      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(is_active);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有提供要更新的字段'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);
      
      // 执行更新
      const updateQuery = `
        UPDATE roles 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, description, level, is_active, created_at, updated_at
      `;
      
      const result = await pool.query(updateQuery, updateValues);
      const updatedRole = result.rows[0];
      
      logger.info(`更新角色成功: ${existingRole.name} -> ${updatedRole.name}`);
      
      res.status(200).json({
        success: true,
        message: '更新角色成功',
        data: updatedRole
      });
      
    } catch (error) {
      logger.error('更新角色失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除角色
  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      
      // 验证角色是否存在
      const roleResult = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1',
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      const role = roleResult.rows[0];
      
      // 检查角色是否关联了用户
      const userCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
        [id]
      );
      
      const userCount = parseInt(userCountResult.rows[0].count);
      
      if (userCount > 0) {
        return res.status(400).json({
          success: false,
          message: `无法删除角色，该角色关联了 ${userCount} 个用户`
        });
      }
      
      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 删除角色权限关联
        await client.query(
          'DELETE FROM role_permissions WHERE role_id = $1',
          [id]
        );
        
        // 删除角色
        await client.query(
          'DELETE FROM roles WHERE id = $1',
          [id]
        );
        
        await client.query('COMMIT');
        
        logger.info(`删除角色成功: ${role.name}`);
        
        res.status(200).json({
          success: true,
          message: '删除角色成功',
          data: {
            roleId: id,
            roleName: role.name
          }
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('删除角色失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取角色权限
  async getRolePermissions(req, res) {
    try {
      const { id } = req.params;
      
      // 验证角色是否存在
      const roleResult = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1',
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      const role = roleResult.rows[0];
      
      // 获取角色权限
      const permissionsResult = await pool.query(
        `SELECT p.id, p.name, p.code, p.description, p.resource, p.action
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1
         ORDER BY p.resource, p.action`,
        [id]
      );
      
      const permissions = permissionsResult.rows;
      
      logger.info(`获取角色权限成功: ${role.name}`);
      
      res.status(200).json({
        success: true,
        message: '获取角色权限成功',
        data: {
          roleId: id,
          roleName: role.name,
          permissions: permissions
        }
      });
      
    } catch (error) {
      logger.error('获取角色权限失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 分配权限给角色
  async assignPermissionToRole(req, res) {
    try {
      const { id, permissionId } = req.params;
      
      // 验证角色是否存在
      const roleResult = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1',
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      const role = roleResult.rows[0];
      
      // 验证权限是否存在
      const permissionResult = await pool.query(
        'SELECT id, name FROM permissions WHERE id = $1',
        [permissionId]
      );
      
      if (permissionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }
      
      const permission = permissionResult.rows[0];
      
      // 检查角色是否已拥有该权限
      const existingRolePermissionResult = await pool.query(
        'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [id, permissionId]
      );
      
      if (existingRolePermissionResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '角色已拥有该权限'
        });
      }
      
      // 分配权限给角色
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES ($1, $2, NOW())',
        [id, permissionId]
      );
      
      logger.info(`分配权限给角色成功: ${role.name} -> ${permission.name}`);
      
      res.status(201).json({
        success: true,
        message: '分配权限给角色成功',
        data: {
          roleId: id,
          roleName: role.name,
          permissionId: permissionId,
          permissionName: permission.name
        }
      });
      
    } catch (error) {
      logger.error('分配权限给角色失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 从角色移除权限
  async removePermissionFromRole(req, res) {
    try {
      const { id, permissionId } = req.params;
      
      // 验证角色是否存在
      const roleResult = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1',
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      const role = roleResult.rows[0];
      
      // 验证权限是否存在
      const permissionResult = await pool.query(
        'SELECT id, name FROM permissions WHERE id = $1',
        [permissionId]
      );
      
      if (permissionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }
      
      const permission = permissionResult.rows[0];
      
      // 检查角色是否拥有该权限
      const rolePermissionResult = await pool.query(
        'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [id, permissionId]
      );
      
      if (rolePermissionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '角色未拥有该权限'
        });
      }
      
      // 从角色移除权限
      await pool.query(
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [id, permissionId]
      );
      
      logger.info(`从角色移除权限成功: ${role.name} -> ${permission.name}`);
      
      res.status(200).json({
        success: true,
        message: '从角色移除权限成功',
        data: {
          roleId: id,
          roleName: role.name,
          permissionId: permissionId,
          permissionName: permission.name
        }
      });
      
    } catch (error) {
      logger.error('从角色移除权限失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取所有权限
  async getAllPermissions(req, res) {
    try {
      const { resource } = req.query;
      
      // 构建查询条件
      let whereClause = '';
      const queryParams = [];
      
      if (resource) {
        whereClause = 'WHERE resource = $1';
        queryParams.push(resource);
      }
      
      // 获取权限列表
      const permissionsQuery = `
        SELECT id, name, code, description, resource, action, created_at, updated_at
        FROM permissions
        ${whereClause}
        ORDER BY resource, action
      `;
      
      const permissionsResult = await pool.query(permissionsQuery, queryParams);
      const permissions = permissionsResult.rows;
      
      // 按资源分组权限
      const permissionsByResource = {};
      permissions.forEach(permission => {
        if (!permissionsByResource[permission.resource]) {
          permissionsByResource[permission.resource] = [];
        }
        permissionsByResource[permission.resource].push(permission);
      });
      
      logger.info(`获取权限列表成功: 总数 ${permissions.length}`);
      
      res.status(200).json({
        success: true,
        message: '获取权限列表成功',
        data: {
          permissions,
          permissionsByResource
        }
      });
      
    } catch (error) {
      logger.error('获取权限列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new RoleController();