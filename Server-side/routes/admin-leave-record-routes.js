const express = require('express');
const router = express.Router();
const { query, param, body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth-middleware');
const { logger } = require('../config/logger');
const { COMMON_ERRORS, USER_ERRORS, ROOM_ERRORS } = require('../constants/error-codes');

// 中间件：验证请求参数
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.clientError('请求参数验证失败', COMMON_ERRORS.VALIDATION_FAILED, { errors: errors.array() });
  }
  next();
};

/**
 * @route GET /admin/leave-records
 * @desc 获取请假记录列表（管理端）
 * @access Admin
 */
router.get('/', 
  authenticateToken,
  isAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的正整数'),
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']).withMessage('状态无效'),
    query('user_id').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
    query('room_id').optional().isInt({ min: 1 }).withMessage('寝室ID必须是正整数')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, user_id, room_id } = req.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      let whereClause = '';
      const queryParams = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` AND lr.status = $${paramIndex++}`;
        queryParams.push(status);
      }

      if (user_id) {
        whereClause += ` AND lr.user_id = $${paramIndex++}`;
        queryParams.push(user_id);
      }

      if (room_id) {
        whereClause += ` AND lr.room_id = $${paramIndex++}`;
        queryParams.push(room_id);
      }

      // 查询请假记录列表
      const queryText = `
        SELECT 
          lr.*, 
          u.username AS user_name,
          r.name AS room_name
        FROM leave_records lr
        JOIN users u ON lr.user_id = u.id
        JOIN rooms r ON lr.room_id = r.id
        WHERE 1=1 ${whereClause}
        ORDER BY lr.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await db.query(queryText, [...queryParams, parseInt(limit), parseInt(offset)]);

      // 查询总数
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM leave_records lr
        WHERE 1=1 ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // 构建分页信息对象
      const pagination = {
        page: parseInt(page),
        pageSize: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit))
      };

      logger.info(`管理员获取请假记录列表，共${result.rowCount}条记录`);

      return res.paginate(result.rows, pagination, '获取请假记录列表成功');
    } catch (error) {
      logger.error('获取请假记录列表失败:', error);
      return res.error('获取请假记录列表失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route GET /admin/leave-records/:id
 * @desc 获取请假记录详情（管理端）
 * @access Admin
 */
router.get('/:id',
  authenticateToken,
  isAdmin,
  [
    param('id').isUUID().withMessage('请假记录ID格式无效')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // 查询请假记录详情
      const queryText = `
        SELECT 
          lr.*,
          u.username AS username,
          u.employee_id AS employee_id,
          u.department AS department,
          u.position AS position,
          approver.username AS approver_name
        FROM leave_records lr
        JOIN users u ON lr.user_id = u.id
        LEFT JOIN users approver ON lr.approved_by = approver.id
        WHERE lr.id = $1
      `;

      const result = await db.query(queryText, [id]);

      if (result.rowCount === 0) {
        return res.notFound('请假记录不存在', COMMON_ERRORS.NOT_FOUND);
      }

      const leaveRecord = result.rows[0];

      // 查询附件信息（如果有附件表的话）
      // 这里假设有一个 attachments 表与 leave_records 关联
      const attachmentsQuery = `
        SELECT id, name, url
        FROM attachments
        WHERE record_id = $1 AND record_type = 'leave_record'
      `;
      
      const attachmentsResult = await db.query(attachmentsQuery, [id]);
      leaveRecord.attachments = attachmentsResult.rows;

      logger.info(`管理员获取请假记录详情，记录ID: ${id}`);

      return res.success({ leave_record: leaveRecord }, '获取请假记录详情成功');
    } catch (error) {
      logger.error('获取请假记录详情失败:', error);
      return res.error('获取请假记录详情失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route POST /admin/leave-records/:id/approve
 * @desc 审批请假记录（管理端）
 * @access Admin
 */
router.post('/:id/approve',
  authenticateToken,
  isAdmin,
  [
    param('id').isUUID().withMessage('请假记录ID格式无效'),
    body('status').isIn(['approved', 'rejected']).withMessage('审批状态无效'),
    body('approval_notes').optional().isString().withMessage('审批备注格式无效')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approval_notes } = req.body;
      const adminId = req.user.id;
      const adminName = req.user.username;

      // 检查请假记录是否存在且状态为pending
      const checkQuery = `
        SELECT id, status
        FROM leave_records
        WHERE id = $1
      `;

      const checkResult = await db.query(checkQuery, [id]);

      if (checkResult.rowCount === 0) {
        return res.notFound('请假记录不存在', COMMON_ERRORS.NOT_FOUND);
      }

      const leaveRecord = checkResult.rows[0];

      if (leaveRecord.status !== 'pending') {
        return res.conflict('请假记录状态不是待审批，不能进行审批操作', COMMON_ERRORS.OPERATION_NOT_ALLOWED);
      }

      // 更新请假记录状态
      const updateQuery = `
        UPDATE leave_records
        SET 
          status = $1,
          approved_by = $2,
          approved_at = NOW(),
          approval_notes = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const updateResult = await db.query(updateQuery, [
        status,
        adminId,
        approval_notes || null,
        id
      ]);

      logger.info(`管理员${adminName}审批了请假记录，记录ID: ${id}，审批结果: ${status}`);

      return res.success({ leave_record: updateResult.rows[0] }, '审批操作成功');
    } catch (error) {
      logger.error('审批请假记录失败:', error);
      return res.error('审批请假记录失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route POST /admin/leave-records/batch-approve
 * @desc 批量审批请假记录（管理端）
 * @access Admin
 */
router.post('/batch-approve',
  authenticateToken,
  isAdmin,
  [
    body('record_ids').isArray().withMessage('记录ID列表格式无效'),
    body('record_ids.*').isUUID().withMessage('记录ID格式无效'),
    body('status').isIn(['approved', 'rejected']).withMessage('审批状态无效'),
    body('approval_notes').optional().isString().withMessage('审批备注格式无效')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { record_ids, status, approval_notes } = req.body;
      const adminId = req.user.id;
      const adminName = req.user.username;

      // 统计成功和失败的数量
      let successCount = 0;
      let failureCount = 0;
      const failedItems = [];

      // 使用事务确保数据一致性
      const client = await db.connect();
      try {
        await client.query('BEGIN');

        for (const recordId of record_ids) {
          try {
            // 检查请假记录是否存在且状态为pending
            const checkQuery = `
              SELECT id, status
              FROM leave_records
              WHERE id = $1
            `;

            const checkResult = await client.query(checkQuery, [recordId]);

            if (checkResult.rowCount === 0) {
              failureCount++;
              failedItems.push({
                id: recordId,
                error: '请假记录不存在'
              });
              continue;
            }

            const leaveRecord = checkResult.rows[0];

            if (leaveRecord.status !== 'pending') {
              failureCount++;
              failedItems.push({
                id: recordId,
                error: '请假记录状态不是待审批，不能进行审批操作'
              });
              continue;
            }

            // 更新请假记录状态
            const updateQuery = `
              UPDATE leave_records
              SET 
                status = $1,
                approved_by = $2,
                approved_at = NOW(),
                approval_notes = $3,
                updated_at = NOW()
              WHERE id = $4
            `;

            await client.query(updateQuery, [
              status,
              adminId,
              approval_notes || null,
              recordId
            ]);

            successCount++;
          } catch (error) {
            failureCount++;
            failedItems.push({
              id: recordId,
              error: error.message
            });
          }
        }

        await client.query('COMMIT');

        logger.info(`管理员${adminName}批量审批了${record_ids.length}条请假记录，成功: ${successCount}，失败: ${failureCount}`);

        return res.success({
          success_count: successCount,
          failure_count: failureCount,
          failed_items: failedItems
        }, '批量审批操作完成');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('批量审批请假记录失败:', error);
      return res.error('批量审批请假记录失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route GET /admin/leave-records/types
 * @desc 获取请假类型列表（管理端）
 * @access Admin
 */
router.get('/types',
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      // 定义请假类型列表
      const leaveTypes = [
        {
          key: 'annual',
          name: '年假',
          description: '年度带薪休假'
        },
        {
          key: 'sick',
          name: '病假',
          description: '因病需要休息的假期'
        },
        {
          key: 'personal',
          name: '事假',
          description: '因个人事务需要处理的假期'
        },
        {
          key: 'maternity',
          name: '产假',
          description: '女性员工生育期间的假期'
        },
        {
          key: 'paternity',
          name: '陪产假',
          description: '男性员工配偶生育期间的假期'
        },
        {
          key: 'others',
          name: '其他',
          description: '其他类型的假期'
        }
      ];

      logger.info('管理员获取请假类型列表');

      return res.success({ leave_types: leaveTypes }, '获取请假类型列表成功');
    } catch (error) {
      logger.error('获取请假类型列表失败:', error);
      return res.error('获取请假类型列表失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route GET /admin/leave-records/stats
 * @desc 获取请假统计（管理端）
 * @access Admin
 */
router.get('/stats',
  authenticateToken,
  isAdmin,
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('user_id').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { start_date, end_date, user_id } = req.query;

      // 构建查询条件
      let whereClause = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        whereClause += ` AND lr.start_date >= $${paramIndex++}`;
        queryParams.push(start_date);
      }

      if (end_date) {
        whereClause += ` AND lr.start_date <= $${paramIndex++}`;
        queryParams.push(end_date);
      }

      if (user_id) {
        whereClause += ` AND lr.user_id = $${paramIndex++}`;
        queryParams.push(user_id);
      }

      // 查询总记录数和各状态统计
      const countQuery = `
        SELECT 
          COUNT(*) AS total_records,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count
        FROM leave_records lr
        WHERE 1=1 ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams);
      const stats = countResult.rows[0];

      // 查询按请假类型统计
      const typeStatsQuery = `
        SELECT 
          leave_type AS type,
          COUNT(*) AS count,
          SUM(EXTRACT(DAY FROM (end_date - start_date)) + 1) AS days
        FROM leave_records lr
        WHERE 1=1 ${whereClause} AND end_date IS NOT NULL
        GROUP BY leave_type
        ORDER BY count DESC
      `;

      const typeStatsResult = await db.query(typeStatsQuery, queryParams);
      stats.leave_type_stats = typeStatsResult.rows;

      // 查询按月统计
      const monthlyStatsQuery = `
        SELECT 
          TO_CHAR(start_date, 'YYYY-MM') AS month,
          COUNT(*) AS count,
          SUM(EXTRACT(DAY FROM (end_date - start_date)) + 1) AS days
        FROM leave_records lr
        WHERE 1=1 ${whereClause} AND end_date IS NOT NULL
        GROUP BY TO_CHAR(start_date, 'YYYY-MM')
        ORDER BY month
      `;

      const monthlyStatsResult = await db.query(monthlyStatsQuery, queryParams);
      stats.monthly_stats = monthlyStatsResult.rows;

      // 查询按用户统计（前10名）
      const userStatsQuery = `
        SELECT 
          lr.user_id,
          u.username,
          COUNT(*) AS count,
          SUM(EXTRACT(DAY FROM (end_date - start_date)) + 1) AS days
        FROM leave_records lr
        JOIN users u ON lr.user_id = u.id
        WHERE 1=1 ${whereClause} AND end_date IS NOT NULL
        GROUP BY lr.user_id, u.username
        ORDER BY days DESC
        LIMIT 10
      `;

      const userStatsResult = await db.query(userStatsQuery, queryParams);
      stats.user_stats = userStatsResult.rows;

      logger.info('管理员获取请假统计数据');

      return res.success(stats, '获取请假统计数据成功');
    } catch (error) {
      logger.error('获取请假统计数据失败:', error);
      return res.error('获取请假统计数据失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route POST /admin/leave-records
 * @desc 创建请假记录（管理端）
 * @access Admin
 */
router.post('/',
  authenticateToken,
  isAdmin,
  [
    body('user_id').isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
    body('leave_type').isIn(['annual', 'sick', 'personal', 'maternity', 'paternity', 'others']).withMessage('请假类型无效'),
    body('start_date').isISO8601().withMessage('开始日期格式无效'),
    body('end_date').isISO8601().withMessage('结束日期格式无效'),
    body('reason').isString().notEmpty().withMessage('请假原因不能为空'),
    body('attachments').optional().isArray().withMessage('附件格式无效')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { user_id, leave_type, start_date, end_date, reason, attachments } = req.body;
      const adminId = req.user.id;

      // 检查用户是否存在
      const userCheckQuery = `
        SELECT id, username
        FROM users
        WHERE id = $1
      `;

      const userCheckResult = await db.query(userCheckQuery, [user_id]);

      if (userCheckResult.rowCount === 0) {
        return res.notFound('用户不存在', USER_ERRORS.USER_NOT_FOUND);
      }

      const user = userCheckResult.rows[0];

      // 获取用户所在的寝室
      const roomQuery = `
        SELECT room_id
        FROM user_rooms
        WHERE user_id = $1 AND is_current = true
      `;

      const roomResult = await db.query(roomQuery, [user_id]);

      if (roomResult.rowCount === 0) {
        return res.clientError('用户未分配寝室', ROOM_ERRORS.ROOM_MEMBER_NOT_FOUND);
      }

      const roomId = roomResult.rows[0].room_id;

      // 计算请假天数
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const leaveDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // 插入请假记录
      const insertQuery = `
        INSERT INTO leave_records (
          user_id, room_id, leave_type, start_date, end_date, reason, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
        RETURNING *
      `;

      const insertResult = await db.query(insertQuery, [
        user_id,
        roomId,
        leave_type,
        start_date,
        end_date,
        reason,
        adminId
      ]);

      const newLeaveRecord = insertResult.rows[0];

      logger.info(`管理员为用户${user.username}创建了请假记录，记录ID: ${newLeaveRecord.id}`);

      return res.success({ leave_record: newLeaveRecord }, '创建请假记录成功', 201);
    } catch (error) {
      logger.error('创建请假记录失败:', error);
      return res.error('创建请假记录失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route PUT /admin/leave-records/:id
 * @desc 更新请假记录（管理端）
 * @access Admin
 */
router.put('/:id',
  authenticateToken,
  isAdmin,
  [
    param('id').isUUID().withMessage('请假记录ID格式无效'),
    body('leave_type').optional().isIn(['annual', 'sick', 'personal', 'maternity', 'paternity', 'others']).withMessage('请假类型无效'),
    body('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    body('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    body('reason').optional().isString().notEmpty().withMessage('请假原因不能为空')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { leave_type, start_date, end_date, reason } = req.body;
      const adminId = req.user.id;

      // 检查请假记录是否存在
      const recordCheckQuery = `
        SELECT lr.*, u.username
        FROM leave_records lr
        JOIN users u ON lr.user_id = u.id
        WHERE lr.id = $1
      `;

      const recordCheckResult = await db.query(recordCheckQuery, [id]);

      if (recordCheckResult.rowCount === 0) {
        return res.notFound('请假记录不存在', COMMON_ERRORS.NOT_FOUND);
      }

      const existingRecord = recordCheckResult.rows[0];

      // 检查记录状态，只有pending状态的记录才能更新
      if (existingRecord.status !== 'pending') {
        return res.clientError('只有待审批的请假记录才能更新', COMMON_ERRORS.OPERATION_NOT_ALLOWED);
      }

      // 构建更新语句
      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      if (leave_type !== undefined) {
        updateFields.push(`leave_type = $${paramIndex++}`);
        updateValues.push(leave_type);
      }

      if (start_date !== undefined) {
        updateFields.push(`start_date = $${paramIndex++}`);
        updateValues.push(start_date);
      }

      if (end_date !== undefined) {
        updateFields.push(`end_date = $${paramIndex++}`);
        updateValues.push(end_date);
      }

      if (reason !== undefined) {
        updateFields.push(`reason = $${paramIndex++}`);
        updateValues.push(reason);
      }

      // 如果没有提供任何更新字段，则返回错误
      if (updateFields.length === 0) {
        return res.clientError('至少需要提供一个更新字段', COMMON_ERRORS.VALIDATION_FAILED);
      }

      // 添加更新时间和更新人
      updateFields.push(`updated_at = NOW()`);
      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(adminId);
      updateValues.push(id); // 为WHERE子句添加ID参数

      const updateQuery = `
        UPDATE leave_records
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const updateResult = await db.query(updateQuery, updateValues);

      const updatedRecord = updateResult.rows[0];

      logger.info(`管理员更新了用户${existingRecord.username}的请假记录，记录ID: ${id}`);

      return res.success({ leave_record: updatedRecord }, '更新请假记录成功');
    } catch (error) {
      logger.error('更新请假记录失败:', error);
      return res.error('更新请假记录失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route DELETE /admin/leave-records/:id
 * @desc 删除请假记录（管理端）
 * @access Admin
 */
router.delete('/:id',
  authenticateToken,
  isAdmin,
  [
    param('id').isUUID().withMessage('请假记录ID格式无效')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // 检查请假记录是否存在
      const recordCheckQuery = `
        SELECT lr.*, u.username
        FROM leave_records lr
        JOIN users u ON lr.user_id = u.id
        WHERE lr.id = $1
      `;

      const recordCheckResult = await db.query(recordCheckQuery, [id]);

      if (recordCheckResult.rowCount === 0) {
        return res.notFound('请假记录不存在', COMMON_ERRORS.NOT_FOUND);
      }

      const existingRecord = recordCheckResult.rows[0];

      // 检查记录状态，只有pending状态的记录才能删除
      if (existingRecord.status !== 'pending') {
        return res.clientError('只有待审批的请假记录才能删除', COMMON_ERRORS.OPERATION_NOT_ALLOWED);
      }

      // 删除请假记录
      const deleteQuery = `
        DELETE FROM leave_records
        WHERE id = $1
        RETURNING *
      `;

      const deleteResult = await db.query(deleteQuery, [id]);

      logger.info(`管理员删除了用户${existingRecord.username}的请假记录，记录ID: ${id}`);

      return res.success(null, '删除请假记录成功');
    } catch (error) {
      logger.error('删除请假记录失败:', error);
      return res.error('删除请假记录失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

/**
 * @route GET /admin/leave-records/export
 * @desc 导出请假记录（管理端）
 * @access Admin
 */
router.get('/export',
  authenticateToken,
  isAdmin,
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']).withMessage('状态值无效'),
    query('leave_type').optional().isIn(['annual', 'sick', 'personal', 'maternity', 'paternity', 'others']).withMessage('请假类型无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('user_id').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, leave_type, start_date, end_date, user_id } = req.query;

      // 构建查询条件
      let whereClause = '';
      const queryParams = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` AND lr.status = $${paramIndex++}`;
        queryParams.push(status);
      }

      if (leave_type) {
        whereClause += ` AND lr.leave_type = $${paramIndex++}`;
        queryParams.push(leave_type);
      }

      if (start_date) {
        whereClause += ` AND lr.start_date >= $${paramIndex++}`;
        queryParams.push(start_date);
      }

      if (end_date) {
        whereClause += ` AND lr.start_date <= $${paramIndex++}`;
        queryParams.push(end_date);
      }

      if (user_id) {
        whereClause += ` AND lr.user_id = $${paramIndex++}`;
        queryParams.push(user_id);
      }

      // 查询请假记录
      const exportQuery = `
        SELECT 
          lr.id,
          u.username,
          r.room_number,
          lr.leave_type,
          lr.start_date,
          lr.end_date,
          lr.reason,
          lr.status,
          lr.created_at,
          lr.approved_at,
          admin.username AS approved_by
        FROM leave_records lr
        JOIN users u ON lr.user_id = u.id
        JOIN user_rooms ur ON lr.user_id = ur.user_id AND ur.is_current = true
        JOIN rooms r ON ur.room_id = r.id
        LEFT JOIN users admin ON lr.approved_by = admin.id
        WHERE 1=1 ${whereClause}
        ORDER BY lr.created_at DESC
      `;

      const exportResult = await db.query(exportQuery, queryParams);

      // 生成CSV内容
      const records = exportResult.rows;
      const csvHeader = 'ID,用户名,寝室号,请假类型,开始日期,结束日期,请假原因,状态,创建时间,审批时间,审批人\n';
      const csvRows = records.map(record => {
        return `"${record.id}","${record.username}","${record.room_number}","${record.leave_type}","${record.start_date}","${record.end_date}","${record.reason}","${record.status}","${record.created_at}","${record.approved_at || ''}","${record.approved_by || ''}"`;
      });
      const csvContent = csvHeader + csvRows.join('\n');

      // 设置响应头
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leave_records.csv"');

      logger.info('管理员导出请假记录');

      res.status(200).send(csvContent);
    } catch (error) {
      logger.error('导出请假记录失败:', error);
      return res.error('导出请假记录失败', COMMON_ERRORS.INTERNAL_ERROR);
    }
  }
);

module.exports = router;