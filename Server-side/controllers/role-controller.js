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
      
      res.success(200, '获取角色列表成功', {
        roles: rolesWithUserCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      logger.error('获取角色列表失败:', error);
      res.error(500, '服务器内部错误');
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
        return res.error(404, '角色不存在');
      }
      
      const role = roleResult.rows[0];
      
      // 获取角色用户数量
      const userCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
        [id]
      );
      
      role.user_count = parseInt(userCountResult.rows[0].count);
      
      logger.info(`获取角色详情成功: ID ${id}, 名称 ${role.name}`);
      
      res.success(200, '获取角色详情成功', role);
      
    } catch (error) {
      logger.error('获取角色详情失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  // 创建角色
  async createRole(req, res) {
    try {
      const { name, description, level = 0, is_active = true } = req.body;
      
      // 验证必填字段
      if (!name) {
        return res.error(400, '角色名称为必填项');
      }
      
      // 检查角色名称是否已存在
      const existingRoleResult = await pool.query(
        'SELECT id FROM roles WHERE name = $1',
        [name]
      );
      
      if (existingRoleResult.rows.length > 0) {
        return res.error(409, '角色名称已存在');
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
      
      res.success(201, '创建角色成功', role);
      
    } catch (error) {
      logger.error('创建角色失败:', error);
      res.error(500, '服务器内部错误');
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
        return res.error(404, '角色不存在');
      }
      
      const existingRole = roleResult.rows[0];
      
      // 检查角色名称是否已存在（如果提供新名称）
      if (name && name !== existingRole.name) {
        const duplicateRoleResult = await pool.query(
          'SELECT id FROM roles WHERE name = $1 AND id != $2',
          [name, id]
        );
        
        if (duplicateRoleResult.rows.length > 0) {
          return res.error(409, '角色名称已存在');
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
        return res.error(400, '没有提供要更新的字段');
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
      
      res.success(200, '更新角色成功', updatedRole);
      
    } catch (error) {
      logger.error('更新角色失败:', error);
      res.error(500, '服务器内部错误');
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
        return res.error(404, '角色不存在');
      }
      
      const role = roleResult.rows[0];
      
      // 检查角色是否关联了用户
      const userCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
        [id]
      );
      
      const userCount = parseInt(userCountResult.rows[0].count);
      
      if (userCount > 0) {
        return res.error(400, `无法删除角色，该角色关联了 ${userCount} 个用户`);
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
        
        res.success(200, '删除角色成功', {
          roleId: id,
          roleName: role.name
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('删除角色失败:', error);
      res.error(500, '服务器内部错误');
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
        return res.error(404, '角色不存在');
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
      
      res.success(200, '获取角色权限成功', {
        roleId: id,
        roleName: role.name,
        permissions: permissions
      });
      
    } catch (error) {
      logger.error('获取角色权限失败:', error);
      res.error(500, '服务器内部错误');
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
        return res.error(404, '角色不存在');
      }
      
      const role = roleResult.rows[0];
      
      // 验证权限是否存在
      const permissionResult = await pool.query(
        'SELECT id, name FROM permissions WHERE id = $1',
        [permissionId]
      );
      
      if (permissionResult.rows.length === 0) {
        return res.error(404, '权限不存在');
      }
      
      const permission = permissionResult.rows[0];
      
      // 检查角色是否已拥有该权限
      const existingRolePermissionResult = await pool.query(
        'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [id, permissionId]
      );
      
      if (existingRolePermissionResult.rows.length > 0) {
        return res.error(409, '角色已拥有该权限');
      }
      
      // 分配权限给角色
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES ($1, $2, NOW())',
        [id, permissionId]
      );
      
      logger.info(`分配权限给角色成功: ${role.name} -> ${permission.name}`);
      
      res.success(201, '分配权限给角色成功', {
        roleId: id,
        roleName: role.name,
        permissionId: permissionId,
        permissionName: permission.name
      });
      
    } catch (error) {
      logger.error('分配权限给角色失败:', error);
      res.error(500, '服务器内部错误');
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
        return res.error(404, '角色不存在');
      }
      
      const role = roleResult.rows[0];
      
      // 验证权限是否存在
      const permissionResult = await pool.query(
        'SELECT id, name FROM permissions WHERE id = $1',
        [permissionId]
      );
      
      if (permissionResult.rows.length === 0) {
        return res.error(404, '权限不存在');
      }
      
      const permission = permissionResult.rows[0];
      
      // 检查角色是否拥有该权限
      const rolePermissionResult = await pool.query(
        'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [id, permissionId]
      );
      
      if (rolePermissionResult.rows.length === 0) {
        return res.error(404, '角色未拥有该权限');
      }
      
      // 从角色移除权限
      await pool.query(
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [id, permissionId]
      );
      
      logger.info(`从角色移除权限成功: ${role.name} -> ${permission.name}`);
      
      res.success(200, '从角色移除权限成功', {
        roleId: id,
        roleName: role.name,
        permissionId: permissionId,
        permissionName: permission.name
      });
      
    } catch (error) {
      logger.error('从角色移除权限失败:', error);
      res.error(500, '服务器内部错误');
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
      
      res.success(200, '获取权限列表成功', {
        permissions,
        permissionsByResource
      });
      
    } catch (error) {
      logger.error('获取权限列表失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  // 根据ID获取权限详情
  async getPermissionById(req, res) {
    try {
      const { id } = req.params;
      
      // 获取权限详情
      const permissionResult = await pool.query(
        'SELECT id, name, code, description, resource, action, created_at, updated_at FROM permissions WHERE id = $1',
        [id]
      );
      
      if (permissionResult.rows.length === 0) {
        return res.error(404, '权限不存在');
      }
      
      const permission = permissionResult.rows[0];
      
      // 获取拥有此权限的角色数量
      const roleCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = $1',
        [id]
      );
      
      permission.role_count = parseInt(roleCountResult.rows[0].count);
      
      logger.info(`获取权限详情成功: ID ${id}, 名称 ${permission.name}`);
      
      res.success(200, '获取权限详情成功', permission);
      
    } catch (error) {
      logger.error('获取权限详情失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  // 创建权限
  async createPermission(req, res) {
    try {
      const { name, code, description, resource, action } = req.body;
      
      // 验证必填字段
      if (!name || !code || !resource || !action) {
        return res.error(400, '权限名称、权限代码、资源和操作为必填项');
      }
      
      // 检查权限代码是否已存在
      const existingPermissionResult = await pool.query(
        'SELECT id FROM permissions WHERE code = $1',
        [code]
      );
      
      if (existingPermissionResult.rows.length > 0) {
        return res.error(409, '权限代码已存在');
      }
      
      // 创建权限
      const result = await pool.query(
        `INSERT INTO permissions (name, code, description, resource, action, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, name, code, description, resource, action, created_at, updated_at`,
        [name, code, description || '', resource, action]
      );
      
      const permission = result.rows[0];
      
      logger.info(`创建权限成功: ${name} (${code})`);
      
      res.success(201, '创建权限成功', permission);
      
    } catch (error) {
      logger.error('创建权限失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  // 更新权限
  async updatePermission(req, res) {
    try {
      const { id } = req.params;
      const { name, code, description, resource, action } = req.body;
      
      // 验证权限是否存在
      const permissionResult = await pool.query(
        'SELECT id, name, code FROM permissions WHERE id = $1',
        [id]
      );
      
      if (permissionResult.rows.length === 0) {
        return res.error(404, '权限不存在');
      }
      
      const existingPermission = permissionResult.rows[0];
      
      // 检查权限代码是否已存在（如果提供新代码）
      if (code && code !== existingPermission.code) {
        const duplicatePermissionResult = await pool.query(
          'SELECT id FROM permissions WHERE code = $1 AND id != $2',
          [code, id]
        );
        
        if (duplicatePermissionResult.rows.length > 0) {
          return res.error(409, '权限代码已存在');
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
      
      if (code !== undefined) {
        updateFields.push(`code = $${paramIndex++}`);
        updateValues.push(code);
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      
      if (resource !== undefined) {
        updateFields.push(`resource = $${paramIndex++}`);
        updateValues.push(resource);
      }
      
      if (action !== undefined) {
        updateFields.push(`action = $${paramIndex++}`);
        updateValues.push(action);
      }
      
      if (updateFields.length === 0) {
        return res.error(400, '没有提供要更新的字段');
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);
      
      // 执行更新
      const updateQuery = `
        UPDATE permissions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, code, description, resource, action, created_at, updated_at
      `;
      
      const result = await pool.query(updateQuery, updateValues);
      const updatedPermission = result.rows[0];
      
      logger.info(`更新权限成功: ${existingPermission.name} -> ${updatedPermission.name}`);
      
      res.success(200, '更新权限成功', updatedPermission);
      
    } catch (error) {
      logger.error('更新权限失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  // 删除权限
  async deletePermission(req, res) {
    try {
      const { id } = req.params;
      
      // 验证权限是否存在
      const permissionResult = await pool.query(
        'SELECT id, name FROM permissions WHERE id = $1',
        [id]
      );
      
      if (permissionResult.rows.length === 0) {
        return res.error(404, '权限不存在');
      }
      
      const permission = permissionResult.rows[0];
      
      // 检查权限是否关联了角色
      const roleCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = $1',
        [id]
      );
      
      const roleCount = parseInt(roleCountResult.rows[0].count);
      
      if (roleCount > 0) {
        return res.error(400, `无法删除权限，该权限关联了 ${roleCount} 个角色`);
      }
      
      // 删除权限
      await pool.query(
        'DELETE FROM permissions WHERE id = $1',
        [id]
      );
      
      logger.info(`删除权限成功: ${permission.name}`);
      
      res.success(200, '删除权限成功', {
        permissionId: id,
        permissionName: permission.name
      });
      
    } catch (error) {
      logger.error('删除权限失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  // 获取角色权限关联列表
  async getRolePermissionsList(req, res) {
    try {
      const { page = 1, limit = 10, roleId, permissionId } = req.query;
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      const queryParams = [];
      let paramIndex = 1;
      
      if (roleId) {
        whereClause += ` AND rp.role_id = $${paramIndex++}`;
        queryParams.push(roleId);
      }
      
      if (permissionId) {
        whereClause += ` AND rp.permission_id = $${paramIndex++}`;
        queryParams.push(permissionId);
      }
      
      // 获取角色权限关联列表
      const rolePermissionsQuery = `
        SELECT 
          rp.id as association_id,
          rp.role_id,
          rp.permission_id,
          rp.created_at,
          r.name as role_name,
          p.name as permission_name,
          p.code as permission_code,
          p.resource,
          p.action
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
        ${whereClause}
        ORDER BY r.name, p.resource, p.action
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      const rolePermissionsResult = await pool.query(rolePermissionsQuery, queryParams);
      
      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
        ${whereClause}
      `;
      
      const countParams = [];
      if (roleId) countParams.push(roleId);
      if (permissionId) countParams.push(permissionId);
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      logger.info(`获取角色权限关联列表成功: 页码 ${page}, 每页 ${limit}, 总数 ${total}`);
      
      res.success(200, '获取角色权限关联列表成功', {
        rolePermissions: rolePermissionsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      logger.error('获取角色权限关联列表失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  // 创建角色权限关联
  async createRolePermission(req, res) {
    try {
      const { roleId, permissionId } = req.body;
      
      // 验证角色是否存在
      const roleResult = await pool.query(
        'SELECT id, name FROM roles WHERE id = $1',
        [roleId]
      );
      
      if (roleResult.rows.length === 0) {
        return res.error(404, '角色不存在');
      }
      
      const role = roleResult.rows[0];
      
      // 验证权限是否存在
      const permissionResult = await pool.query(
        'SELECT id, name FROM permissions WHERE id = $1',
        [permissionId]
      );
      
      if (permissionResult.rows.length === 0) {
        return res.error(404, '权限不存在');
      }
      
      const permission = permissionResult.rows[0];
      
      // 检查角色是否已拥有该权限
      const existingRolePermissionResult = await pool.query(
        'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [roleId, permissionId]
      );
      
      if (existingRolePermissionResult.rows.length > 0) {
        return res.error(409, '角色已拥有该权限');
      }
      
      // 创建角色权限关联
      const result = await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES ($1, $2, NOW()) RETURNING id, role_id, permission_id, created_at',
        [roleId, permissionId]
      );
      
      const rolePermission = result.rows[0];
      
      logger.info(`创建角色权限关联成功: ${role.name} -> ${permission.name}`);
      
      res.success(201, '创建角色权限关联成功', {
        ...rolePermission,
        roleName: role.name,
        permissionName: permission.name
      });
      
    } catch (error) {
      logger.error('创建角色权限关联失败:', error);
      res.error(500, '服务器内部错误');
    }
  }
}

module.exports = new RoleController();