const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取批量任务列表
 * @route GET /admin/batch-jobs
 * @access Private (Admin)
 */
async function getBatchJobs(req, res) {
  try {
    const { page = 1, limit = 10, status, type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取批量任务列表', { page, limit, status, type });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      whereClause += ` AND status = $${index++}`;
      values.push(status);
    }

    if (type) {
      whereClause += ` AND type ILIKE $${index++}`;
      values.push(`%${type}%`);
    }

    if (start_date) {
      whereClause += ` AND created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        type,
        name,
        description,
        status,
        progress,
        parameters,
        result,
        error_message,
        created_by,
        created_at,
        updated_at,
        scheduled_at,
        started_at,
        completed_at
      FROM batch_jobs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM batch_jobs
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const jobs = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取批量任务列表成功');
    return res.paginate(jobs, pagination, '获取批量任务列表成功');
  } catch (error) {
    logger.error('获取批量任务列表失败:', error);
    return res.error('获取批量任务列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建批量任务
 * @route POST /admin/batch-jobs
 * @access Private (Admin)
 */
async function createBatchJob(req, res) {
  try {
    const { type, name, description, parameters, scheduled_at } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建批量任务`, { adminId, jobType: type, jobName: name });

    const query = `
      INSERT INTO batch_jobs (
        type, 
        name, 
        description, 
        parameters, 
        status, 
        progress, 
        created_by, 
        created_at, 
        updated_at, 
        scheduled_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      type,
      name,
      description || '',
      JSON.stringify(parameters || {}),
      'pending',
      0,
      adminId,
      new Date().toISOString(),
      new Date().toISOString(),
      scheduled_at || null
    ];

    const result = await db.query(query, values);
    const job = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_batch_job',
      'batch_job',
      job.id,
      JSON.stringify({ type: job.type, name: job.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建批量任务成功`, { adminId, jobId: job.id });
    return res.success({ job: job }, '批量任务创建成功');
  } catch (error) {
    logger.error('创建批量任务失败:', error);
    return res.error('创建批量任务失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取任务详情
 * @route GET /admin/batch-jobs/:id
 * @access Private (Admin)
 */
async function getBatchJobById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取批量任务详情', { jobId: id });

    const query = `
      SELECT 
        id,
        type,
        name,
        description,
        status,
        progress,
        parameters,
        result,
        error_message,
        created_by,
        created_at,
        updated_at,
        scheduled_at,
        started_at,
        completed_at
      FROM batch_jobs
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('批量任务不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const job = result.rows[0];

    logger.info('获取批量任务详情成功');
    return res.success({ job: job }, '获取批量任务详情成功');
  } catch (error) {
    logger.error('获取批量任务详情失败:', error);
    return res.error('获取批量任务详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新任务状态
 * @route PUT /admin/batch-jobs/:id
 * @access Private (Admin)
 */
async function updateBatchJob(req, res) {
  try {
    const { id } = req.params;
    const { status, progress, result: jobResult, error_message } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新批量任务`, { adminId, jobId: id, status });

    // 检查任务是否存在
    const checkQuery = 'SELECT id, status FROM batch_jobs WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('批量任务不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingJob = checkResult.rows[0];

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (status !== undefined) {
      updates.push(`status = $${index++}`);
      values.push(status);
      
      // 根据状态更新时间字段
      if (status === 'processing' && !existingJob.started_at) {
        updates.push(`started_at = $${index++}`);
        values.push(new Date().toISOString());
      } else if ((status === 'completed' || status === 'failed') && !existingJob.completed_at) {
        updates.push(`completed_at = $${index++}`);
        values.push(new Date().toISOString());
      }
    }

    if (progress !== undefined) {
      updates.push(`progress = $${index++}`);
      values.push(progress);
    }

    if (jobResult !== undefined) {
      updates.push(`result = $${index++}`);
      values.push(JSON.stringify(jobResult));
    }

    if (error_message !== undefined) {
      updates.push(`error_message = $${index++}`);
      values.push(error_message);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE batch_jobs 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const queryResult = await db.query(updateQuery, values);
    const updatedJob = queryResult.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_batch_job',
      'batch_job',
      id,
      JSON.stringify({ status: status, progress: progress }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新批量任务成功`, { adminId, jobId: id });
    return res.success({ job: updatedJob }, '批量任务更新成功');
  } catch (error) {
    logger.error('更新批量任务失败:', error);
    return res.error('更新批量任务失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除任务
 * @route DELETE /admin/batch-jobs/:id
 * @access Private (Admin)
 */
async function deleteBatchJob(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除批量任务`, { adminId, jobId: id });

    // 检查任务是否存在
    const checkQuery = 'SELECT id, name FROM batch_jobs WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('批量任务不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const job = checkResult.rows[0];

    // 删除任务
    const deleteQuery = 'DELETE FROM batch_jobs WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('批量任务不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_batch_job',
      'batch_job',
      id,
      JSON.stringify({ name: job.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除批量任务成功`, { adminId, jobId: id });
    return res.success(null, '批量任务删除成功');
  } catch (error) {
    logger.error('删除批量任务失败:', error);
    return res.error('删除批量任务失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取报表定义列表
 * @route GET /admin/reports
 * @access Private (Admin)
 */
async function getReports(req, res) {
  try {
    const { page = 1, limit = 10, type, name } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取报表定义列表', { page, limit, type, name });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (type) {
      whereClause += ` AND type ILIKE $${index++}`;
      values.push(`%${type}%`);
    }

    if (name) {
      whereClause += ` AND name ILIKE $${index++}`;
      values.push(`%${name}%`);
    }

    const query = `
      SELECT 
        id,
        name,
        type,
        description,
        query,
        columns,
        filters,
        scheduling,
        created_by,
        created_at,
        updated_at
      FROM reports
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM reports
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const reports = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取报表定义列表成功');
    return res.paginate(reports, pagination, '获取报表定义列表成功');
  } catch (error) {
    logger.error('获取报表定义列表失败:', error);
    return res.error('获取报表定义列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建报表定义
 * @route POST /admin/reports
 * @access Private (Admin)
 */
async function createReport(req, res) {
  try {
    const { name, type, description, query, columns, filters, scheduling } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建报表定义`, { adminId, reportName: name, reportType: type });

    // 检查报表名称是否已存在
    const checkQuery = 'SELECT id FROM reports WHERE name = $1';
    const checkResult = await db.query(checkQuery, [name]);

    if (checkResult.rowCount > 0) {
      return res.conflict('报表名称已存在', ADMIN_ERRORS.REPORT_NAME_EXISTS);
    }

    const insertQuery = `
      INSERT INTO reports (
        name, 
        type, 
        description, 
        query, 
        columns, 
        filters, 
        scheduling, 
        created_by, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      name,
      type,
      description || '',
      query,
      JSON.stringify(columns),
      JSON.stringify(filters || []),
      JSON.stringify(scheduling || {}),
      adminId,
      new Date().toISOString(),
      new Date().toISOString()
    ];

    const result = await db.query(insertQuery, values);
    const report = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_report',
      'report',
      report.id,
      JSON.stringify({ name: report.name, type: report.type }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建报表定义成功`, { adminId, reportId: report.id });
    return res.success({ report: report }, '报表定义创建成功');
  } catch (error) {
    logger.error('创建报表定义失败:', error);
    return res.error('创建报表定义失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取报表定义详情
 * @route GET /admin/reports/:id
 * @access Private (Admin)
 */
async function getReportById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取报表定义详情', { reportId: id });

    const query = `
      SELECT 
        id,
        name,
        type,
        description,
        query,
        columns,
        filters,
        scheduling,
        created_by,
        created_at,
        updated_at
      FROM reports
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('报表定义不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const report = result.rows[0];

    logger.info('获取报表定义详情成功');
    return res.success({ report: report }, '获取报表定义详情成功');
  } catch (error) {
    logger.error('获取报表定义详情失败:', error);
    return res.error('获取报表定义详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新报表定义
 * @route PUT /admin/reports/:id
 * @access Private (Admin)
 */
async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { name, type, description, query, columns, filters, scheduling } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新报表定义`, { adminId, reportId: id });

    // 检查报表是否存在
    const checkQuery = 'SELECT id, name FROM reports WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('报表定义不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingReport = checkResult.rows[0];

    // 如果提供了新的报表名称，检查是否已存在
    if (name && name !== existingReport.name) {
      const nameCheckQuery = 'SELECT id FROM reports WHERE name = $1 AND id != $2';
      const nameCheckResult = await db.query(nameCheckQuery, [name, id]);

      if (nameCheckResult.rowCount > 0) {
        return res.conflict('报表名称已存在', ADMIN_ERRORS.REPORT_NAME_EXISTS);
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

    if (type !== undefined) {
      updates.push(`type = $${index++}`);
      values.push(type);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (query !== undefined) {
      updates.push(`query = $${index++}`);
      values.push(query);
    }

    if (columns !== undefined) {
      updates.push(`columns = $${index++}`);
      values.push(JSON.stringify(columns));
    }

    if (filters !== undefined) {
      updates.push(`filters = $${index++}`);
      values.push(JSON.stringify(filters));
    }

    if (scheduling !== undefined) {
      updates.push(`scheduling = $${index++}`);
      values.push(JSON.stringify(scheduling));
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE reports 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedReport = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_report',
      'report',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新报表定义成功`, { adminId, reportId: id });
    return res.success({ report: updatedReport }, '报表定义更新成功');
  } catch (error) {
    logger.error('更新报表定义失败:', error);
    return res.error('更新报表定义失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除报表定义
 * @route DELETE /admin/reports/:id
 * @access Private (Admin)
 */
async function deleteReport(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除报表定义`, { adminId, reportId: id });

    // 检查报表是否存在
    const checkQuery = 'SELECT id, name FROM reports WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('报表定义不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const report = checkResult.rows[0];

    // 检查是否有报表快照使用此报表
    const snapshotCheckQuery = 'SELECT COUNT(*) AS count FROM report_snapshots WHERE report_id = $1';
    const snapshotCheckResult = await db.query(snapshotCheckQuery, [id]);
    
    if (parseInt(snapshotCheckResult.rows[0].count) > 0) {
      return res.conflict('该报表已有快照数据，不能删除', ADMIN_ERRORS.REPORT_IN_USE);
    }

    // 删除报表
    const deleteQuery = 'DELETE FROM reports WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('报表定义不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_report',
      'report',
      id,
      JSON.stringify({ name: report.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除报表定义成功`, { adminId, reportId: id });
    return res.success(null, '报表定义删除成功');
  } catch (error) {
    logger.error('删除报表定义失败:', error);
    return res.error('删除报表定义失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取报表快照
 * @route GET /admin/reports/:id/snapshots
 * @access Private (Admin)
 */
async function getReportSnapshots(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取报表快照', { reportId: id, page, limit });

    // 检查报表是否存在
    const checkQuery = 'SELECT id FROM reports WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('报表定义不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建查询条件
    let whereClause = 'WHERE report_id = $1';
    const values = [id];
    let index = 2;

    if (start_date) {
      whereClause += ` AND generated_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND generated_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        report_id,
        name,
        data,
        format,
        generated_at,
        generated_by
      FROM report_snapshots
      ${whereClause}
      ORDER BY generated_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM report_snapshots
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const snapshots = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取报表快照成功');
    return res.paginate(snapshots, pagination, '获取报表快照成功');
  } catch (error) {
    logger.error('获取报表快照失败:', error);
    return res.error('获取报表快照失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 生成报表
 * @route POST /admin/reports/:id/generate
 * @access Private (Admin)
 */
async function generateReport(req, res) {
  try {
    const { id } = req.params;
    const { start_date, end_date, format = 'json' } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 生成报表`, { adminId, reportId: id, format });

    // 检查报表是否存在
    const checkQuery = `
      SELECT 
        id,
        name,
        type,
        description,
        query,
        columns,
        filters,
        scheduling
      FROM reports
      WHERE id = $1
    `;
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('报表定义不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const report = checkResult.rows[0];

    // 构建查询参数
    const queryParams = [];
    let paramIndex = 1;

    // 添加日期过滤条件
    let whereClause = 'WHERE 1=1';
    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      queryParams.push(end_date);
    }

    // 执行报表查询
    let reportQuery = report.query;
    if (reportQuery.toLowerCase().includes('where')) {
      reportQuery = reportQuery.replace(/where/i, `WHERE 1=1 ${whereClause.replace('WHERE', 'AND')}`);
    } else {
      reportQuery += ` ${whereClause}`;
    }

    const queryResult = await db.query(reportQuery, queryParams);
    const reportData = queryResult.rows;

    // 创建报表快照
    const snapshotQuery = `
      INSERT INTO report_snapshots (
        report_id,
        name,
        data,
        format,
        generated_at,
        generated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const snapshotValues = [
      id,
      `${report.name}_${new Date().toISOString().split('T')[0]}`,
      JSON.stringify(reportData),
      format,
      new Date().toISOString(),
      adminId
    ];

    const snapshotResult = await db.query(snapshotQuery, snapshotValues);
    const snapshot = snapshotResult.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'generate_report',
      'report',
      id,
      JSON.stringify({ format: format, data_count: reportData.length }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 生成报表成功`, { adminId, reportId: id, snapshotId: snapshot.id });
    return res.success({ 
      report: report,
      snapshot: snapshot,
      data: reportData
    }, '报表生成成功');
  } catch (error) {
    logger.error('生成报表失败:', error);
    return res.error('生成报表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取导出任务列表
 * @route GET /admin/exports
 * @access Private (Admin)
 */
async function getExportTasks(req, res) {
  try {
    const { page = 1, limit = 10, status, type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取导出任务列表', { page, limit, status, type });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      whereClause += ` AND status = $${index++}`;
      values.push(status);
    }

    if (type) {
      whereClause += ` AND type = $${index++}`;
      values.push(type);
    }

    if (start_date) {
      whereClause += ` AND created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        id,
        type,
        name,
        description,
        status,
        progress,
        query,
        columns,
        filters,
        result,
        error_message,
        created_by,
        created_at,
        updated_at,
        scheduled_at,
        started_at,
        completed_at
      FROM export_tasks
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM export_tasks
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const tasks = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取导出任务列表成功');
    return res.paginate(tasks, pagination, '获取导出任务列表成功');
  } catch (error) {
    logger.error('获取导出任务列表失败:', error);
    return res.error('获取导出任务列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建导出任务
 * @route POST /admin/exports
 * @access Private (Admin)
 */
async function createExportTask(req, res) {
  try {
    const { type, name, description, query, columns, filters, scheduled_at } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建导出任务`, { adminId, exportType: type, exportName: name });

    const insertQuery = `
      INSERT INTO export_tasks (
        type, 
        name, 
        description, 
        query, 
        columns, 
        filters, 
        status, 
        progress, 
        created_by, 
        created_at, 
        updated_at, 
        scheduled_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      type,
      name,
      description || '',
      query,
      JSON.stringify(columns),
      JSON.stringify(filters || {}),
      'pending',
      0,
      adminId,
      new Date().toISOString(),
      new Date().toISOString(),
      scheduled_at || null
    ];

    const result = await db.query(insertQuery, values);
    const task = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_export_task',
      'export_task',
      task.id,
      JSON.stringify({ type: task.type, name: task.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建导出任务成功`, { adminId, taskId: task.id });
    return res.success({ task: task }, '导出任务创建成功');
  } catch (error) {
    logger.error('创建导出任务失败:', error);
    return res.error('创建导出任务失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取导出任务详情
 * @route GET /admin/exports/:id
 * @access Private (Admin)
 */
async function getExportTaskById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取导出任务详情', { taskId: id });

    const query = `
      SELECT 
        id,
        type,
        name,
        description,
        status,
        progress,
        query,
        columns,
        filters,
        result,
        error_message,
        created_by,
        created_at,
        updated_at,
        scheduled_at,
        started_at,
        completed_at
      FROM export_tasks
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('导出任务不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const task = result.rows[0];

    logger.info('获取导出任务详情成功');
    return res.success({ task: task }, '获取导出任务详情成功');
  } catch (error) {
    logger.error('获取导出任务详情失败:', error);
    return res.error('获取导出任务详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除导出任务
 * @route DELETE /admin/exports/:id
 * @access Private (Admin)
 */
async function deleteExportTask(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除导出任务`, { adminId, taskId: id });

    // 检查任务是否存在
    const checkQuery = 'SELECT id, name FROM export_tasks WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('导出任务不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const task = checkResult.rows[0];

    // 删除任务
    const deleteQuery = 'DELETE FROM export_tasks WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('导出任务不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_export_task',
      'export_task',
      id,
      JSON.stringify({ name: task.name }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除导出任务成功`, { adminId, taskId: id });
    return res.success(null, '导出任务删除成功');
  } catch (error) {
    logger.error('删除导出任务失败:', error);
    return res.error('删除导出任务失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getBatchJobs,
  createBatchJob,
  getBatchJobById,
  updateBatchJob,
  deleteBatchJob,
  getReports,
  createReport,
  getReportById,
  updateReport,
  deleteReport,
  getReportSnapshots,
  generateReport,
  getExportTasks,
  createExportTask,
  getExportTaskById,
  deleteExportTask
};