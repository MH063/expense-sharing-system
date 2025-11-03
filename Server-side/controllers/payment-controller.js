const { Pool } = require('pg');
const winston = require('winston');

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
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  /**
   * 获取账单收款码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  getBillQrCode = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { billId } = req.params;
      const userId = req.user.id;
      const { qr_type } = req.query; // wechat 或 alipay

      // 验证收款码类型
      if (!qr_type || !['wechat', 'alipay'].includes(qr_type)) {
        return res.status(400).json({
          success: false,
          message: '收款码类型必须是wechat或alipay'
        });
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
        return res.status(404).json({
          success: false,
          message: '账单不存在'
        });
      }

      const bill = billCheck.rows[0];

      // 检查用户是否有权限查看此账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [bill.room_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看此账单'
        });
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
        return res.status(403).json({
          success: false,
          message: '您不在此账单的分摊中'
        });
      }

      // 检查用户是否已支付
      if (userSplit.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: '您已支付此账单'
        });
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
        return res.status(404).json({
          success: false,
          message: `收款人未设置默认的${qr_type === 'wechat' ? '微信' : '支付宝'}收款码`
        });
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

      res.status(200).json({
        success: true,
        data: {
          payment_info: paymentInfo
        }
      });
    } catch (error) {
      logger.error('获取账单收款码失败:', error);
      res.status(500).json({
        success: false,
        message: '获取账单收款码失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 确认支付
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  confirmPayment = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { billId } = req.params;
      const userId = req.user.id;
      const { payment_method, transaction_id, payment_time } = req.body;

      // 验证必填字段
      if (!payment_method || !transaction_id || !payment_time) {
        return res.status(400).json({
          success: false,
          message: '请提供完整的支付信息'
        });
      }

      // 验证支付方式
      if (!['wechat', 'alipay', 'cash', 'bank_transfer'].includes(payment_method)) {
        return res.status(400).json({
          success: false,
          message: '无效的支付方式'
        });
      }

      // 检查账单是否存在
      const billCheck = await client.query(
        `SELECT b.*, r.name as room_name
         FROM bills b
         JOIN rooms r ON b.room_id = r.id
         WHERE b.id = $1`,
        [billId]
      );

      if (billCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '账单不存在'
        });
      }

      const bill = billCheck.rows[0];

      // 检查用户是否有权限支付此账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [bill.room_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限支付此账单'
        });
      }

      // 获取用户的分摊信息
      const splitCheck = await client.query(
        `SELECT * FROM bill_splits 
         WHERE bill_id = $1 AND user_id = $2`,
        [billId, userId]
      );

      if (splitCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不在此账单的分摊中'
        });
      }

      const userSplit = splitCheck.rows[0];

      // 检查用户是否已支付
      if (userSplit.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: '您已支付此账单'
        });
      }

      await client.query('BEGIN');

      // 创建支付记录
      const paymentResult = await client.query(
        `INSERT INTO payments 
         (bill_id, user_id, amount, payment_method, transaction_id, payment_time, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'completed', NOW())
         RETURNING *`,
        [billId, userId, userSplit.amount, payment_method, transaction_id, payment_time]
      );

      // 更新账单分摊状态
      await client.query(
        `UPDATE bill_splits 
         SET status = 'paid', paid_at = $1, updated_at = NOW()
         WHERE id = $2`,
        [payment_time, userSplit.id]
      );

      // 检查是否所有用户都已支付
      const remainingSplits = await client.query(
        `SELECT COUNT(*) as count FROM bill_splits 
         WHERE bill_id = $1 AND status != 'paid'`,
        [billId]
      );

      // 如果所有用户都已支付，更新账单状态
      if (parseInt(remainingSplits.rows[0].count) === 0) {
        await client.query(
          `UPDATE bills 
           SET status = 'paid', updated_at = NOW()
           WHERE id = $1`,
          [billId]
        );
      }

      await client.query('COMMIT');

      logger.info(`用户 ${userId} 支付了账单 ${billId}，金额: ${userSplit.amount}`);

      res.status(200).json({
        success: true,
        data: {
          payment: paymentResult.rows[0],
          message: '支付确认成功'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('确认支付失败:', error);
      res.status(500).json({
        success: false,
        message: '确认支付失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取账单支付状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  getBillPaymentStatus = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const { billId } = req.params;
      const userId = req.user.id;

      // 检查账单是否存在
      const billCheck = await client.query(
        `SELECT b.*, r.name as room_name
         FROM bills b
         JOIN rooms r ON b.room_id = r.id
         WHERE b.id = $1`,
        [billId]
      );

      if (billCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '账单不存在'
        });
      }

      const bill = billCheck.rows[0];

      // 检查用户是否有权限查看此账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [bill.room_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看此账单'
        });
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
      const paymentStatus = {
        bill_id: bill.id,
        bill_title: bill.title,
        total_amount: bill.total_amount,
        status: bill.status,
        created_at: bill.created_at,
        due_date: bill.due_date,
        splits: splitDetails.rows,
        payments: paymentRecords.rows,
        paid_count: splitDetails.rows.filter(split => split.status === 'paid').length,
        total_count: splitDetails.rows.length,
        paid_amount: splitDetails.rows
          .filter(split => split.status === 'paid')
          .reduce((sum, split) => sum + parseFloat(split.amount), 0)
      };

      res.status(200).json({
        success: true,
        data: {
          payment_status: paymentStatus
        }
      });
    } catch (error) {
      logger.error('获取账单支付状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取账单支付状态失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取用户支付记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  getUserPayments = async (req, res) => {
    const client = await this.pool.connect();
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      let whereClause = 'WHERE p.user_id = $1';
      const queryParams = [userId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND p.status = $${paramIndex}`;
        queryParams.push(status);
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
      logger.error('获取用户支付记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户支付记录失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }
}

module.exports = new PaymentController();