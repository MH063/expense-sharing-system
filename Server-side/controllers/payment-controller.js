const winston = require('winston');
const { pool } = require('../config/db');
const { PrecisionCalculator } = require('../services/precision-calculator');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/payment-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/payment-combined.log' })
  ]
});

/**
 * 支付管理控制器
 * 处理扫码支付、支付状态确认等操作
 */
class PaymentController {
  constructor() {
    // 使用共享连接池，避免重复创建
    this.pool = pool;
  }

  /**
   * 获取账单收款码
   */
  getBillQrCode = async (req, res) => {
    const startTime = Date.now();
    const requestId = `bill-qr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await this.pool.connect();
    
    try {
      const { billId } = req.params;
      const userId = req.user.sub;
      const { qr_type } = req.query; // wechat 或 alipay
      
      logger.info(`[${requestId}] 开始获取账单收款码`, {
        requestId,
        userId,
        billId,
        qr_type
      });

      // 验证收款码类型
      if (!qr_type || !['wechat', 'alipay'].includes(qr_type)) {
        logger.warn(`[${requestId}] 获取账单收款码失败: 无效的收款码类型`, {
          requestId,
          userId,
          billId,
          qr_type
        });
        
        return res.error(400, '收款码类型必须是wechat或alipay');
      }

      // 检查账单是否存在
      const billCheck = await client.query(
        `SELECT b.*, r.name as room_name, u.username as creator_name
         FROM bills b
         JOIN rooms r ON b.room_id = r.id
         JOIN users u ON b.creator_id = u.id
         WHERE b.id = $1`,
        [billId]
      );

      if (billCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 获取账单收款码失败: 账单不存在`, {
          requestId,
          userId,
          billId
        });
        
