const db = require('../../config/db');
const { logger } = require('../../config/logger');
const { COMMON_ERRORS, ADMIN_ERRORS } = require('../../constants/error-codes');

/**
 * @description 获取评论列表
 * @route GET /admin/reviews
 * @access Private (Admin)
 */
async function getReviews(req, res) {
  try {
    const { page = 1, limit = 10, status, user_id, resource_type, resource_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取评论列表', { page, limit, status, user_id, resource_type, resource_id });

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      whereClause += ` AND r.status = $${index++}`;
      values.push(status);
    }

    if (user_id) {
      whereClause += ` AND r.user_id = $${index++}`;
      values.push(user_id);
    }

    if (resource_type) {
      whereClause += ` AND r.resource_type = $${index++}`;
      values.push(resource_type);
    }

    if (resource_id) {
      whereClause += ` AND r.resource_id = $${index++}`;
      values.push(resource_id);
    }

    if (start_date) {
      whereClause += ` AND r.created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND r.created_at <= $${index++}`;
      values.push(end_date);
    }

    const query = `
      SELECT 
        r.id,
        r.resource_type,
        r.resource_id,
        r.user_id,
        u.username AS user_name,
        r.content,
        r.rating,
        r.status,
        r.approved_by,
        a.username AS approved_by_name,
        r.approved_at,
        r.rejected_reason,
        r.created_at,
        r.updated_at
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN admins a ON r.approved_by = a.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM reviews r
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const reviews = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取评论列表成功');
    return res.paginate(reviews, pagination, '获取评论列表成功');
  } catch (error) {
    logger.error('获取评论列表失败:', error);
    return res.error('获取评论列表失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取评论详情
 * @route GET /admin/reviews/:id
 * @access Private (Admin)
 */
async function getReviewById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取评论详情', { reviewId: id });

    const query = `
      SELECT 
        r.id,
        r.resource_type,
        r.resource_id,
        r.user_id,
        u.username AS user_name,
        u.email AS user_email,
        r.content,
        r.rating,
        r.status,
        r.approved_by,
        a.username AS approved_by_name,
        r.approved_at,
        r.rejected_reason,
        r.created_at,
        r.updated_at
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN admins a ON r.approved_by = a.id
      WHERE r.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('评论不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const review = result.rows[0];

    logger.info('获取评论详情成功');
    return res.success({ review: review }, '获取评论详情成功');
  } catch (error) {
    logger.error('获取评论详情失败:', error);
    return res.error('获取评论详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 创建评论
 * @route POST /admin/reviews
 * @access Private (Admin)
 */
async function createReview(req, res) {
  try {
    const { resource_type, resource_id, content, rating, status } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 创建评论`, { adminId, resourceType: resource_type, resourceId: resource_id });

    // 检查资源是否存在
    let resourceCheckQuery = '';
    switch (resource_type) {
      case 'bill':
        resourceCheckQuery = 'SELECT id FROM bills WHERE id = $1';
        break;
      case 'expense':
        resourceCheckQuery = 'SELECT id FROM expenses WHERE id = $1';
        break;
      case 'room':
        resourceCheckQuery = 'SELECT id FROM dorms WHERE id = $1';
        break;
      default:
        resourceCheckQuery = 'SELECT id FROM documents WHERE id = $1';
    }

    const resourceCheckResult = await db.query(resourceCheckQuery, [resource_id]);

    if (resourceCheckResult.rowCount === 0) {
      return res.notFound('资源不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const query = `
      INSERT INTO reviews (
        resource_type,
        resource_id,
        user_id,
        content,
        rating,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      resource_type,
      resource_id,
      adminId, // 管理员作为评论者
      content,
      rating || null,
      status || 'pending',
      new Date().toISOString(),
      new Date().toISOString()
    ];

    const result = await db.query(query, values);
    const review = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'create_review',
      'review',
      review.id,
      JSON.stringify({ resource_type: review.resource_type, resource_id: review.resource_id }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 创建评论成功`, { adminId, reviewId: review.id });
    return res.success({ review: review }, '评论创建成功');
  } catch (error) {
    logger.error('创建评论失败:', error);
    return res.error('创建评论失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 更新评论
 * @route PUT /admin/reviews/:id
 * @access Private (Admin)
 */
async function updateReview(req, res) {
  try {
    const { id } = req.params;
    const { content, rating, status } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 更新评论`, { adminId, reviewId: id });

    // 检查评论是否存在
    const checkQuery = 'SELECT id FROM reviews WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('评论不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    let index = 1;

    if (content !== undefined) {
      updates.push(`content = $${index++}`);
      values.push(content);
    }

    if (rating !== undefined) {
      updates.push(`rating = $${index++}`);
      values.push(rating);
    }

    if (status !== undefined) {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    // 添加更新时间
    updates.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());
    
    values.push(id); // WHERE条件

    const updateQuery = `
      UPDATE reviews 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    const updatedReview = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'update_review',
      'review',
      id,
      JSON.stringify({ updated_fields: updates }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 更新评论成功`, { adminId, reviewId: id });
    return res.success({ review: updatedReview }, '评论更新成功');
  } catch (error) {
    logger.error('更新评论失败:', error);
    return res.error('更新评论失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除评论
 * @route DELETE /admin/reviews/:id
 * @access Private (Admin)
 */
async function deleteReview(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除评论`, { adminId, reviewId: id });

    // 检查评论是否存在
    const checkQuery = 'SELECT id, content FROM reviews WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('评论不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const review = checkResult.rows[0];

    // 开始事务删除评论及相关数据
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 删除评论图片
      const deleteImagesQuery = 'DELETE FROM review_images WHERE review_id = $1';
      await client.query(deleteImagesQuery, [id]);

      // 删除评论
      const deleteReviewQuery = 'DELETE FROM reviews WHERE id = $1 RETURNING id';
      const deleteResult = await client.query(deleteReviewQuery, [id]);

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.notFound('评论不存在', COMMON_ERRORS.NOT_FOUND);
      }

      await client.query('COMMIT');

      // 记录操作日志
      const logQuery = `
        INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await db.query(logQuery, [
        adminId,
        'delete_review',
        'review',
        id,
        JSON.stringify({ content: review.content.substring(0, 50) + '...' }),
        req.ip,
        req.get('User-Agent') || ''
      ]);

      logger.info(`管理员 ${adminName} 删除评论成功`, { adminId, reviewId: id });
      return res.success(null, '评论删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('删除评论失败:', error);
    return res.error('删除评论失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 审核通过评论
 * @route POST /admin/reviews/:id/approve
 * @access Private (Admin)
 */
async function approveReview(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 审核通过评论`, { adminId, reviewId: id });

    // 检查评论是否存在
    const checkQuery = 'SELECT id, status FROM reviews WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('评论不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const review = checkResult.rows[0];

    // 检查评论状态是否可以审核通过
    if (review.status === 'approved') {
      return res.clientError('评论已审核通过', ADMIN_ERRORS.REVIEW_ALREADY_APPROVED);
    }

    // 更新评论状态为已审核通过
    const updateQuery = `
      UPDATE reviews 
      SET 
        status = 'approved',
        approved_by = $1,
        approved_at = $2,
        updated_at = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      adminId,
      new Date().toISOString(),
      new Date().toISOString(),
      id
    ]);

    const updatedReview = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'approve_review',
      'review',
      id,
      JSON.stringify({ notes: notes }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 审核通过评论成功`, { adminId, reviewId: id });
    return res.success({ review: updatedReview }, '评论审核通过成功');
  } catch (error) {
    logger.error('审核通过评论失败:', error);
    return res.error('审核通过评论失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 拒绝评论
 * @route POST /admin/reviews/:id/reject
 * @access Private (Admin)
 */
async function rejectReview(req, res) {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 拒绝评论`, { adminId, reviewId: id });

    // 检查评论是否存在
    const checkQuery = 'SELECT id, status FROM reviews WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('评论不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const review = checkResult.rows[0];

    // 检查评论状态是否可以拒绝
    if (review.status === 'approved') {
      return res.clientError('评论已审核通过，无法拒绝', ADMIN_ERRORS.REVIEW_ALREADY_APPROVED);
    }

    // 更新评论状态为已拒绝
    const updateQuery = `
      UPDATE reviews 
      SET 
        status = 'rejected',
        rejected_reason = $1,
        approved_by = $2,
        approved_at = $3,
        updated_at = $4
      WHERE id = $5
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      reason,
      adminId,
      new Date().toISOString(),
      new Date().toISOString(),
      id
    ]);

    const updatedReview = result.rows[0];

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'reject_review',
      'review',
      id,
      JSON.stringify({ reason: reason, notes: notes }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 拒绝评论成功`, { adminId, reviewId: id });
    return res.success({ review: updatedReview }, '评论拒绝成功');
  } catch (error) {
    logger.error('拒绝评论失败:', error);
    return res.error('拒绝评论失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取评论统计数据
 * @route GET /admin/reviews/statistics
 * @access Private (Admin)
 */
async function getReviewStatistics(req, res) {
  try {
    const { start_date, end_date, group_by = 'status' } = req.query;
    
    logger.info('管理员获取评论统计数据', { start_date, end_date, group_by });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (start_date) {
      whereClause += ` AND created_at >= $${index++}`;
      values.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${index++}`;
      values.push(end_date);
    }

    let groupByField = 'status';
    switch (group_by) {
      case 'day':
        groupByField = 'DATE(created_at)';
        break;
      case 'week':
        groupByField = 'DATE_TRUNC(\'week\', created_at)';
        break;
      case 'month':
        groupByField = 'DATE_TRUNC(\'month\', created_at)';
        break;
      case 'status':
        groupByField = 'status';
        break;
      case 'rating':
        groupByField = 'rating';
        break;
    }

    const query = `
      SELECT 
        ${groupByField} AS group_field,
        COUNT(*) AS count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_count,
        AVG(rating) AS avg_rating
      FROM reviews
      WHERE 1=1 ${whereClause}
      GROUP BY ${groupByField}
      ORDER BY ${groupByField}
    `;

    const result = await db.query(query, values);
    const stats = result.rows;

    // 获取总计
    const totalQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_total,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_total,
        AVG(rating) AS total_avg_rating
      FROM reviews
      WHERE 1=1 ${whereClause}
    `;

    const totalResult = await db.query(totalQuery, values);
    const totalStats = totalResult.rows[0];

    logger.info('获取评论统计数据成功');
    return res.success({ 
      stats: stats,
      total: totalStats
    }, '获取评论统计数据成功');
  } catch (error) {
    logger.error('获取评论统计数据失败:', error);
    return res.error('获取评论统计数据失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取评论图片
 * @route GET /admin/review-images
 * @access Private (Admin)
 */
async function getReviewImages(req, res) {
  try {
    const { review_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('管理员获取评论图片', { reviewId: review_id, page, limit });

    // 构建查询条件
    let whereClause = '';
    const values = [];
    let index = 1;

    if (review_id) {
      whereClause = 'WHERE review_id = $1';
      values.push(review_id);
    }

    const query = `
      SELECT 
        id,
        review_id,
        image_url,
        image_name,
        image_type,
        image_size,
        uploaded_at
      FROM review_images
      ${whereClause}
      ORDER BY uploaded_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await db.query(query, values);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM review_images
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values.slice(0, index-3));
    const total = parseInt(countResult.rows[0].total);

    const images = result.rows;

    // 构建分页信息
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    logger.info('获取评论图片成功');
    return res.paginate(images, pagination, '获取评论图片成功');
  } catch (error) {
    logger.error('获取评论图片失败:', error);
    return res.error('获取评论图片失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 获取评论图片详情
 * @route GET /admin/review-images/:id
 * @access Private (Admin)
 */
async function getReviewImageById(req, res) {
  try {
    const { id } = req.params;
    
    logger.info('管理员获取评论图片详情', { imageId: id });

    const query = `
      SELECT 
        id,
        review_id,
        image_url,
        image_name,
        image_type,
        image_size,
        uploaded_at
      FROM review_images
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.notFound('评论图片不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const image = result.rows[0];

    logger.info('获取评论图片详情成功');
    return res.success({ image: image }, '获取评论图片详情成功');
  } catch (error) {
    logger.error('获取评论图片详情失败:', error);
    return res.error('获取评论图片详情失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

/**
 * @description 删除评论图片
 * @route DELETE /admin/review-images/:id
 * @access Private (Admin)
 */
async function deleteReviewImage(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username;
    
    logger.info(`管理员 ${adminName} 删除评论图片`, { adminId, imageId: id });

    // 检查图片是否存在
    const checkQuery = 'SELECT id, image_name, review_id FROM review_images WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.notFound('评论图片不存在', COMMON_ERRORS.NOT_FOUND);
    }

    const image = checkResult.rows[0];

    // 删除图片
    const deleteQuery = 'DELETE FROM review_images WHERE id = $1 RETURNING id';
    const deleteResult = await db.query(deleteQuery, [id]);

    if (deleteResult.rowCount === 0) {
      return res.notFound('评论图片不存在', COMMON_ERRORS.NOT_FOUND);
    }

    // 记录操作日志
    const logQuery = `
      INSERT INTO operation_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await db.query(logQuery, [
      adminId,
      'delete_review_image',
      'review_image',
      id,
      JSON.stringify({ image_name: image.image_name, review_id: image.review_id }),
      req.ip,
      req.get('User-Agent') || ''
    ]);

    logger.info(`管理员 ${adminName} 删除评论图片成功`, { adminId, imageId: id });
    return res.success(null, '评论图片删除成功');
  } catch (error) {
    logger.error('删除评论图片失败:', error);
    return res.error('删除评论图片失败', COMMON_ERRORS.INTERNAL_ERROR);
  }
}

module.exports = {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  rejectReview,
  getReviewStatistics,
  getReviewImages,
  getReviewImageById,
  deleteReviewImage
};