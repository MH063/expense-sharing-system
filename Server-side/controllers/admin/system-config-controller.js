const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取系统配置
 * @route GET /admin/system/config
 * @access Private (Admin)
 */
async function getSystemConfig(req, res) {
  try {
    logger.info('管理员获取系统配置');

    // 查询系统配置
    const query = `
      SELECT 
        system_name,
        version,
        maintenance_mode,
        max_users_per_room,
        expense_categories,
        payment_methods,
        notification_settings,
        created_at,
        updated_at
      FROM system_configs 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await db.query(query);
    
    if (result.rowCount === 0) {
      // 如果没有配置记录，返回默认配置
      return res.success({
        system_config: {
          system_name: '寝室记账系统',
          version: '1.0.0',
          maintenance_mode: false,
          max_users_per_room: 8,
          expense_categories: ['餐饮', '日用品', '娱乐', '其他'],
          payment_methods: ['现金', '转账', '支付宝', '微信'],
          notification_settings: {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }, '获取系统配置成功');
    }

    const config = result.rows[0];
    
    // 处理JSON字段
    if (typeof config.expense_categories === 'string') {
      config.expense_categories = JSON.parse(config.expense_categories);
    }
    
    if (typeof config.payment_methods === 'string') {
      config.payment_methods = JSON.parse(config.payment_methods);
    }
    
    if (typeof config.notification_settings === 'string') {
      config.notification_settings = JSON.parse(config.notification_settings);
    }

    logger.info('获取系统配置成功');
    return res.success({ system_config: config }, '获取系统配置成功');
  } catch (error) {
    logger.error('获取系统配置失败:', error);
    return res.error('获取系统配置失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新系统配置
 * @route PUT /admin/system/config
 * @access Private (Admin)
 */
async function updateSystemConfig(req, res) {
  try {
    const { 
      system_name, 
      maintenance_mode, 
      max_users_per_room, 
      expense_categories, 
      payment_methods, 
      notification_settings 
    } = req.body;
    
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新系统配置`, { adminId });

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (system_name !== undefined) {
      updates.push(`system_name = $${index++}`);
      values.push(system_name);
    }

    if (maintenance_mode !== undefined) {
      updates.push(`maintenance_mode = $${index++}`);
      values.push(maintenance_mode);
    }

    if (max_users_per_room !== undefined) {
      updates.push(`max_users_per_room = $${index++}`);
      values.push(max_users_per_room);
    }

    if (expense_categories !== undefined) {
      updates.push(`expense_categories = $${index++}`);
      values.push(JSON.stringify(expense_categories));
    }

    if (payment_methods !== undefined) {
      updates.push(`payment_methods = $${index++}`);
      values.push(JSON.stringify(payment_methods));
    }

    if (notification_settings !== undefined) {
      updates.push(`notification_settings = $${index++}`);
      values.push(JSON.stringify(notification_settings));
    }

    // 添加更新时间和更新者
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    updates.push(`updated_by = $${index++}`);
    values.push(adminId);

    if (updates.length === 2) {
      // 只有更新时间和更新者，没有其他更新字段
      return res.clientError('至少需要更新一个配置项', COMMON_ERRORS.VALIDATION_FAILED);
    }

    // 检查是否已存在配置记录
    const checkQuery = 'SELECT id FROM system_configs LIMIT 1';
    const checkResult = await db.query(checkQuery);

    let result;
    if (checkResult.rowCount === 0) {
      // 如果没有配置记录，创建新记录
      const insertQuery = `
        INSERT INTO system_configs (
          system_name, 
          maintenance_mode, 
          max_users_per_room, 
          expense_categories, 
          payment_methods, 
          notification_settings, 
          created_at, 
          updated_at, 
          created_by, 
          updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *
      `;
      
      values.push(new Date().toISOString()); // created_at
      values.push(adminId); // created_by
      values.push(adminId); // updated_by (same as created_by for new record)
      
      result = await db.query(insertQuery, values);
    } else {
      // 更新现有记录
      const updateQuery = `
        UPDATE system_configs 
        SET ${updates.join(', ')}
        WHERE id = (SELECT id FROM system_configs ORDER BY created_at DESC LIMIT 1)
        RETURNING *
      `;
      
      result = await db.query(updateQuery, values);
    }

    const updatedConfig = result.rows[0];
    
    // 处理JSON字段
    if (typeof updatedConfig.expense_categories === 'string') {
      updatedConfig.expense_categories = JSON.parse(updatedConfig.expense_categories);
    }
    
    if (typeof updatedConfig.payment_methods === 'string') {
      updatedConfig.payment_methods = JSON.parse(updatedConfig.payment_methods);
    }
    
    if (typeof updatedConfig.notification_settings === 'string') {
      updatedConfig.notification_settings = JSON.parse(updatedConfig.notification_settings);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_system_config',
      'system_config',
      updatedConfig.id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新系统配置成功`, { adminId, configId: updatedConfig.id });
    return res.success({ system_config: updatedConfig }, '系统配置更新成功');
  } catch (error) {
    logger.error('更新系统配置失败:', error);
    return res.error('更新系统配置失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取功能开关列表
 * @route GET /admin/system/feature-flags
 * @access Private (Admin)
 */
async function getFeatureFlags(req, res) {
  try {
    logger.info('管理员获取功能开关列表');

    const query = `
      SELECT 
        id,
        name,
        description,
        enabled,
        created_at,
        updated_at
      FROM feature_flags
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);
    const featureFlags = result.rows;

    logger.info('获取功能开关列表成功');
    return res.success({ feature_flags: featureFlags }, '获取功能开关列表成功');
  } catch (error) {
    logger.error('获取功能开关列表失败:', error);
    return res.error('获取功能开关列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新功能开关
 * @route PUT /admin/system/feature-flags/:id
 * @access Private (Admin)
 */
async function updateFeatureFlag(req, res) {
  try {
    const { id } = req.params;
    const { enabled, description } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新功能开关`, { adminId, featureFlagId: id });

    // 检查功能开关是否存在
    const checkQuery = 'SELECT id FROM feature_flags WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('功能开关不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (enabled !== undefined) {
      updates.push(`enabled = $${index++}`);
      values.push(enabled);
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
      UPDATE feature_flags 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedFeatureFlag = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_feature_flag',
      'feature_flag',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新功能开关成功`, { adminId, featureFlagId: id });
    return res.success({ feature_flag: updatedFeatureFlag }, '功能开关更新成功');
  } catch (error) {
    logger.error('更新功能开关失败:', error);
    return res.error('更新功能开关失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取维护窗口列表
 * @route GET /admin/system/maintenance-windows
 * @access Private (Admin)
 */
async function getMaintenanceWindows(req, res) {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取维护窗口列表', { page, limit, status });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (status) {
      whereClause = `WHERE status = $${index++}`;
      values.push(status);
    }

    const query = `
      SELECT 
        id,
        title,
        description,
        start_time,
        end_time,
        status,
        affected_services,
        notification_settings,
        created_at,
        updated_at
      FROM maintenance_windows
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM maintenance_windows
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, status ? [status] : []);
    const total = parseInt(countResult.rows[0].total);

    // 处理JSON字段
    const maintenanceWindows = result.rows.map(window => {
      if (typeof window.affected_services === 'string') {
        window.affected_services = JSON.parse(window.affected_services);
      }
      
      if (typeof window.notification_settings === 'string') {
        window.notification_settings = JSON.parse(window.notification_settings);
      }
      
      return window;
    });

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取维护窗口列表成功');
    return res.paginate(maintenanceWindows, pagination, '获取维护窗口列表成功');
  } catch (error) {
    logger.error('获取维护窗口列表失败:', error);
    return res.error('获取维护窗口列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建维护窗口
 * @route POST /admin/system/maintenance-windows
 * @access Private (Admin)
 */
async function createMaintenanceWindow(req, res) {
  try {
    const { 
      title, 
      description, 
      start_time, 
      end_time, 
      affected_services, 
      notification_settings 
    } = req.body;
    
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建维护窗口`, { adminId });

    // 验证时间逻辑
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    
    if (startTime >= endTime) {
      return res.clientError('结束时间必须晚于开始时间', COMMON_ERRORS.VALIDATION_FAILED);
    }

    const query = `
      INSERT INTO maintenance_windows (
        title,
        description,
        start_time,
        end_time,
        status,
        affected_services,
        notification_settings,
        created_at,
        updated_at,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      title,
      description || '',
      start_time,
      end_time,
      'scheduled', // 默认状态为scheduled
      JSON.stringify(affected_services || []),
      JSON.stringify(notification_settings || {}),
      new Date().toISOString(),
      new Date().toISOString(),
      adminId
    ];

    const result = await db.query(query, values);
    const maintenanceWindow = result.rows[0];
    
    // 处理JSON字段
    if (typeof maintenanceWindow.affected_services === 'string') {
      maintenanceWindow.affected_services = JSON.parse(maintenanceWindow.affected_services);
    }
    
    if (typeof maintenanceWindow.notification_settings === 'string') {
      maintenanceWindow.notification_settings = JSON.parse(maintenanceWindow.notification_settings);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_maintenance_window',
      'maintenance_window',
      maintenanceWindow.id,
      JSON.stringify({ title: maintenanceWindow.title }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建维护窗口成功`, { adminId, maintenanceWindowId: maintenanceWindow.id });
    return res.success({ maintenance_window: maintenanceWindow }, '维护窗口创建成功');
  } catch (error) {
    logger.error('创建维护窗口失败:', error);
    return res.error('创建维护窗口失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新维护窗口
 * @route PUT /admin/system/maintenance-windows/:id
 * @access Private (Admin)
 */
async function updateMaintenanceWindow(req, res) {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      start_time, 
      end_time, 
      status,
      affected_services, 
      notification_settings 
    } = req.body;
    
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新维护窗口`, { adminId, maintenanceWindowId: id });

    // 检查维护窗口是否存在
    const checkQuery = 'SELECT id, status FROM maintenance_windows WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('维护窗口不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingWindow = checkResult.rows[0];
    
    // 如果维护窗口已经在进行中，不能修改时间
    if (existingWindow.status === 'active' && (start_time || end_time)) {
      return res.conflict('进行中的维护窗口不能修改时间', ADMIN_ERRORS.MAINTENANCE_WINDOW_ACTIVE);
    }

    // 验证时间逻辑
    if (start_time && end_time) {
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);
      
      if (startTime >= endTime) {
        return res.clientError('结束时间必须晚于开始时间', COMMON_ERRORS.VALIDATION_FAILED);
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (title !== undefined) {
      updates.push(`title = $${index++}`);
      values.push(title);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (start_time !== undefined) {
      updates.push(`start_time = $${index++}`);
      values.push(start_time);
    }

    if (end_time !== undefined) {
      updates.push(`end_time = $${index++}`);
      values.push(end_time);
    }

    if (status !== undefined) {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    if (affected_services !== undefined) {
      updates.push(`affected_services = $${index++}`);
      values.push(JSON.stringify(affected_services));
    }

    if (notification_settings !== undefined) {
      updates.push(`notification_settings = $${index++}`);
      values.push(JSON.stringify(notification_settings));
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE maintenance_windows 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedMaintenanceWindow = result.rows[0];
    
    // 处理JSON字段
    if (typeof updatedMaintenanceWindow.affected_services === 'string') {
      updatedMaintenanceWindow.affected_services = JSON.parse(updatedMaintenanceWindow.affected_services);
    }
    
    if (typeof updatedMaintenanceWindow.notification_settings === 'string') {
      updatedMaintenanceWindow.notification_settings = JSON.parse(updatedMaintenanceWindow.notification_settings);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_maintenance_window',
      'maintenance_window',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新维护窗口成功`, { adminId, maintenanceWindowId: id });
    return res.success({ maintenance_window: updatedMaintenanceWindow }, '维护窗口更新成功');
  } catch (error) {
    logger.error('更新维护窗口失败:', error);
    return res.error('更新维护窗口失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除维护窗口
 * @route DELETE /admin/system/maintenance-windows/:id
 * @access Private (Admin)
 */
async function deleteMaintenanceWindow(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除维护窗口`, { adminId, maintenanceWindowId: id });

    // 检查维护窗口是否存在
    const checkQuery = 'SELECT id, title FROM maintenance_windows WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('维护窗口不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const maintenanceWindow = checkResult.rows[0];

    // 检查维护窗口状态，进行中的维护窗口不能删除
    if (maintenanceWindow.status === 'active') {
      return res.conflict('进行中的维护窗口不能删除', ADMIN_ERRORS.MAINTENANCE_WINDOW_ACTIVE);
    }

    const deleteQuery = 'DELETE FROM maintenance_windows WHERE id = $1 RETURNING id';
    const result = await db.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      return res.notFound('维护窗口不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_maintenance_window',
      'maintenance_window',
      id,
      JSON.stringify({ title: maintenanceWindow.title }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除维护窗口成功`, { adminId, maintenanceWindowId: id });
    return res.success(null, '维护窗口删除成功');
  } catch (error) {
    logger.error('删除维护窗口失败:', error);
    return res.error('删除维护窗口失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取公告列表
 * @route GET /admin/system/announcements
 * @access Private (Admin)
 */
async function getAnnouncements(req, res) {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取公告列表', { page, limit, status });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (status) {
      whereClause = `WHERE status = $${index++}`;
      values.push(status);
    }

    const query = `
      SELECT 
        id,
        title,
        content,
        status,
        priority,
        publish_at,
        expire_at,
        created_at,
        updated_at
      FROM announcements
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM announcements
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, status ? [status] : []);
    const total = parseInt(countResult.rows[0].total);

    const announcements = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取公告列表成功');
    return res.paginate(announcements, pagination, '获取公告列表成功');
  } catch (error) {
    logger.error('获取公告列表失败:', error);
    return res.error('获取公告列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建公告
 * @route POST /admin/system/announcements
 * @access Private (Admin)
 */
async function createAnnouncement(req, res) {
  try {
    const { 
      title, 
      content, 
      status, 
      priority, 
      publish_at, 
      expire_at 
    } = req.body;
    
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建公告`, { adminId });

    const query = `
      INSERT INTO announcements (
        title,
        content,
        status,
        priority,
        publish_at,
        expire_at,
        created_at,
        updated_at,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      title,
      content,
      status,
      priority || 'normal',
      publish_at || new Date().toISOString(),
      expire_at || null,
      new Date().toISOString(),
      new Date().toISOString(),
      adminId
    ];

    const result = await db.query(query, values);
    const announcement = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_announcement',
      'announcement',
      announcement.id,
      JSON.stringify({ title: announcement.title }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建公告成功`, { adminId, announcementId: announcement.id });
    return res.success({ announcement: announcement }, '公告创建成功');
  } catch (error) {
    logger.error('创建公告失败:', error);
    return res.error('创建公告失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新公告
 * @route PUT /admin/system/announcements/:id
 * @access Private (Admin)
 */
async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      status, 
      priority, 
      publish_at, 
      expire_at 
    } = req.body;
    
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新公告`, { adminId, announcementId: id });

    // 检查公告是否存在
    const checkQuery = 'SELECT id FROM announcements WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('公告不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (title !== undefined) {
      updates.push(`title = $${index++}`);
      values.push(title);
    }

    if (content !== undefined) {
      updates.push(`content = $${index++}`);
      values.push(content);
    }

    if (status !== undefined) {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    if (priority !== undefined) {
      updates.push(`priority = $${index++}`);
      values.push(priority);
    }

    if (publish_at !== undefined) {
      updates.push(`publish_at = $${index++}`);
      values.push(publish_at);
    }

    if (expire_at !== undefined) {
      updates.push(`expire_at = $${index++}`);
      values.push(expire_at);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE announcements 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedAnnouncement = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_announcement',
      'announcement',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新公告成功`, { adminId, announcementId: id });
    return res.success({ announcement: updatedAnnouncement }, '公告更新成功');
  } catch (error) {
    logger.error('更新公告失败:', error);
    return res.error('更新公告失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除公告
 * @route DELETE /admin/system/announcements/:id
 * @access Private (Admin)
 */
async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除公告`, { adminId, announcementId: id });

    // 检查公告是否存在
    const checkQuery = 'SELECT id, title FROM announcements WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('公告不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const announcement = checkResult.rows[0];

    const deleteQuery = 'DELETE FROM announcements WHERE id = $1 RETURNING id';
    const result = await db.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      return res.notFound('公告不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_announcement',
      'announcement',
      id,
      JSON.stringify({ title: announcement.title }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除公告成功`, { adminId, announcementId: id });
    return res.success(null, '公告删除成功');
  } catch (error) {
    logger.error('删除公告失败:', error);
    return res.error('删除公告失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getSystemConfig,
  updateSystemConfig,
  getFeatureFlags,
  updateFeatureFlag,
  getMaintenanceWindows,
  createMaintenanceWindow,
  updateMaintenanceWindow,
  deleteMaintenanceWindow,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};