        return res.error(404, '账单不存在');
      }

      const bill = billCheck.rows[0];

      // 检查用户是否有权限查看此账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM user_room_relations 
         WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [bill.room_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 获取账单收款码失败: 用户无权限查看账单`, {
          requestId,
          userId,
          billId,
          roomId: bill.room_id
        });
        
        return res.error(403, '您没有权限查看此账单');
      }

      // 获取账单分摊信息
      const splitDetails = await client.query(
        `SELECT bs.*, u.username as user_name
         FROM bill_splits bs
         JOIN users u ON bs.user_id = u.id
         WHERE bs.bill_id = $1`,
        [billId]
      );

      // 获取当前用户的分摊信息
      const userSplit = splitDetails.rows.find(split => split.user_id == userId);
      
      if (!userSplit) {
        logger.warn(`[${requestId}] 获取账单收款码失败: 用户不在账单分摊中`, {
          requestId,
          userId,
          billId
        });
        
        return res.error(403, '您不在此账单的分摊中');
      }

      // 检查用户是否已支付
      if (userSplit.status === 'PAID') {
        logger.warn(`[${requestId}] 获取账单收款码失败: 用户已支付`, {
          requestId,
          userId,
          billId
        });
        
        return res.error(400, '您已支付此账单');
      }

      // 获取收款人的默认收款码
      const payeeQrCode = await client.query(
        `SELECT uqc.qr_image_url
         FROM user_qr_codes uqc
         WHERE uqc.user_id = $1 AND uqc.qr_type = $2 AND uqc.is_active = TRUE AND uqc.is_default = TRUE
         LIMIT 1`,
        [bill.payee_id || bill.creator_id, qr_type]
      );

      if (payeeQrCode.rows.length === 0) {
        logger.warn(`[${requestId}] 获取账单收款码失败: 收款人未设置收款码`, {
          requestId,
          userId,
          billId,
          qr_type,
          payeeId: bill.payee_id || bill.creator_id
        });
        
        return res.error(404, `收款人未设置默认的${qr_type === 'wechat' ? '微信' : '支付宝'}收款码`);
      }

      // 构建支付信息
      const paymentInfo = {
        bill_id: bill.id,
        bill_title: bill.title,
        bill_description: bill.description,
        room_name: bill.room_name,
        creator_name: bill.creator_name,
        total_amount: bill.total_amount,
        user_amount: userSplit.amount,
        qr_type: qr_type,
        qr_image_url: payeeQrCode.rows[0].qr_image_url,
        payee_id: bill.payee_id || bill.creator_id,
        payer_id: userId,
        created_at: bill.created_at,
        due_date: bill.due_date
      };
      
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取账单收款码成功`, {
        requestId,
        userId,
        billId,
        qr_type,
        totalAmount: bill.total_amount,
        userAmount: userSplit.amount,
        duration
      });

      res.success(200, '获取账单收款码成功', { payment_info: paymentInfo });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取账单收款码失败`, {
        requestId,
        userId: req.user.sub,
        billId: req.params.billId,
        qr_type: req.query.qr_type,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取账单收款码失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 确认支付
   */
  confirmPayment = async (req, res) => {
    const startTime = Date.now();
    const requestId = `payment-confirm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await this.pool.connect();
    
    try {
      const { billId } = req.params;
      const userId = req.user.sub;
      const { paymentMethod, transactionId, amount, notes, paymentTime } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] || null;
      
      logger.info(`[${requestId}] 开始确认支付`, {
        requestId,
        userId,
        billId,
        paymentMethod,
        transactionId,
        amount,
        paymentTime,
        idempotencyKey
      });

      // 验证必填字段
      if (!paymentMethod || !transactionId || !amount) {
        logger.warn(`[${requestId}] 确认支付失败: 缺少必填字段`, {
          requestId,
          userId,
          billId,
          paymentMethod,
          transactionId,
          amount
        });
        
        return res.error(400, '请提供完整的支付信息');
      }
      
      // 验证支付方式
      if (!['wechat', 'alipay', 'cash', 'bank_transfer'].includes(paymentMethod)) {
        logger.warn(`[${requestId}] 确认支付失败: 无效的支付方式`, {
          requestId,
          userId,
          billId,
          paymentMethod
        });
        
        return res.error(400, '无效的支付方式');
      }

      // 检查账单是否存在
      const billCheck = await client.query(
        `SELECT b.*, r.name as room_name FROM bills b JOIN rooms r ON b.room_id = r.id WHERE b.id = $1`,
        [billId]
      );
      if (billCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 确认支付失败: 账单不存在`, {
          requestId,
          userId,
          billId
        });
        
        return res.error(404, '账单不存在');
      }
      const bill = billCheck.rows[0];

      // 检查用户是否有权限支付此账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM user_room_relations WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [bill.room_id, userId]
      );
      if (permissionCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 确认支付失败: 用户无权限支付账单`, {
          requestId,
          userId,
          billId,
          roomId: bill.room_id
        });
        
        return res.error(403, '您没有权限支付此账单');
      }

      // 获取用户的分摊信息
      const splitCheck = await client.query(
        `SELECT * FROM bill_splits WHERE bill_id = $1 AND user_id = $2`,
        [billId, userId]
      );
      if (splitCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 确认支付失败: 用户不在账单分摊中`, {
          requestId,
          userId,
          billId
        });
        
        return res.error(403, '您不在此账单的分摊中');
      }
      const userSplit = splitCheck.rows[0];

      // 幂等性检查：按交易号或幂等性键避免重复写入
      const existingByTxn = await client.query(
        `SELECT * FROM payments WHERE bill_id = $1 AND user_id = $2 AND transaction_id = $3`,
        [billId, userId, transactionId]
      );
      if (existingByTxn.rows.length > 0) {
        logger.info(`[${requestId}] 确认支付成功: 重复请求（已确认）`, {
          requestId,
          userId,
          billId,
          transactionId,
          existingPaymentId: existingByTxn.rows[0].id
        });
        
        return res.success(200, '重复请求（已确认）', { payment: existingByTxn.rows[0] });
      }
      if (idempotencyKey) {
        const idemCheck = await client.query(
          `SELECT * FROM payments WHERE bill_id = $1 AND user_id = $2 AND idempotency_key = $3`,
          [billId, userId, idempotencyKey]
        ).catch(() => ({ rows: [] }));
        if (idemCheck.rows.length > 0) {
          logger.info(`[${requestId}] 确认支付成功: 重复请求（幂等性键）`, {
            requestId,
            userId,
            billId,
            idempotencyKey,
            existingPaymentId: idemCheck.rows[0].id
          });
          
          return res.success(200, '重复请求（幂等性键）', { payment: idemCheck.rows[0] });
        }
      }

      await client.query('BEGIN');

      // 创建支付记录（状态机：pending -> confirmed）
      const now = new Date();
      const paymentResult = await client.query(
        `INSERT INTO payments (bill_id, user_id, amount, payment_method, transaction_id, payment_time, status, created_at${idempotencyKey ? ', idempotency_key' : ''}, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW()${idempotencyKey ? ', $7' : ''}, $${idempotencyKey ? 8 : 7})
         RETURNING *`,
        idempotencyKey
          ? [billId, userId, amount, paymentMethod, transactionId, paymentTime || now, idempotencyKey, notes || null]
          : [billId, userId, amount, paymentMethod, transactionId, paymentTime || now, notes || null]
      );

      // 业务上立即确认为 confirmed（当前无外部网关）
      const paymentId = paymentResult.rows[0].id;
      const confirmed = await client.query(
        `UPDATE payments SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1 RETURNING *`,
        [paymentId]
      );

      // 更新账单分摊状态
      await client.query(
        `UPDATE bill_splits SET status = 'PAID', paid_at = $1, updated_at = NOW() WHERE id = $2`,
        [paymentTime || now, userSplit.id]
      );

      // 若所有分摊均已支付，则更新账单状态为 COMPLETED
      const remainingSplits = await client.query(
        `SELECT COUNT(*) as count FROM bill_splits WHERE bill_id = $1 AND status != 'PAID'`,
        [billId]
      );
      if (parseInt(remainingSplits.rows[0].count) === 0) {
        await client.query(
          `UPDATE bills SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
          [billId]
        );
      }

      await client.query('COMMIT');
      
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 确认支付成功`, {
        requestId,
        userId,
        billId,
        paymentId,
        paymentMethod,
        transactionId,
        amount,
        billCompleted: parseInt(remainingSplits.rows[0].count) === 0,
        duration
      });

      res.success(200, '支付确认成功', { payment: confirmed.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 确认支付失败`, {
        requestId,
        userId: req.user.sub,
        billId: req.params.billId,
        paymentMethod: req.body.paymentMethod,
        transactionId: req.body.transactionId,
        amount: req.body.amount,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '确认支付失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取账单支付状态
   */
  getBillPaymentStatus = async (req, res) => {
    const startTime = Date.now();
    const requestId = `bill-status-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await this.pool.connect();
    
    try {
      const { billId } = req.params;
      const userId = req.user.sub;
      
      logger.info(`[${requestId}] 开始获取账单支付状态`, {
        requestId,
        userId,
        billId
      });

      // 检查账单是否存在
      const billCheck = await client.query(
        `SELECT b.*, r.name as room_name
         FROM bills b
         JOIN rooms r ON b.room_id = r.id
         WHERE b.id = $1`,
        [billId]
      );

      if (billCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 获取账单支付状态失败: 账单不存在`, {
          requestId,
          userId,
          billId
        });
        
        return res.error(404, '账单不存在');
      }

      const bill = billCheck.rows[0];

      // 检查用户是否有权限查看此账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM user_room_relations 
         WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [bill.room_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 获取账单支付状态失败: 用户无权限查看账单`, {
          requestId,
          userId,
          billId,
          roomId: bill.room_id
        });
        
        return res.error(403, '您没有权限查看此账单');
      }

      // 获取账单分摊信息
      const splitDetails = await client.query(
        `SELECT bs.*, u.username as user_name
         FROM bill_splits bs
         JOIN users u ON bs.user_id = u.id
         WHERE bs.bill_id = $1`,
        [billId]
      );

      // 获取支付记录
      const paymentRecords = await client.query(
        `SELECT p.*, u.username as user_name
         FROM payments p
         JOIN users u ON p.user_id = u.id
         WHERE p.bill_id = $1
         ORDER BY p.created_at DESC`,
        [billId]
      );

      // 构建支付状态信息
      const paidAmount = splitDetails.rows
        .filter(split => split.status === 'PAID')
        .reduce((sum, split) => PrecisionCalculator.add(sum, parseFloat(split.amount)), 0);
      
      const paymentStatus = {
        bill_id: bill.id,
        bill_title: bill.title,
        total_amount: bill.total_amount,
        status: bill.status,
        created_at: bill.created_at,
        due_date: bill.due_date,
        splits: splitDetails.rows,
        payments: paymentRecords.rows,
        paid_count: splitDetails.rows.filter(split => split.status === 'PAID').length,
        total_count: splitDetails.rows.length,
        paid_amount: paidAmount
      };
      
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取账单支付状态成功`, {
        requestId,
        userId,
        billId,
        billStatus: bill.status,
        paidCount: paymentStatus.paid_count,
        totalCount: paymentStatus.total_count,
        paidAmount: paymentStatus.paid_amount,
        duration
      });

      res.success(200, '获取账单支付状态成功', { payment_status: paymentStatus });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取账单支付状态失败`, {
        requestId,
        userId: req.user.sub,
        billId: req.params.billId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取账单支付状态失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取用户支付记录
   */
  getUserPayments = async (req, res) => {
    const startTime = Date.now();
    const requestId = `user-payments-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await this.pool.connect();
    
    try {
      const userId = req.user.sub;
      const { page = 1, limit = 20, status, billId } = req.query;
      
      const offset = (page - 1) * limit;
      
      logger.info(`[${requestId}] 开始获取用户支付记录`, {
        requestId,
        userId,
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        billId
      });

      // 构建查询条件
      let whereClause = 'WHERE p.user_id = $1';
      let queryParams = [userId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND p.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (billId) {
        whereClause += ` AND p.bill_id = $${paramIndex}`;
        queryParams.push(billId);
        paramIndex++;
      }

      // 获取支付记录
      const paymentsQuery = `
        SELECT p.*, b.title as bill_title, r.name as room_name
        FROM payments p
        JOIN bills b ON p.bill_id = b.id
        JOIN rooms r ON b.room_id = r.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      
      const paymentsResult = await client.query(paymentsQuery, queryParams);

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payments p
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取用户支付记录成功`, {
        requestId,
        userId,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        count: paymentsResult.rows.length,
        status,
        billId,
        duration
      });

      res.success(200, '获取用户支付记录成功', {
        payments: paymentsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取用户支付记录失败`, {
        requestId,
        userId: req.user.sub,
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        billId: req.query.billId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取用户支付记录失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取支付记录列表（管理员）
   */
  getPayments = async (req, res) => {
    const startTime = Date.now();
    const requestId = `admin-payments-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await this.pool.connect();
    
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        method, 
        user_id, 
        bill_id, 
        start_date, 
        end_date 
      } = req.query;
      
      const offset = (page - 1) * limit;
      
      logger.info(`[${requestId}] 开始获取支付记录列表`, {
        requestId,
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        method,
        user_id,
        bill_id,
        start_date,
        end_date
      });

      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      let queryParams = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` AND p.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (method) {
        whereClause += ` AND p.method = $${paramIndex}`;
        queryParams.push(method);
        paramIndex++;
      }

      if (user_id) {
        whereClause += ` AND p.user_id = $${paramIndex}`;
        queryParams.push(user_id);
        paramIndex++;
      }

      if (bill_id) {
        whereClause += ` AND p.bill_id = $${paramIndex}`;
        queryParams.push(bill_id);
        paramIndex++;
      }

      if (start_date) {
        whereClause += ` AND p.payment_date >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        whereClause += ` AND p.payment_date <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      // 获取支付记录
      const paymentsQuery = `
        SELECT p.*, 
               u.username as user_name,
               b.title as bill_title,
               r.name as room_name
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN bills b ON p.bill_id = b.id
        JOIN rooms r ON b.room_id = r.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      
      const paymentsResult = await client.query(paymentsQuery, queryParams);

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payments p
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取支付记录列表成功`, {
        requestId,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        count: paymentsResult.rows.length,
        status,
        method,
        user_id,
        bill_id,
        duration
      });

      res.success(200, '获取支付记录列表成功', {
        payments: paymentsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取支付记录列表失败`, {
        requestId,
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        method: req.query.method,
        user_id: req.query.user_id,
        bill_id: req.query.bill_id,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取支付记录列表失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取支付详情（管理员）
   */
  getPaymentById = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { id } = req.params;
      const result = await client.query(
        `SELECT p.*, 
                u.username as user_name,
                b.title as bill_title,
                r.name as room_name
         FROM payments p
         JOIN users u ON p.user_id = u.id
         JOIN bills b ON p.bill_id = b.id
         JOIN rooms r ON b.room_id = r.id
         WHERE p.id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.error(404, '支付记录不存在');
      }
      
      res.success(200, '获取支付详情成功', { payment: result.rows[0] });
    } catch (error) {
      logger.error('获取支付详情失败:', error);
      res.error(500, '获取支付详情失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 创建支付记录（管理员）
   */
  createPayment = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { user_id, bill_id, amount, method, payment_date, notes, receipt_url } = req.body;
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO payments (user_id, bill_id, amount, payment_method, payment_time, status, notes, receipt_url)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7)
         RETURNING *`,
        [user_id, bill_id, amount, method, payment_date, notes, receipt_url]
      );
      
      await client.query('COMMIT');
      res.success(201, '创建支付记录成功', { payment: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('创建支付记录失败:', error);
      res.error(500, '创建支付记录失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 更新支付记录（管理员）
   */
  updatePayment = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { id } = req.params;
      const { amount, method, payment_date, notes, receipt_url } = req.body;
      
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (amount !== undefined) {
        updates.push(`amount = $${paramIndex++}`);
        values.push(amount);
      }
      if (method !== undefined) {
        updates.push(`payment_method = $${paramIndex++}`);
        values.push(method);
      }
      if (payment_date !== undefined) {
        updates.push(`payment_time = $${paramIndex++}`);
        values.push(payment_date);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(notes);
      }
      if (receipt_url !== undefined) {
        updates.push(`receipt_url = $${paramIndex++}`);
        values.push(receipt_url);
      }
      
      if (updates.length === 0) {
        return res.error(400, '没有可更新的字段');
      }
      
      values.push(id);
      const result = await client.query(
        `UPDATE payments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return res.error(404, '支付记录不存在');
      }
      
      res.success(200, '更新支付记录成功', { payment: result.rows[0] });
    } catch (error) {
      logger.error('更新支付记录失败:', error);
      res.error(500, '更新支付记录失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 删除支付记录（管理员）
   */
  deletePayment = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { id } = req.params;
      
      await client.query('BEGIN');
      
      const result = await client.query('DELETE FROM payments WHERE id = $1 RETURNING *', [id]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.error(404, '支付记录不存在');
      }
      
      await client.query('COMMIT');
      res.success(200, '删除支付记录成功');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('删除支付记录失败:', error);
      res.error(500, '删除支付记录失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 取消支付（管理员）
   */
  cancelPayment = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body;
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `UPDATE payments SET status = 'cancelled', notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [cancellation_reason, id]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.error(404, '支付记录不存在');
      }
      
      await client.query('COMMIT');
      res.success(200, '取消支付成功', { payment: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('取消支付失败:', error);
      res.error(500, '取消支付失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取支付统计（管理员）
   */
  getPaymentStatistics = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { start_date, end_date, room_id, method } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (start_date) {
        whereClause += ` AND p.payment_time >= $${paramIndex++}`;
        params.push(start_date);
      }
      if (end_date) {
        whereClause += ` AND p.payment_time <= $${paramIndex++}`;
        params.push(end_date);
      }
      if (room_id) {
        whereClause += ` AND b.room_id = $${paramIndex++}`;
        params.push(room_id);
      }
      if (method) {
        whereClause += ` AND p.payment_method = $${paramIndex++}`;
        params.push(method);
      }
      
      const result = await client.query(
        `SELECT 
           COUNT(*) as total_count,
           SUM(amount) as total_amount,
           AVG(amount) as avg_amount,
           MIN(amount) as min_amount,
           MAX(amount) as max_amount
         FROM payments p
         JOIN bills b ON p.bill_id = b.id
         ${whereClause}`,
        params
      );
      
      res.success(200, '获取支付统计成功', { statistics: result.rows[0] });
    } catch (error) {
      logger.error('获取支付统计失败:', error);
      res.error(500, '获取支付统计失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取支付方式列表（管理员）
   */
  getPaymentMethods = async (req, res) => {
    try {
      const methods = [
        { value: 'cash', label: '现金' },
        { value: 'wechat', label: '微信支付' },
        { value: 'alipay', label: '支付宝' },
        { value: 'bank_transfer', label: '银行转账' },
        { value: 'credit_card', label: '信用卡' }
      ];
      res.success(200, '获取支付方式列表成功', { methods });
    } catch (error) {
      logger.error('获取支付方式列表失败:', error);
      res.error(500, '获取支付方式列表失败', error.message);
    }
  }

  /**
   * 导出支付记录（管理员）
   */
  exportPayments = async (req, res) => {
    res.error(501, '导出功能尚未实现');
  }

  /**
   * 批量创建支付记录（管理员）
   */
  createBatchPayments = async (req, res) => {
    res.error(501, '批量创建功能尚未实现');
  }

  /**
   * 获取支付对账单（管理员）
   */
  getPaymentReconciliation = async (req, res) => {
    res.error(501, '对账单功能尚未实现');
  }

  /**
   * 获取支付退款记录（管理员）
   */
  getPaymentRefunds = async (req, res) => {
    res.error(501, '退款记录功能尚未实现');
  }

  /**
   * 创建支付退款（管理员）
   */
  createPaymentRefund = async (req, res) => {
    res.error(501, '创建退款功能尚未实现');
  }
}

module.exports = new PaymentController();