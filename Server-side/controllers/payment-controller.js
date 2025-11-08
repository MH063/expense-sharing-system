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
        
        return res.status(400).json({ success: false, message: '收款码类型必须是wechat或alipay' });
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
        
        return res.status(404).json({ success: false, message: '账单不存在' });
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
        
        return res.status(403).json({ success: false, message: '您没有权限查看此账单' });
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
        
        return res.status(403).json({ success: false, message: '您不在此账单的分摊中' });
      }

      // 检查用户是否已支付
      if (userSplit.status === 'PAID') {
        logger.warn(`[${requestId}] 获取账单收款码失败: 用户已支付`, {
          requestId,
          userId,
          billId
        });
        
        return res.status(400).json({ success: false, message: '您已支付此账单' });
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
        
        return res.status(404).json({ success: false, message: `收款人未设置默认的${qr_type === 'wechat' ? '微信' : '支付宝'}收款码` });
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

      res.status(200).json({ success: true, data: { payment_info: paymentInfo } });
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
      
      res.status(500).json({ success: false, message: '获取账单收款码失败', error: error.message });
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
        
        return res.status(400).json({ success: false, message: '请提供完整的支付信息' });
      }
      
      // 验证支付方式
      if (!['wechat', 'alipay', 'cash', 'bank_transfer'].includes(paymentMethod)) {
        logger.warn(`[${requestId}] 确认支付失败: 无效的支付方式`, {
          requestId,
          userId,
          billId,
          paymentMethod
        });
        
        return res.status(400).json({ success: false, message: '无效的支付方式' });
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
        
        return res.status(404).json({ success: false, message: '账单不存在' });
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
        
        return res.status(403).json({ success: false, message: '您没有权限支付此账单' });
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
        
        return res.status(403).json({ success: false, message: '您不在此账单的分摊中' });
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
        
        return res.status(200).json({ success: true, data: { payment: existingByTxn.rows[0], message: '重复请求（已确认）' } });
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
          
          return res.status(200).json({ success: true, data: { payment: idemCheck.rows[0], message: '重复请求（已确认）' } });
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

      res.status(200).json({ success: true, data: { payment: confirmed.rows[0], message: '支付确认成功' } });
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
      
      res.status(500).json({ success: false, message: '确认支付失败', error: error.message });
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
        
        return res.status(404).json({ success: false, message: '账单不存在' });
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
        
        return res.status(403).json({ success: false, message: '您没有权限查看此账单' });
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

      res.status(200).json({ success: true, data: { payment_status: paymentStatus } });
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
      
      res.status(500).json({ success: false, message: '获取账单支付状态失败', error: error.message });
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

      res.status(200).json({
        success: true,
        data: {
          payments: paymentsResult.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
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
      
      res.status(500).json({ success: false, message: '获取用户支付记录失败', error: error.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new PaymentController();