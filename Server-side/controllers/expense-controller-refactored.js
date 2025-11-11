/**
 * 重构后的费用控制器
 * 使用BaseController和DatabaseHelper简化代码，提高代码质量和可维护性
 */

const { BaseController } = require('./base-controller');
const { DatabaseHelper } = require('../utils/database-helper');
const { PrecisionCalculator } = require('../services/precision-calculator');
const { 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError, 
  ConflictError,
  DatabaseError
} = require('../middleware/unified-error-handler');

/**
 * 费用控制器
 * 处理费用相关的业务逻辑
 */
class ExpenseController extends BaseController {
  constructor() {
    super('expense');
  }

  /**
   * 创建费用记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async createExpense(req, res, next) {
    const requestId = req.requestId;
    const creatorId = req.user.sub;
    
    const { 
      title, 
      description, 
      amount, 
      expense_type_id, 
      room_id, 
      payer_id, 
      split_type, 
      split_details,
      expense_date,
      receipt_image_url,
      tags,
      status,
      // 读数计算方式相关字段
      calculation_method = 'amount', // 'amount' 或 'reading'
      meter_type,
      current_reading,
      previous_reading,
      unit_price,
      // 分摊人员选择相关字段
      selected_members
    } = req.body;

    // 验证必填字段
    this.validateRequiredFields(req.body, ['title', 'expense_type_id', 'room_id', 'payer_id', 'split_type'], requestId);

    // 验证selected_members参数
    if (selected_members && !Array.isArray(selected_members)) {
      throw new ValidationError('selected_members参数必须是数组');
    }

    // 如果是读数计算方式，验证必填字段
    let calculatedAmount = amount;
    if (calculation_method === 'reading') {
      this.validateRequiredFields(
        { meter_type, current_reading, previous_reading, unit_price }, 
        ['meter_type', 'current_reading', 'previous_reading', 'unit_price'], 
        requestId
      );
      
      // 验证读数是否合理
      if (parseFloat(current_reading) < parseFloat(previous_reading)) {
        throw new ValidationError('本次读数不能小于上次读数');
      }
      
      // 计算用量和总费用
      const usage = PrecisionCalculator.subtract(parseFloat(current_reading), parseFloat(previous_reading));
      calculatedAmount = PrecisionCalculator.multiply(usage, parseFloat(unit_price));
      
      // 如果前端提供了金额，检查是否与计算结果一致
      if (amount && Math.abs(PrecisionCalculator.subtract(calculatedAmount, parseFloat(amount))) > 0.01) {
        throw new ValidationError(`计算金额(${calculatedAmount})与提供金额(${amount})不一致`);
      }
    } else if (!amount) {
      throw new ValidationError('金额计算方式需要提供金额');
    }

    // 验证用户是否是寝室成员
    await this.validateRoomMembership(creatorId, room_id, requestId);

    // 验证费用类型是否存在
    const expenseType = await DatabaseHelper.queryOne(
      'SELECT * FROM expense_types WHERE id = $1',
      [expense_type_id],
      requestId
    );

    if (!expenseType) {
      throw new NotFoundError('费用类型不存在');
    }

    // 使用事务创建费用记录
    const expense = await DatabaseHelper.transaction(async (client) => {
      // 将前端传入的split_type映射到数据库中的split_algorithm
      let splitAlgorithm = split_type;
      if (split_type === 'percentage') {
        splitAlgorithm = 'by_area';
      }
      
      // 插入费用记录
      const expense = await DatabaseHelper.insert(
        'expenses',
        {
          title,
          description: description || '',
          amount: calculatedAmount,
          expense_type_id,
          room_id,
          payer_id,
          split_algorithm: splitAlgorithm,
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          split_parameters: JSON.stringify({}),
          status: 'pending',
          created_by: creatorId,
          calculation_method,
          meter_type,
          current_reading,
          previous_reading,
          unit_price
        },
        requestId,
        client
      );

      // 如果有指定分摊成员，创建分摊记录
      if (selected_members && selected_members.length > 0) {
        const splitRecords = selected_members.map(memberId => ({
          expense_id: expense.id,
          user_id: memberId,
          amount: 0, // 将在后续计算中更新
          status: 'pending',
          created_at: new Date()
        }));

        await DatabaseHelper.insertMany(
          'expense_splits',
          splitRecords,
          requestId,
          client
        );
      }

      return expense;
    }, requestId);

    // 返回创建的费用记录
    const expenseResponse = await DatabaseHelper.queryOne(
      `SELECT e.*, et.name as expense_type_name, u.username as payer_name 
       FROM expenses e 
       JOIN expense_types et ON e.expense_type_id = et.id 
       JOIN users u ON e.payer_id = u.id 
       WHERE e.id = $1`,
      [expense.id],
      requestId
    );

    return res.success(201, '费用记录创建成功', expenseResponse);
  }

  /**
   * 获取费用记录列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getExpenses(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;
    const { 
      room_id, 
      page = 1, 
      limit = 20, 
      status, 
      expense_type_id,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    // 验证用户是否是寝室成员
    if (room_id) {
      await this.validateRoomMembership(userId, room_id, requestId);
    }

    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // 如果指定了房间ID，只查询该房间的费用
    if (room_id) {
      whereConditions.push(`e.room_id = $${paramIndex++}`);
      queryParams.push(room_id);
    } else {
      // 否则查询用户参与的所有房间的费用
      whereConditions.push(`e.room_id IN (SELECT room_id FROM user_room_relations WHERE user_id = $${paramIndex++} AND is_active = TRUE)`);
      queryParams.push(userId);
    }

    // 添加状态过滤
    if (status) {
      whereConditions.push(`e.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    // 添加费用类型过滤
    if (expense_type_id) {
      whereConditions.push(`e.expense_type_id = $${paramIndex++}`);
      queryParams.push(expense_type_id);
    }

    // 添加日期范围过滤
    if (start_date) {
      whereConditions.push(`e.expense_date >= $${paramIndex++}`);
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push(`e.expense_date <= $${paramIndex++}`);
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 验证排序字段
    const validSortFields = ['created_at', 'expense_date', 'amount', 'title'];
    if (!validSortFields.includes(sort_by)) {
      throw new ValidationError(`无效的排序字段: ${sort_by}`);
    }

    const validSortOrders = ['ASC', 'DESC'];
    if (!validSortOrders.includes(sort_order.toUpperCase())) {
      throw new ValidationError(`无效的排序方向: ${sort_order}`);
    }

    // 查询费用记录
    const query = `
      SELECT e.*, et.name as expense_type_name, u.username as payer_name 
      FROM expenses e 
      JOIN expense_types et ON e.expense_type_id = et.id 
      JOIN users u ON e.payer_id = u.id 
      ${whereClause}
      ORDER BY e.${sort_by} ${sort_order.toUpperCase()}
    `;

    const result = await DatabaseHelper.paginate(
      query,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        params: queryParams
      },
      requestId
    );

    return res.success(200, '获取费用记录成功', result);
  }

  /**
   * 获取费用详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getExpenseById(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;
    const { id } = req.params;

    // 获取费用记录
    const expense = await DatabaseHelper.queryOne(
      `SELECT e.*, et.name as expense_type_name, u.username as payer_name 
       FROM expenses e 
       JOIN expense_types et ON e.expense_type_id = et.id 
       JOIN users u ON e.payer_id = u.id 
       WHERE e.id = $1`,
      [id],
      requestId
    );

    if (!expense) {
      throw new NotFoundError('费用记录不存在');
    }

    // 验证用户是否是寝室成员
    await this.validateRoomMembership(userId, expense.room_id, requestId);

    // 获取费用分摊记录
    const splits = await DatabaseHelper.queryMany(
      `SELECT es.*, u.username, u.display_name 
       FROM expense_splits es 
       JOIN users u ON es.user_id = u.id 
       WHERE es.expense_id = $1`,
      [id],
      requestId
    );

    // 获取费用标签
    const tags = await DatabaseHelper.queryMany(
      `SELECT t.* 
       FROM tags t 
       JOIN expense_tags et ON t.id = et.tag_id 
       WHERE et.expense_id = $1`,
      [id],
      requestId
    );

    const expenseResponse = {
      ...expense,
      splits,
      tags
    };

    return res.success(200, '获取费用详情成功', expenseResponse);
  }

  /**
   * 更新费用记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async updateExpense(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;
    const { id } = req.params;
    
    const { 
      title, 
      description, 
      amount, 
      expense_type_id, 
      expense_date,
      receipt_image_url,
      tags,
      status,
      // 读数计算方式相关字段
      calculation_method,
      meter_type,
      current_reading,
      previous_reading,
      unit_price
    } = req.body;

    // 获取当前费用记录
    const currentExpense = await DatabaseHelper.queryOne(
      'SELECT * FROM expenses WHERE id = $1',
      [id],
      requestId
    );

    if (!currentExpense) {
      throw new NotFoundError('费用记录不存在');
    }

    // 验证用户是否是寝室成员
    await this.validateRoomMembership(userId, currentExpense.room_id, requestId);

    // 验证用户是否有权限更新费用记录（只有创建者或付款人可以更新）
    if (currentExpense.created_by !== userId && currentExpense.payer_id !== userId) {
      throw new ForbiddenError('您没有权限更新此费用记录');
    }

    // 如果更新了费用类型，验证费用类型是否存在
    if (expense_type_id && expense_type_id !== currentExpense.expense_type_id) {
      const expenseType = await DatabaseHelper.queryOne(
        'SELECT * FROM expense_types WHERE id = $1',
        [expense_type_id],
        requestId
      );

      if (!expenseType) {
        throw new NotFoundError('费用类型不存在');
      }
    }

    // 如果是读数计算方式，验证必填字段
    let calculatedAmount = amount;
    if (calculation_method === 'reading') {
      this.validateRequiredFields(
        { meter_type, current_reading, previous_reading, unit_price }, 
        ['meter_type', 'current_reading', 'previous_reading', 'unit_price'], 
        requestId
      );
      
      // 验证读数是否合理
      if (parseFloat(current_reading) < parseFloat(previous_reading)) {
        throw new ValidationError('本次读数不能小于上次读数');
      }
      
      // 计算用量和总费用
      const usage = PrecisionCalculator.subtract(parseFloat(current_reading), parseFloat(previous_reading));
      calculatedAmount = PrecisionCalculator.multiply(usage, parseFloat(unit_price));
      
      // 如果前端提供了金额，检查是否与计算结果一致
      if (amount && Math.abs(PrecisionCalculator.subtract(calculatedAmount, parseFloat(amount))) > 0.01) {
        throw new ValidationError(`计算金额(${calculatedAmount})与提供金额(${amount})不一致`);
      }
    }

    // 准备更新数据
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (calculatedAmount !== undefined) updateData.amount = calculatedAmount;
    if (expense_type_id !== undefined) updateData.expense_type_id = expense_type_id;
    if (expense_date !== undefined) updateData.expense_date = expense_date;
    if (receipt_image_url !== undefined) updateData.receipt_image_url = receipt_image_url;
    if (status !== undefined) updateData.status = status;
    if (calculation_method !== undefined) updateData.calculation_method = calculation_method;
    if (meter_type !== undefined) updateData.meter_type = meter_type;
    if (current_reading !== undefined) updateData.current_reading = current_reading;
    if (previous_reading !== undefined) updateData.previous_reading = previous_reading;
    if (unit_price !== undefined) updateData.unit_price = unit_price;
    updateData.updated_at = new Date();

    // 更新费用记录
    const updatedExpense = await DatabaseHelper.update(
      'expenses',
      updateData,
      { id },
      requestId
    );

    // 如果提供了标签，更新费用标签
    if (tags !== undefined) {
      await DatabaseHelper.transaction(async (client) => {
        // 删除现有标签关联
        await DatabaseHelper.delete(
          'expense_tags',
          { expense_id: id },
          requestId,
          client
        );

        // 添加新标签关联
        if (tags.length > 0) {
          const tagRelations = tags.map(tagId => ({
            expense_id: id,
            tag_id: tagId
          }));

          await DatabaseHelper.insertMany(
            'expense_tags',
            tagRelations,
            requestId,
            client
          );
        }
      }, requestId);
    }

    // 返回更新后的费用记录
    const expenseResponse = await DatabaseHelper.queryOne(
      `SELECT e.*, et.name as expense_type_name, u.username as payer_name 
       FROM expenses e 
       JOIN expense_types et ON e.expense_type_id = et.id 
       JOIN users u ON e.payer_id = u.id 
       WHERE e.id = $1`,
      [id],
      requestId
    );

    return res.success(200, '费用记录更新成功', expenseResponse);
  }

  /**
   * 删除费用记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async deleteExpense(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;
    const { id } = req.params;

    // 获取费用记录
    const expense = await DatabaseHelper.queryOne(
      'SELECT * FROM expenses WHERE id = $1',
      [id],
      requestId
    );

    if (!expense) {
      throw new NotFoundError('费用记录不存在');
    }

    // 验证用户是否是寝室成员
    await this.validateRoomMembership(userId, expense.room_id, requestId);

    // 验证用户是否有权限删除费用记录（只有创建者可以删除）
    if (expense.created_by !== userId) {
      throw new ForbiddenError('您没有权限删除此费用记录');
    }

    // 使用事务删除费用记录及相关数据
    await DatabaseHelper.transaction(async (client) => {
      // 删除费用分摊记录
      await DatabaseHelper.delete(
        'expense_splits',
        { expense_id: id },
        requestId,
        client
      );

      // 删除费用标签关联
      await DatabaseHelper.delete(
        'expense_tags',
        { expense_id: id },
        requestId,
        client
      );

      // 删除费用记录
      await DatabaseHelper.delete(
        'expenses',
        { id },
        requestId,
        client
      );
    }, requestId);

    return res.success(200, '费用记录删除成功');
  }

  /**
   * 确认支付分摊
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async confirmPaymentSplit(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;
    const { id } = req.params;
    const { split_ids } = req.body;

    // 验证必填字段
    this.validateRequiredFields(req.body, ['split_ids'], requestId);

    // 验证split_ids是否为数组
    if (!Array.isArray(split_ids) || split_ids.length === 0) {
      throw new ValidationError('split_ids必须是非空数组');
    }

    // 获取费用记录
    const expense = await DatabaseHelper.queryOne(
      'SELECT * FROM expenses WHERE id = $1',
      [id],
      requestId
    );

    if (!expense) {
      throw new NotFoundError('费用记录不存在');
    }

    // 验证用户是否是寝室成员
    await this.validateRoomMembership(userId, expense.room_id, requestId);

    // 验证用户是否有权限确认支付（只有付款人可以确认）
    if (expense.payer_id !== userId) {
      throw new ForbiddenError('只有付款人可以确认支付');
    }

    // 验证所有分摊记录都属于该费用且用户是分摊人
    const splits = await DatabaseHelper.queryMany(
      `SELECT * FROM expense_splits 
       WHERE id = ANY($1) AND expense_id = $2 AND user_id = $3`,
      [split_ids, id, userId],
      requestId
    );

    if (splits.length !== split_ids.length) {
      throw new ValidationError('部分分摊记录不存在或不属于当前用户');
    }

    // 更新分摊记录状态为已支付
    await DatabaseHelper.updateMany(
      'expense_splits',
      { status: 'paid', paid_at: new Date() },
      { id: split_ids },
      requestId
    );

    // 检查是否所有分摊都已支付，如果是，则更新费用状态为已支付
    const unpaidSplits = await DatabaseHelper.queryOne(
      `SELECT COUNT(*) as count FROM expense_splits 
       WHERE expense_id = $1 AND status != 'paid'`,
      [id],
      requestId
    );

    if (unpaidSplits.count === 0) {
      await DatabaseHelper.update(
        'expenses',
        { status: 'paid', paid_at: new Date() },
        { id },
        requestId
      );
    }

    return res.success(200, '支付确认成功');
  }

  /**
   * 获取费用统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getExpenseStats(req, res, next) {
    const requestId = req.requestId;
    const userId = req.user.sub;
    const { room_id, start_date, end_date } = req.query;

    // 验证用户是否是寝室成员
    if (room_id) {
      await this.validateRoomMembership(userId, room_id, requestId);
    }

    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // 如果指定了房间ID，只查询该房间的费用
    if (room_id) {
      whereConditions.push(`e.room_id = $${paramIndex++}`);
      queryParams.push(room_id);
    } else {
      // 否则查询用户参与的所有房间的费用
      whereConditions.push(`e.room_id IN (SELECT room_id FROM user_room_relations WHERE user_id = $${paramIndex++} AND is_active = TRUE)`);
      queryParams.push(userId);
    }

    // 添加日期范围过滤
    if (start_date) {
      whereConditions.push(`e.expense_date >= $${paramIndex++}`);
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push(`e.expense_date <= $${paramIndex++}`);
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 查询总费用统计
    const totalStats = await DatabaseHelper.queryOne(
      `SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(e.amount), 0) as total_amount
       FROM expenses e 
       ${whereClause}`,
      queryParams,
      requestId
    );

    // 查询按费用类型分组的统计
    const typeStats = await DatabaseHelper.queryMany(
      `SELECT 
        et.name as type_name,
        COUNT(*) as count,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END), 0) as pending_amount
       FROM expenses e 
       JOIN expense_types et ON e.expense_type_id = et.id 
       ${whereClause}
       GROUP BY et.id, et.name
       ORDER BY total_amount DESC`,
      queryParams,
      requestId
    );

    // 查询按用户分组的统计
    const userStats = await DatabaseHelper.queryMany(
      `SELECT 
        u.id,
        u.username,
        u.display_name,
        COUNT(*) as paid_count,
        COALESCE(SUM(e.amount), 0) as paid_amount
       FROM expenses e 
       JOIN users u ON e.payer_id = u.id 
       ${whereClause}
       GROUP BY u.id, u.username, u.display_name
       ORDER BY paid_amount DESC`,
      queryParams,
      requestId
    );

    const statsResponse = {
      total: totalStats,
      by_type: typeStats,
      by_user: userStats
    };

    return res.success(200, '获取费用统计成功', statsResponse);
  }
}

module.exports = {
  ExpenseController
};