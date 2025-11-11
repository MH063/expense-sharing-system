const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取文档列表
 * @route GET /admin/docs
 * @access Private (Admin)
 */
async function getDocuments(req, res) {
  try {
    const { page = 1, limit = 10, type, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取文档列表', { page, limit, type, status, search });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (type) {
      whereClause += ` AND d.type = $${index++}`;
      values.push(type);
    }

    if (status) {
      whereClause += ` AND d.status = $${index++}`;
      values.push(status);
    }

    if (search) {
      whereClause += ` AND (d.title ILIKE $${index++} OR d.content ILIKE $${index++})`;
      values.push(`%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT 
        d.id,
        d.title,
        d.type,
        d.status,
        d.version,
        d.tags,
        d.view_count,
        d.download_count,
        d.published_at,
        d.created_at,
        d.updated_at,
        a.username AS author_name
      FROM documents d
      LEFT JOIN admins a ON d.author_id = a.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM documents d
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const documents = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取文档列表成功');
    return res.paginate(documents, pagination, '获取文档列表成功');
  } catch (error) {
    logger.error('获取文档列表失败:', error);
    return res.error('获取文档列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取文档详情
 * @route GET /admin/docs/:id
 * @access Private (Admin)
 */
async function getDocumentById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取文档详情', { documentId: id });

    const query = `
      SELECT 
        d.id,
        d.title,
        d.content,
        d.type,
        d.status,
        d.version,
        d.tags,
        d.view_count,
        d.download_count,
        d.published_at,
        d.created_at,
        d.updated_at,
        a.username AS author_name,
        a.email AS author_email
      FROM documents d
      LEFT JOIN admins a ON d.author_id = a.id
      WHERE d.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const document = result.rows[0];

    logger.info('获取文档详情成功');
    return res.success({ document: document }, '获取文档详情成功');
  } catch (error) {
    logger.error('获取文档详情失败:', error);
    return res.error('获取文档详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建文档
 * @route POST /admin/docs
 * @access Private (Admin)
 */
async function createDocument(req, res) {
  try {
    const { title, content, type, status, tags, version, published_at } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建文档`, { adminId, documentTitle: title });

    // 检查文档标题是否已存在
    const checkQuery = 'SELECT id FROM documents WHERE title = $1';
    const checkResult = await db.query(checkQuery, [title]);

    if (checkResult.rowCount > 0) {
      return res.conflict('文档标题已存在', ADMIN_ERRORS.DOCUMENT_TITLE_EXISTS);
    }

    const query = `
      INSERT INTO documents (
        title,
        content,
        type,
        status,
        version,
        tags,
        view_count,
        download_count,
        author_id,
        published_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      title,
      content,
      type,
      status || 'draft',
      version || '1.0',
      JSON.stringify(tags || []),
      0,
      0,
      adminId,
      published_at || null,
      new Date().toISOString(),
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const document = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_document',
      'document',
      document.id,
      JSON.stringify({ title: document.title, type: document.type, status: document.status }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建文档成功`, { adminId, documentId: document.id });
    return res.success({ document: document }, '文档创建成功');
  } catch (error) {
    logger.error('创建文档失败:', error);
    return res.error('创建文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新文档
 * @route PUT /admin/docs/:id
 * @access Private (Admin)
 */
async function updateDocument(req, res) {
  try {
    const { id } = req.params;
    const { title, content, type, status, tags, version, published_at } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新文档`, { adminId, documentId: id });

    // 检查文档是否存在
    const checkQuery = 'SELECT id, title FROM documents WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const existingDocument = checkResult.rows[0];

    // 如果提供了新的文档标题，检查是否已存在
    if (title && title !== existingDocument.title) {
      const titleCheckQuery = 'SELECT id FROM documents WHERE title = $1 AND id != $2';
      const titleCheckResult = await db.query(titleCheckQuery, [title, id]);

      if (titleCheckResult.rowCount > 0) {
        return res.conflict('文档标题已存在', ADMIN_ERRORS.DOCUMENT_TITLE_EXISTS);
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

    if (content !== undefined) {
      updates.push(`content = $${index++}`);
      values.push(content);
    }

    if (type !== undefined) {
      updates.push(`type = $${index++}`);
      values.push(type);
    }

    if (status !== undefined) {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    if (tags !== undefined) {
      updates.push(`tags = $${index++}`);
      values.push(JSON.stringify(tags));
    }

    if (version !== undefined) {
      updates.push(`version = $${index++}`);
      values.push(version);
    }

    if (published_at !== undefined) {
      updates.push(`published_at = $${index++}`);
      values.push(published_at);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE documents 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedDocument = result.rows[0];

    // 如果文档状态变为已发布，更新发布时间
    if (status === 'published' && !updatedDocument.published_at) {
      const publishQuery = `
        UPDATE documents 
        SET published_at = $1
        WHERE id = $2
      `;
      await db.query(publishQuery, [new Date().toISOString(), id]);
      updatedDocument.published_at = new Date().toISOString();
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_document',
      'document',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新文档成功`, { adminId, documentId: id });
    return res.success({ document: updatedDocument }, '文档更新成功');
  } catch (error) {
    logger.error('更新文档失败:', error);
    return res.error('更新文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除文档
 * @route DELETE /admin/docs/:id
 * @access Private (Admin)
 */
async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除文档`, { adminId, documentId: id });

    // 检查文档是否存在
    const checkQuery = 'SELECT id, title FROM documents WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const document = checkResult.rows[0];

    // 开始事务删除文档及相关数据
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 删除文档历史记录
      const deleteHistoryQuery = 'DELETE FROM document_history WHERE document_id = $1';
      await client.query(deleteHistoryQuery, [id]);

      // 删除文档统计记录
      const deleteStatsQuery = 'DELETE FROM document_statistics WHERE document_id = $1';
      await client.query(deleteStatsQuery, [id]);

      // 删除文档访问日志
      const deleteAccessLogsQuery = 'DELETE FROM document_access_logs WHERE document_id = $1';
      await client.query(deleteAccessLogsQuery, [id]);

      // 删除文档
      const deleteDocumentQuery = 'DELETE FROM documents WHERE id = $1 RETURNING id';
      const deleteResult = await client.query(deleteDocumentQuery, [id]);

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
      }

      await client.query('COMMIT');

      // 记录操作日志
      const logQuery = `
        INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await db.query(logQuery, [
        adminId,
        'delete_document',
        'document',
        id,
        JSON.stringify({ title: document.title }),
        req.ip,
        req.get('User-Agent') || ''
      ]);

      logger.info(`管理员 ${adminName} 删除文档成功`, { adminId, documentId: id });
      return res.success(null, '文档删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('删除文档失败:', error);
    return res.error('删除文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取文档历史记录
 * @route GET /admin/docs/:id/history
 * @access Private (Admin)
 */
async function getDocumentHistory(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取文档历史记录', { documentId: id, page, limit });

    // 检查文档是否存在
    const checkQuery = 'SELECT id FROM documents WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      SELECT 
        id,
        document_id,
        version,
        title,
        content,
        updated_by,
        a.username AS updated_by_name,
        updated_at
      FROM document_history dh
      LEFT JOIN admins a ON dh.updated_by = a.id
      WHERE document_id = $1
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [id, parseInt(limit), parseInt(offset)]);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM document_history
      WHERE document_id = $1
    `;

    const countResult = await db.query(countQuery, [id]);
    const total = parseInt(countResult.rows[0].total);

    const history = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取文档历史记录成功');
    return res.paginate(history, pagination, '获取文档历史记录成功');
  } catch (error) {
    logger.error('获取文档历史记录失败:', error);
    return res.error('获取文档历史记录失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取文档统计
 * @route GET /admin/docs/:id/statistics
 * @access Private (Admin)
 */
async function getDocumentStatistics(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取文档统计', { documentId: id });

    // 检查文档是否存在
    const checkQuery = 'SELECT id FROM documents WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      SELECT 
        id,
        document_id,
        view_count,
        download_count,
        last_viewed_at,
        last_downloaded_at,
        created_at,
        updated_at
      FROM document_statistics
      WHERE document_id = $1
    `;

    const result = await db.query(query, [id]);
    
    // 如果没有统计记录，返回默认值
    let statistics = null;
    if (result.rowCount > 0) {
      statistics = result.rows[0];
    } else {
      statistics = {
        document_id: id,
        view_count: 0,
        download_count: 0,
        last_viewed_at: null,
        last_downloaded_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    logger.info('获取文档统计成功');
    return res.success({ statistics: statistics }, '获取文档统计成功');
  } catch (error) {
    logger.error('获取文档统计失败:', error);
    return res.error('获取文档统计失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取文档类型
 * @route GET /admin/docs/types
 * @access Private (Admin)
 */
async function getDocumentTypes(req, res) {
  try {
    logger.info('管理员获取文档类型');

    // 返回预定义的文档类型
    const types = [
      { value: 'policy', label: '政策文档' },
      { value: 'guide', label: '使用指南' },
      { value: 'faq', label: '常见问题' },
      { value: 'announcement', label: '公告' },
      { value: 'other', label: '其他' }
    ];

    logger.info('获取文档类型成功');
    return res.success({ types: types }, '获取文档类型成功');
  } catch (error) {
    logger.error('获取文档类型失败:', error);
    return res.error('获取文档类型失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取最近文档
 * @route GET /admin/docs/recent
 * @access Private (Admin)
 */
async function getRecentDocuments(req, res) {
  try {
    const { limit = 10 } = req.query;
    
    logger.info('管理员获取最近文档', { limit });

    const query = `
      SELECT 
        id,
        title,
        type,
        status,
        published_at,
        created_at
      FROM documents
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, [parseInt(limit)]);
    const documents = result.rows;

    logger.info('获取最近文档成功');
    return res.success({ documents: documents }, '获取最近文档成功');
  } catch (error) {
    logger.error('获取最近文档失败:', error);
    return res.error('获取最近文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取热门文档
 * @route GET /admin/docs/popular
 * @access Private (Admin)
 */
async function getPopularDocuments(req, res) {
  try {
    const { limit = 10, period = 'month' } = req.query;
    
    logger.info('管理员获取热门文档', { limit, period });

    // 根据时间段构建查询条件
    let dateCondition = '';
    const now = new Date();
    
    switch (period) {
      case 'week':
        dateCondition = `AND created_at >= '${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
      case 'month':
        dateCondition = `AND created_at >= '${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
      case 'year':
        dateCondition = `AND created_at >= '${new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()}'`;
        break;
    }

    const query = `
      SELECT 
        d.id,
        d.title,
        d.type,
        d.status,
        ds.view_count,
        ds.download_count,
        (ds.view_count + ds.download_count) AS total_count,
        d.created_at
      FROM documents d
      LEFT JOIN document_statistics ds ON d.id = ds.document_id
      WHERE d.status = 'published' ${dateCondition}
      ORDER BY (COALESCE(ds.view_count, 0) + COALESCE(ds.download_count, 0)) DESC
      LIMIT $1
    `;

    const result = await db.query(query, [parseInt(limit)]);
    const documents = result.rows;

    logger.info('获取热门文档成功');
    return res.success({ documents: documents }, '获取热门文档成功');
  } catch (error) {
    logger.error('获取热门文档失败:', error);
    return res.error('获取热门文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取最近更新
 * @route GET /admin/docs/updates
 * @access Private (Admin)
 */
async function getRecentUpdates(req, res) {
  try {
    const { limit = 10 } = req.query;
    
    logger.info('管理员获取最近更新', { limit });

    const query = `
      SELECT 
        d.id,
        d.title,
        d.type,
        d.status,
        d.version,
        d.updated_at,
        a.username AS updated_by_name
      FROM documents d
      LEFT JOIN admins a ON d.author_id = a.id
      ORDER BY d.updated_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, [parseInt(limit)]);
    const documents = result.rows;

    logger.info('获取最近更新成功');
    return res.success({ documents: documents }, '获取最近更新成功');
  } catch (error) {
    logger.error('获取最近更新失败:', error);
    return res.error('获取最近更新失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 导出文档概览
 * @route GET /admin/docs/export/summary
 * @access Private (Admin)
 */
async function exportDocumentSummary(req, res) {
  try {
    const { format = 'csv', start_date, end_date } = req.query;
    
    logger.info('管理员导出文档概览', { format, start_date, end_date });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (start_date) {
      whereClause += ` AND d.created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND d.created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        d.id,
        d.title,
        d.type,
        d.status,
        d.version,
        d.view_count,
        d.download_count,
        d.published_at,
        d.created_at,
        d.updated_at,
        a.username AS author_name
      FROM documents d
      LEFT JOIN admins a ON d.author_id = a.id
      WHERE 1=1 ${whereClause}
      ORDER BY d.created_at DESC
    `;

    const result = await db.query(query, values);
    const documents = result.rows;

    // 根据格式返回数据
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="document-summary.json"');
      return res.send(JSON.stringify(documents, null, 2));
    } else {
      // 默认返回CSV格式
      let csvContent = 'ID,标题,类型,状态,版本,浏览次数,下载次数,发布时间,创建时间,更新时间,作者\n';
      
      documents.forEach(doc => {
        csvContent += `"${doc.id}","${doc.title}","${doc.type}","${doc.status}","${doc.version}",${doc.view_count},${doc.download_count},"${doc.published_at || ''}","${doc.created_at}","${doc.updated_at}","${doc.author_name || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="document-summary.csv"');
      return res.send(csvContent);
    }
  } catch (error) {
    logger.error('导出文档概览失败:', error);
    return res.error('导出文档概览失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 导出PDF文档
 * @route GET /admin/docs/export/pdf
 * @access Private (Admin)
 */
async function exportDocumentToPDF(req, res) {
  try {
    const { document_id } = req.query;
    
    logger.info('管理员导出PDF文档', { documentId: document_id });

    // 检查文档是否存在
    const checkQuery = 'SELECT id, title, content FROM documents WHERE id = $1';
    const checkResult = await db.query(checkQuery, [document_id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const document = checkResult.rows[0];

    // 这里应该调用PDF生成服务，为了简化，我们返回一个模拟的PDF内容
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Title (${document.title})
/Creator (Document Management System)
/Producer (Node.js)
>>
endobj
trailer
<<
/Root 1 0 R
>>
%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.title}.pdf"`);
    return res.send(pdfContent);
  } catch (error) {
    logger.error('导出PDF文档失败:', error);
    return res.error('导出PDF文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 导出Excel文档
 * @route GET /admin/docs/export/excel
 * @access Private (Admin)
 */
async function exportDocumentsToExcel(req, res) {
  try {
    const { start_date, end_date } = req.query;
    
    logger.info('管理员导出Excel文档', { start_date, end_date });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (start_date) {
      whereClause += ` AND d.created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND d.created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        d.id,
        d.title,
        d.type,
        d.status,
        d.version,
        d.view_count,
        d.download_count,
        d.published_at,
        d.created_at,
        d.updated_at,
        a.username AS author_name
      FROM documents d
      LEFT JOIN admins a ON d.author_id = a.id
      WHERE 1=1 ${whereClause}
      ORDER BY d.created_at DESC
    `;

    const result = await db.query(query, values);
    const documents = result.rows;

    // 生成Excel内容（简化版本，实际应该使用专门的Excel库）
    let excelContent = '<?xml version="1.0"?>\n';
    excelContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">\n';
    excelContent += '<Worksheet ss:Name="Documents">\n';
    excelContent += '<Table>\n';
    
    // 表头
    excelContent += '<Row>\n';
    excelContent += '<Cell><Data ss:Type="String">ID</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">标题</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">类型</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">状态</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">版本</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">浏览次数</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">下载次数</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">发布时间</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">创建时间</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">更新时间</Data></Cell>\n';
    excelContent += '<Cell><Data ss:Type="String">作者</Data></Cell>\n';
    excelContent += '</Row>\n';
    
    // 数据行
    documents.forEach(doc => {
      excelContent += '<Row>\n';
      excelContent += `<Cell><Data ss:Type="String">${doc.id}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="String">${doc.title}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="String">${doc.type}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="String">${doc.status}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="String">${doc.version}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="Number">${doc.view_count}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="Number">${doc.download_count}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="String">${doc.published_at || ''}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="String">${doc.created_at}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="String">${doc.updated_at}</Data></Cell>\n`;
      excelContent += `<Cell><Data ss:Type="String">${doc.author_name || ''}</Data></Cell>\n`;
      excelContent += '</Row>\n';
    });
    
    excelContent += '</Table>\n';
    excelContent += '</Worksheet>\n';
    excelContent += '</Workbook>\n';

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', 'attachment; filename="documents.xlsx"');
    return res.send(excelContent);
  } catch (error) {
    logger.error('导出Excel文档失败:', error);
    return res.error('导出Excel文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 搜索文档
 * @route GET /admin/docs/search
 * @access Private (Admin)
 */
async function searchDocuments(req, res) {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员搜索文档', { query: q, page, limit });

    if (!q) {
      return res.clientError('搜索关键词不能为空', COMMON_ERRORS.VALIDATION_FAILED);
    }

    const query = `
      SELECT 
        d.id,
        d.title,
        d.type,
        d.status,
        d.version,
        d.tags,
        d.view_count,
        d.download_count,
        d.published_at,
        d.created_at,
        d.updated_at,
        a.username AS author_name,
        ts_rank(to_tsvector('english', d.title || ' ' || d.content), plainto_tsquery('english', $1)) AS rank
      FROM documents d
      LEFT JOIN admins a ON d.author_id = a.id
      WHERE to_tsvector('english', d.title || ' ' || d.content) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, d.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [q, parseInt(limit), parseInt(offset)]);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM documents d
      WHERE to_tsvector('english', d.title || ' ' || d.content) @@ plainto_tsquery('english', $1)
    `;

    const countResult = await db.query(countQuery, [q]);
    const total = parseInt(countResult.rows[0].total);

    const documents = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('搜索文档成功');
    return res.paginate(documents, pagination, '搜索文档成功');
  } catch (error) {
    logger.error('搜索文档失败:', error);
    return res.error('搜索文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 下载文档
 * @route GET /admin/docs/:id/download
 * @access Private (Admin)
 */
async function downloadDocument(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员下载文档', { documentId: id });

    // 检查文档是否存在
    const checkQuery = 'SELECT id, title, content, type FROM documents WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const document = checkResult.rows[0];

    // 更新下载次数
    const updateQuery = `
      UPDATE document_statistics 
      SET download_count = download_count + 1, last_downloaded_at = $1
      WHERE document_id = $2
    `;
    await db.query(updateQuery, [new Date().toISOString(), id]);

    // 如果没有统计记录，创建一条
    const statsCheckQuery = 'SELECT id FROM document_statistics WHERE document_id = $1';
    const statsCheckResult = await db.query(statsCheckQuery, [id]);
    
    if (statsCheckResult.rowCount === 0) {
      const insertStatsQuery = `
        INSERT INTO document_statistics (document_id, view_count, download_count, last_downloaded_at)
        VALUES ($1, 0, 1, $2)
      `;
      await db.query(insertStatsQuery, [id, new Date().toISOString()]);
    }

    // 更新文档表中的下载次数
    const updateDocQuery = `
      UPDATE documents 
      SET download_count = download_count + 1
      WHERE id = $1
    `;
    await db.query(updateDocQuery, [id]);

    // 根据文档类型设置响应头
    let contentType = 'text/plain';
    let fileExtension = 'txt';
    
    switch (document.type) {
      case 'policy':
      case 'guide':
      case 'faq':
        contentType = 'text/plain';
        fileExtension = 'txt';
        break;
      case 'announcement':
        contentType = 'text/html';
        fileExtension = 'html';
        break;
      default:
        contentType = 'application/octet-stream';
        fileExtension = 'dat';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.title}.${fileExtension}"`);
    return res.send(document.content);
  } catch (error) {
    logger.error('下载文档失败:', error);
    return res.error('下载文档失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 记录文档访问日志
 * @route POST /admin/docs/:id/access-log
 * @access Private (Admin)
 */
async function recordDocumentAccess(req, res) {
  try {
    const { id } = req.params;
    const { ip_address, user_agent } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 记录文档访问日志`, { adminId, documentId: id });

    // 检查文档是否存在
    const checkQuery = 'SELECT id, title FROM documents WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const document = checkResult.rows[0];

    const query = `
      INSERT INTO document_access_logs (
        document_id,
        user_id,
        ip_address,
        user_agent,
        accessed_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      id,
      adminId,
      ip_address || req.ip,
      user_agent || req.get('User-Agent') || '',
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const accessLog = result.rows[0];

    // 更新浏览次数
    const updateQuery = `
      UPDATE document_statistics 
      SET view_count = view_count + 1, last_viewed_at = $1
      WHERE document_id = $2
    `;
    await db.query(updateQuery, [new Date().toISOString(), id]);

    // 如果没有统计记录，创建一条
    const statsCheckQuery = 'SELECT id FROM document_statistics WHERE document_id = $1';
    const statsCheckResult = await db.query(statsCheckQuery, [id]);
    
    if (statsCheckResult.rowCount === 0) {
      const insertStatsQuery = `
        INSERT INTO document_statistics (document_id, view_count, download_count, last_viewed_at)
        VALUES ($1, 1, 0, $2)
      `;
      await db.query(insertStatsQuery, [id, new Date().toISOString()]);
    }

    // 更新文档表中的浏览次数
    const updateDocQuery = `
      UPDATE documents 
      SET view_count = view_count + 1
      WHERE id = $1
    `;
    await db.query(updateDocQuery, [id]);

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'view_document',
      'document',
      id,
      JSON.stringify({ title: document.title }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 记录文档访问日志成功`, { adminId, documentId: id, accessLogId: accessLog.id });
    return res.success({ access_log: accessLog }, '文档访问记录成功');
  } catch (error) {
    logger.error('记录文档访问日志失败:', error);
    return res.error('记录文档访问日志失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取文档访问日志
 * @route GET /admin/docs/:id/access-logs
 * @access Private (Admin)
 */
async function getDocumentAccessLogs(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取文档访问日志', { documentId: id, page, limit, start_date, end_date });

    // 检查文档是否存在
    const checkQuery = 'SELECT id FROM documents WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('文档不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建查询条件
    let whereClause = 'WHERE dal.document_id = $1';
    const values = [id];
    let index = 2;

    if (start_date) {
      whereClause += ` AND dal.accessed_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND dal.accessed_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        dal.id,
        dal.document_id,
        dal.user_id,
        a.username AS user_name,
        dal.ip_address,
        dal.user_agent,
        dal.accessed_at
      FROM document_access_logs dal
      LEFT JOIN admins a ON dal.user_id = a.id
      ${whereClause}
      ORDER BY dal.accessed_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM document_access_logs dal
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const accessLogs = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取文档访问日志成功');
    return res.paginate(accessLogs, pagination, '获取文档访问日志成功');
  } catch (error) {
    logger.error('获取文档访问日志失败:', error);
    return res.error('获取文档访问日志失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentHistory,
  getDocumentStatistics,
  getDocumentTypes,
  getRecentDocuments,
  getPopularDocuments,
  getRecentUpdates,
  exportDocumentSummary,
  exportDocumentToPDF,
  exportDocumentsToExcel,
  searchDocuments,
  downloadDocument,
  recordDocumentAccess,
  getDocumentAccessLogs
};