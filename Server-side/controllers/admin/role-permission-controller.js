const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取角色列表
 * @route GET /admin/roles
 * @access Private (Admin)
 */
async function getRoles(req, res) {
  try {
    const { page = 1, limit = 10, name } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取角色列表', { page, limit, name });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (name) {
      whereClause = `WHERE name ILIKE $${index++}`;
      values.push(`%${name}%`);
    }

    const query = `
      SELECT 
        id,
        name,
        description,
        created_at,
        updated_at
      FROM roles
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM roles
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, name ? [`%${name}%`] : []);
    const total = parseInt(countResult.rows[0].total);

    const roles = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取角色列表成功');
    return res.paginate(roles, pagination, '获取角色列表成功');
  } catch (error) {
    logger.error('获取角色列表失败:', error);
    return res.error('获取角色列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取角色详情
 * @route GET /admin/roles/:id
 * @access Private (Admin)
 */
async function getRoleById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取角色详情', { roleId: id });

    // 查询角色信息
    const roleQuery = `
      SELECT 
        id,
        name,
        description,
        created_at,
        updated_at
      FROM roles
      WHERE id = $1
    `;

    const roleResult = await db.query(roleQuery, [id]);

    if (roleResult.rowCount === 0) {
      return res.notFound('角色不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const role = roleResult.rows[0];

    // 查询角色关联的权限
    const permissionsQuery = `
      SELECT 
        p.id,
        p.name,
        p.resource,
        p.action,
        p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.resource, p.action
    `;

    const permissionsResult = await db.query(permissionsQuery, [id]);
    role.permissions = permissionsResult.rows;

    logger.info('获取角色详情成功');
    return res.success({ role: role }, '获取角色详情成功');
  } catch (error) {
    logger.error('获取角色详情失败:', error);
    return res.error('获取角色详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建角色
 * @route POST /admin/roles
 * @access Private (Admin)
 */
async function createRole(req, res) {
  try {
    const { name, description, permissions } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建角色`, { adminId, roleName: name });

    // 检查角色名称是否已存在
    const checkQuery = 'SELECT id FROM roles WHERE name = $1';
    const checkResult = await db.query(checkQuery, [name]);

    if (checkResult.rowCount > 0) {
      return res.conflict('角色名称已存在', ADMIN_ERRORS.ROLE_NAME_EXISTS);
    }

    // 创建角色
    const roleQuery = `
      INSERT INTO roles (name, description, created_at, updated_at, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const roleValues = [
      name,
      description || '',
      new Date().toISOString(),
      new Date().toISOString(),
      adminId
    ];

    const roleResult = await db.query(roleQuery, roleValues);
    const role = roleResult.rows[0];

    // 如果提供了权限列表，关联权限
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      // 验证权限ID是否存在
      const permissionCheckQuery = `
        SELECT id FROM permissions WHERE id = ANY($1)
      `;
      
      const permissionCheckResult = await db.query(permissionCheckQuery, [permissions]);
      
      if (permissionCheckResult.rowCount !== permissions.length) {
        return res.clientError('部分权限ID不存在', COMMON_ERRORS.VALIDATION_FAILED);
      }

      // 批量插入角色权限关联
      const permissionInsertQuery = `
        INSERT INTO role_permissions (role_id, permission_id, created_at, created_by)
        SELECT $1, unnest($2::uuid[]), $3, $4
      `;
      
      await db.query(permissionInsertQuery, [
        role.id,
        permissions,
        new Date().toISOString(),
        adminId
      ]);

      // 查询关联的权限详情
      const permissionsQuery = `
        SELECT 
          id,
          name,
          resource,
          action,
          description
        FROM permissions
        WHERE id = ANY($1)
        ORDER BY resource, action
      `;
      
      const permissionsResult = await db.query(permissionsQuery, [permissions]);
      role.permissions = permissionsResult.rows;
    } else {
      role.permissions = [];
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_role',
      'role',
      role.id,
      JSON.stringify({ name: role.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建角色成功`, { adminId, roleId: role.id });
    return res.success({ role: role }, '角色创建成功');
  } catch (error) {
    logger.error('创建角色失败:', error);
    return res.error('创建角色失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新角色
 * @route PUT /admin/roles/:id
 * @access Private (Admin)
 */
async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新角色`, { adminId, roleId: id });

    // 检查角色是否存在
    const checkQuery = 'SELECT id, name FROM roles WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('角色不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingRole = checkResult.rows[0];

    // 如果提供了新的角色名称，检查是否已存在
    if (name && name !== existingRole.name) {
      const nameCheckQuery = 'SELECT id FROM roles WHERE name = $1 AND id != $2';
      const nameCheckResult = await db.query(nameCheckQuery, [name, id]);

      if (nameCheckResult.rowCount > 0) {
        return res.conflict('角色名称已存在', ADMIN_ERRORS.ROLE_NAME_EXISTS);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE roles 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedRole = result.rows[0];

    // 如果提供了权限列表，更新角色权限关联
    if (permissions !== undefined) {
      // 先删除现有的角色权限关联
      const deleteQuery = 'DELETE FROM role_permissions WHERE role_id = $1';
      await db.query(deleteQuery, [id]);

      // 如果权限列表不为空，重新关联权限
      if (Array.isArray(permissions) && permissions.length > 0) {
        // 验证权限ID是否存在
        const permissionCheckQuery = `
          SELECT id FROM permissions WHERE id = ANY($1)
        `;
        
        const permissionCheckResult = await db.query(permissionCheckQuery, [permissions]);
        
        if (permissionCheckResult.rowCount !== permissions.length) {
          return res.clientError('部分权限ID不存在', COMMON_ERRORS.VALIDATION_FAILED);
        }

        // 批量插入角色权限关联
        const permissionInsertQuery = `
          INSERT INTO role_permissions (role_id, permission_id, created_at, created_by)
          SELECT $1, unnest($2::uuid[]), $3, $4
        `;
        
        await db.query(permissionInsertQuery, [
          id,
          permissions,
          new Date().toISOString(),
          adminId
        ]);
      }

      // 查询关联的权限详情
      const permissionsQuery = `
        SELECT 
          id,
          name,
          resource,
          action,
          description
        FROM permissions
        WHERE id = ANY($1)
        ORDER BY resource, action
      `;
      
      const permissionsResult = await db.query(permissionsQuery, [permissions]);
      updatedRole.permissions = permissionsResult.rows;
    } else {
      // 如果没有更新权限，查询现有的权限
      const permissionsQuery = `
        SELECT 
          p.id,
          p.name,
          p.resource,
          p.action,
          p.description
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.resource, p.action
      `;
      
      const permissionsResult = await db.query(permissionsQuery, [id]);
      updatedRole.permissions = permissionsResult.rows;
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_role',
      'role',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新角色成功`, { adminId, roleId: id });
    return res.success({ role: updatedRole }, '角色更新成功');
  } catch (error) {
    logger.error('更新角色失败:', error);
    return res.error('更新角色失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除角色
 * @route DELETE /admin/roles/:id
 * @access Private (Admin)
 */
async function deleteRole(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除角色`, { adminId, roleId: id });

    // 检查角色是否存在
    const checkQuery = 'SELECT id, name FROM roles WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('角色不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const role = checkResult.rows[0];

    // 检查是否有用户关联此角色
    const userCheckQuery = 'SELECT COUNT(*) AS count FROM user_roles WHERE role_id = $1';
    const userCheckResult = await db.query(userCheckQuery, [id]);
    
    if (parseInt(userCheckResult.rows[0].count) > 0) {
      return res.conflict('该角色已被用户使用，不能删除', ADMIN_ERRORS.ROLE_IN_USE);
    }

    // 开始事务删除角色及相关数据
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 删除角色权限关联
      const deleteRolePermissionsQuery = 'DELETE FROM role_permissions WHERE role_id = $1';
      await client.query(deleteRolePermissionsQuery, [id]);

      // 删除角色
      const deleteRoleQuery = 'DELETE FROM roles WHERE id = $1 RETURNING id';
      const deleteResult = await client.query(deleteRoleQuery, [id]);

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.notFound('角色不存在', COMMON_ERRORS.NOT_FOUND);
      }

      await client.query('COMMIT');

      // 记录操作日志
      const logQuery = `
        INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await db.query(logQuery, [
        adminId,
        'delete_role',
        'role',
        id,
        JSON.stringify({ name: role.name }),
        req.ip,
        req.get('User-Agent') || ''
      ]);

      logger.info(`管理员 ${adminName} 删除角色成功`, { adminId, roleId: id });
      return res.success(null, '角色删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('删除角色失败:', error);
    return res.error('删除角色失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取权限列表
 * @route GET /admin/permissions
 * @access Private (Admin)
 */
async function getPermissions(req, res) {
  try {
    const { page = 1, limit = 10, resource } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取权限列表', { page, limit, resource });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (resource) {
      whereClause = `WHERE resource ILIKE $${index++}`;
      values.push(`%${resource}%`);
    }

    const query = `
      SELECT 
        id,
        name,
        resource,
        action,
        description,
        created_at,
        updated_at
      FROM permissions
      ${whereClause}
      ORDER BY resource, action
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM permissions
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, resource ? [`%${resource}%`] : []);
    const total = parseInt(countResult.rows[0].total);

    const permissions = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取权限列表成功');
    return res.paginate(permissions, pagination, '获取权限列表成功');
  } catch (error) {
    logger.error('获取权限列表失败:', error);
    return res.error('获取权限列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取权限详情
 * @route GET /admin/permissions/:id
 * @access Private (Admin)
 */
async function getPermissionById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取权限详情', { permissionId: id });

    const query = `
      SELECT 
        id,
        name,
        resource,
        action,
        description,
        created_at,
        updated_at
      FROM permissions
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('权限不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const permission = result.rows[0];

    logger.info('获取权限详情成功');
    return res.success({ permission: permission }, '获取权限详情成功');
  } catch (error) {
    logger.error('获取权限详情失败:', error);
    return res.error('获取权限详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建权限
 * @route POST /admin/permissions
 * @access Private (Admin)
 */
async function createPermission(req, res) {
  try {
    const { name, resource, action, description } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建权限`, { adminId, permissionName: name });

    // 检查权限是否已存在（resource + action 组合唯一）
    const checkQuery = 'SELECT id FROM permissions WHERE resource = $1 AND action = $2';
    const checkResult = await db.query(checkQuery, [resource, action]);

    if (checkResult.rowCount > 0) {
      return res.conflict('权限已存在', ADMIN_ERRORS.PERMISSION_EXISTS);
    }

    const query = `
      INSERT INTO permissions (name, resource, action, description, created_at, updated_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      name,
      resource,
      action,
      description || '',
      new Date().toISOString(),
      new Date().toISOString(),
      adminId
    ];

    const result = await db.query(query, values);
    const permission = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_permission',
      'permission',
      permission.id,
      JSON.stringify({ name: permission.name, resource: permission.resource, action: permission.action }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建权限成功`, { adminId, permissionId: permission.id });
    return res.success({ permission: permission }, '权限创建成功');
  } catch (error) {
    logger.error('创建权限失败:', error);
    return res.error('创建权限失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新权限
 * @route PUT /admin/permissions/:id
 * @access Private (Admin)
 */
async function updatePermission(req, res) {
  try {
    const { id } = req.params;
    const { name, resource, action, description } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新权限`, { adminId, permissionId: id });

    // 检查权限是否存在
    const checkQuery = 'SELECT id, resource, action FROM permissions WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('权限不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingPermission = checkResult.rows[0];

    // 如果提供了新的 resource 和 action，检查是否已存在
    if ((resource && resource !== existingPermission.resource) || 
        (action && action !== existingPermission.action)) {
      const newResource = resource || existingPermission.resource;
      const newAction = action || existingPermission.action;
      
      const duplicateCheckQuery = `
        SELECT id FROM permissions 
        WHERE resource = $1 AND action = $2 AND id != $3
      `;
      
      const duplicateCheckResult = await db.query(duplicateCheckQuery, [newResource, newAction, id]);
      
      if (duplicateCheckResult.rowCount > 0) {
        return res.conflict('权限已存在', ADMIN_ERRORS.PERMISSION_EXISTS);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (resource !== undefined) {
      updates.push(`resource = $${index++}`);
      values.push(resource);
    }

    if (action !== undefined) {
      updates.push(`action = $${index++}`);
      values.push(action);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE permissions 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedPermission = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_permission',
      'permission',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新权限成功`, { adminId, permissionId: id });
    return res.success({ permission: updatedPermission }, '权限更新成功');
  } catch (error) {
    logger.error('更新权限失败:', error);
    return res.error('更新权限失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除权限
 * @route DELETE /admin/permissions/:id
 * @access Private (Admin)
 */
async function deletePermission(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除权限`, { adminId, permissionId: id });

    // 检查权限是否存在
    const checkQuery = 'SELECT id, name, resource, action FROM permissions WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('权限不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const permission = checkResult.rows[0];

    // 检查是否有角色关联此权限
    const roleCheckQuery = 'SELECT COUNT(*) AS count FROM role_permissions WHERE permission_id = $1';
    const roleCheckResult = await db.query(roleCheckQuery, [id]);
    
    if (parseInt(roleCheckResult.rows[0].count) > 0) {
      return res.conflict('该权限已被角色使用，不能删除', ADMIN_ERRORS.PERMISSION_IN_USE);
    }

    // 开始事务删除权限
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 删除角色权限关联
      const deleteRolePermissionsQuery = 'DELETE FROM role_permissions WHERE permission_id = $1';
      await client.query(deleteRolePermissionsQuery, [id]);

      // 删除权限
      const deletePermissionQuery = 'DELETE FROM permissions WHERE id = $1 RETURNING id';
      const deleteResult = await client.query(deletePermissionQuery, [id]);

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.notFound('权限不存在', COMMON_ERRORS.NOT_FOUND);
      }

      await client.query('COMMIT');

      // 记录操作日志
      const logQuery = `
        INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await db.query(logQuery, [
        adminId,
        'delete_permission',
        'permission',
        id,
        JSON.stringify({ name: permission.name, resource: permission.resource, action: permission.action }),
        req.ip,
        req.get('User-Agent') || ''
      ]);

      logger.info(`管理员 ${adminName} 删除权限成功`, { adminId, permissionId: id });
      return res.success(null, '权限删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('删除权限失败:', error);
    return res.error('删除权限失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取角色权限关联列表
 * @route GET /admin/role-permissions
 * @access Private (Admin)
 */
async function getRolePermissions(req, res) {
  try {
    const { role_id, permission_id } = req.query;
    
    logger.info('管理员获取角色权限关联列表', { roleId: role_id, permissionId: permission_id });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (role_id) {
      whereClause += ` AND rp.role_id = $${index++}`;
      values.push(role_id);
    }

    if (permission_id) {
      whereClause += ` AND rp.permission_id = $${index++}`;
      values.push(permission_id);
    }

    const query = `
      SELECT 
        rp.id,
        rp.role_id,
        r.name AS role_name,
        rp.permission_id,
        p.name AS permission_name,
        p.resource,
        p.action,
        rp.created_at
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE 1=1 ${whereClause}
      ORDER BY rp.created_at DESC
    `;

    const result = await db.query(query, values);
    const rolePermissions = result.rows;

    logger.info('获取角色权限关联列表成功');
    return res.success({ role_permissions: rolePermissions }, '获取角色权限关联列表成功');
  } catch (error) {
    logger.error('获取角色权限关联列表失败:', error);
    return res.error('获取角色权限关联列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建角色权限关联
 * @route POST /admin/role-permissions
 * @access Private (Admin)
 */
async function createRolePermission(req, res) {
  try {
    const { role_id, permission_id } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建角色权限关联`, { adminId, roleId: role_id, permissionId: permission_id });

    // 检查角色是否存在
    const roleCheckQuery = 'SELECT id, name FROM roles WHERE id = $1';
    const roleCheckResult = await db.query(roleCheckQuery, [role_id]);

    if (roleCheckResult.rowCount === 0) {
      return res.notFound('角色不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const role = roleCheckResult.rows[0];

    // 检查权限是否存在
    const permissionCheckQuery = 'SELECT id, name, resource, action FROM permissions WHERE id = $1';
    const permissionCheckResult = await db.query(permissionCheckQuery, [permission_id]);

    if (permissionCheckResult.rowCount === 0) {
      return res.notFound('权限不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const permission = permissionCheckResult.rows[0];

    // 检查关联是否已存在
    const checkQuery = `
      SELECT id FROM role_permissions 
      WHERE role_id = $1 AND permission_id = $2
    `;
    
    const checkResult = await db.query(checkQuery, [role_id, permission_id]);

    if (checkResult.rowCount > 0) {
      return res.conflict('角色权限关联已存在', ADMIN_ERRORS.ROLE_PERMISSION_EXISTS);
    }

    const query = `
      INSERT INTO role_permissions (role_id, permission_id, created_at, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      role_id,
      permission_id,
      new Date().toISOString(),
      adminId
    ];

    const result = await db.query(query, values);
    const rolePermission = result.rows[0];
    
    // 添加关联信息
    rolePermission.role_name = role.name;
    rolePermission.permission_name = permission.name;
    rolePermission.resource = permission.resource;
    rolePermission.action = permission.action;

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_role_permission',
      'role_permission',
      rolePermission.id,
      JSON.stringify({ role_id: role_id, permission_id: permission_id }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建角色权限关联成功`, { adminId, rolePermissionId: rolePermission.id });
    return res.success({ role_permission: rolePermission }, '角色权限关联创建成功');
  } catch (error) {
    logger.error('创建角色权限关联失败:', error);
    return res.error('创建角色权限关联失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除角色权限关联
 * @route DELETE /admin/role-permissions/:id
 * @access Private (Admin)
 */
async function deleteRolePermission(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除角色权限关联`, { adminId, rolePermissionId: id });

    // 检查角色权限关联是否存在
    const checkQuery = `
      SELECT 
        rp.id,
        r.name AS role_name,
        p.name AS permission_name,
        p.resource,
        p.action
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.id = $1
    `;
    
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('角色权限关联不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const rolePermission = checkResult.rows[0];

    // 删除角色权限关联
    const deleteQuery = 'DELETE FROM role_permissions WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('角色权限关联不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_role_permission',
      'role_permission',
      id,
      JSON.stringify({ 
        role_name: rolePermission.role_name, 
        permission_name: rolePermission.permission_name,
        resource: rolePermission.resource,
        action: rolePermission.action
      }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除角色权限关联成功`, { adminId, rolePermissionId: id });
    return res.success(null, '角色权限关联删除成功');
  } catch (error) {
    logger.error('删除角色权限关联失败:', error);
    return res.error('删除角色权限关联失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getRolePermissions,
  createRolePermission,
  deleteRolePermission
};
