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
    new winston.transports.File({ filename: 'logs/payment-rules-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/payment-rules-combined.log' })
  ]
});

/**
 * 特殊支付规则控制器
 * 处理特殊支付规则的创建、管理和应用
 */
class SpecialPaymentRulesController {
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
   * 获取房间的特殊支付规则列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoomPaymentRules(req, res) {
    const client = await this.pool.connect();
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      // 检查用户是否有权限查看房间规则
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看此房间的支付规则'
        });
      }

      // 获取房间的特殊支付规则
      const rulesResult = await client.query(
        `SELECT spr.*, u.username as creator_name
         FROM special_payment_rules spr
         JOIN users u ON spr.created_by = u.id
         WHERE spr.room_id = $1
         ORDER BY spr.priority ASC, spr.created_at DESC`,
        [roomId]
      );

      res.status(200).json({
        success: true,
        data: {
          rules: rulesResult.rows
        }
      });
    } catch (error) {
      logger.error('获取房间支付规则失败:', error);
      res.status(500).json({
        success: false,
        message: '获取房间支付规则失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 创建特殊支付规则
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createPaymentRule(req, res) {
    const client = await this.pool.connect();
    try {
      const { roomId } = req.params;
      const userId = req.user.id;
      const { name, description, rule_type, conditions, priority = 0 } = req.body;

      // 验证必填字段
      if (!name || !rule_type || !conditions) {
        return res.status(400).json({
          success: false,
          message: '请提供完整的规则信息'
        });
      }

      // 验证规则类型
      if (!['self_only', 'multiple_payers', 'payer_to_payer'].includes(rule_type)) {
        return res.status(400).json({
          success: false,
          message: '无效的规则类型'
        });
      }

      // 检查用户是否有权限创建房间规则
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2 AND relation_type IN ('owner', 'admin')`,
        [roomId, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限创建此房间的支付规则'
        });
      }

      // 创建特殊支付规则
      const ruleResult = await client.query(
        `INSERT INTO special_payment_rules 
         (room_id, name, description, rule_type, conditions, priority, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [roomId, name, description, rule_type, JSON.stringify(conditions), priority, userId]
      );

      logger.info(`用户 ${userId} 创建了支付规则 ${ruleResult.rows[0].id}`);

      res.status(201).json({
        success: true,
        data: {
          rule: ruleResult.rows[0]
        },
        message: '支付规则创建成功'
      });
    } catch (error) {
      logger.error('创建支付规则失败:', error);
      res.status(500).json({
        success: false,
        message: '创建支付规则失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 更新特殊支付规则
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePaymentRule(req, res) {
    const client = await this.pool.connect();
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;
      const { name, description, conditions, priority, is_active } = req.body;

      // 检查规则是否存在
      const ruleCheck = await client.query(
        `SELECT spr.*, rm.relation_type
         FROM special_payment_rules spr
         JOIN rooms r ON spr.room_id = r.id
         JOIN room_members rm ON r.id = rm.room_id
         WHERE spr.id = $1 AND rm.user_id = $2`,
        [ruleId, userId]
      );

      if (ruleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '支付规则不存在或您没有权限访问'
        });
      }

      const rule = ruleCheck.rows[0];
      const userRelationType = rule.relation_type;

      // 检查用户是否有权限更新规则（只有房间管理员或创建者可以更新）
      if (userRelationType !== 'owner' && userRelationType !== 'admin' && rule.created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: '您没有权限更新此支付规则'
        });
      }

      // 构建更新查询
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }

      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }

      if (conditions !== undefined) {
        updateFields.push(`conditions = $${paramIndex++}`);
        updateValues.push(JSON.stringify(conditions));
      }

      if (priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        updateValues.push(priority);
      }

      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有提供要更新的字段'
        });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(ruleId);

      // 更新规则
      const updateQuery = `
        UPDATE special_payment_rules 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, updateValues);

      logger.info(`用户 ${userId} 更新了支付规则 ${ruleId}`);

      res.status(200).json({
        success: true,
        data: {
          rule: updateResult.rows[0]
        },
        message: '支付规则更新成功'
      });
    } catch (error) {
      logger.error('更新支付规则失败:', error);
      res.status(500).json({
        success: false,
        message: '更新支付规则失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 删除特殊支付规则
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deletePaymentRule(req, res) {
    const client = await this.pool.connect();
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;

      // 检查规则是否存在
      const ruleCheck = await client.query(
        `SELECT spr.*, rm.relation_type
         FROM special_payment_rules spr
         JOIN rooms r ON spr.room_id = r.id
         JOIN room_members rm ON r.id = rm.room_id
         WHERE spr.id = $1 AND rm.user_id = $2`,
        [ruleId, userId]
      );

      if (ruleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '支付规则不存在或您没有权限访问'
        });
      }

      const rule = ruleCheck.rows[0];
      const userRelationType = rule.relation_type;

      // 检查用户是否有权限删除规则（只有房间管理员或创建者可以删除）
      if (userRelationType !== 'owner' && userRelationType !== 'admin' && rule.created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: '您没有权限删除此支付规则'
        });
      }

      // 删除规则
      await client.query('DELETE FROM special_payment_rules WHERE id = $1', [ruleId]);

      logger.info(`用户 ${userId} 删除了支付规则 ${ruleId}`);

      res.status(200).json({
        success: true,
        message: '支付规则删除成功'
      });
    } catch (error) {
      logger.error('删除支付规则失败:', error);
      res.status(500).json({
        success: false,
        message: '删除支付规则失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取适用于账单的特殊支付规则
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getApplicableRules(req, res) {
    const client = await this.pool.connect();
    try {
      const { billId } = req.params;
      const userId = req.user.id;

      // 检查账单是否存在
      const billCheck = await client.query(
        `SELECT b.*, r.id as room_id
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
      const roomId = bill.room_id;

      // 检查用户是否有权限查看账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看此账单'
        });
      }

      // 获取账单关联的费用类型
      const expenseTypesResult = await client.query(
        `SELECT DISTINCT et.name
         FROM expenses e
         JOIN expense_types et ON e.expense_type_id = et.id
         JOIN bill_expenses be ON e.id = be.expense_id
         WHERE be.bill_id = $1`,
        [billId]
      );

      const expenseTypes = expenseTypesResult.rows.map(row => row.name);

      // 获取适用的支付规则
      const rulesResult = await client.query(
        `SELECT * FROM special_payment_rules 
         WHERE room_id = $1 AND is_active = TRUE
         ORDER BY priority ASC`,
        [roomId]
      );

      // 筛选适用的规则
      const applicableRules = rulesResult.rows.filter(rule => {
        const conditions = rule.conditions;
        
        // 检查费用类型条件
        if (conditions.expense_types && conditions.expense_types.length > 0) {
          const hasMatchingExpenseType = conditions.expense_types.some(type => 
            expenseTypes.includes(type)
          );
          if (!hasMatchingExpenseType) {
            return false;
          }
        }
        
        // 检查金额条件
        if (conditions.min_amount && bill.total_amount < parseFloat(conditions.min_amount)) {
          return false;
        }
        
        if (conditions.max_amount && bill.total_amount > parseFloat(conditions.max_amount)) {
          return false;
        }
        
        return true;
      });

      res.status(200).json({
        success: true,
        data: {
          bill_id: billId,
          applicable_rules: applicableRules
        }
      });
    } catch (error) {
      logger.error('获取适用支付规则失败:', error);
      res.status(500).json({
        success: false,
        message: '获取适用支付规则失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 应用特殊支付规则到账单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async applyPaymentRule(req, res) {
    const client = await this.pool.connect();
    try {
      const { billId, ruleId } = req.params;
      const userId = req.user.id;
      const { application_details } = req.body;

      // 检查账单是否存在
      const billCheck = await client.query(
        `SELECT b.*, r.id as room_id
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
      const roomId = bill.room_id;

      // 检查用户是否有权限操作账单
      const permissionCheck = await client.query(
        `SELECT rm.relation_type
         FROM room_members rm
         WHERE rm.room_id = $1 AND rm.user_id = $2`,
        [roomId, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限操作此账单'
        });
      }

      const userRelationType = permissionCheck.rows[0].relation_type;

      // 只有房间管理员或账单创建者可以应用规则
      if (userRelationType !== 'owner' && userRelationType !== 'admin' && bill.created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: '您没有权限应用支付规则到此账单'
        });
      }

      // 检查规则是否存在
      const ruleCheck = await client.query(
        `SELECT * FROM special_payment_rules 
         WHERE id = $1 AND room_id = $2`,
        [ruleId, roomId]
      );

      if (ruleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '支付规则不存在或不适用于此房间'
        });
      }

      const rule = ruleCheck.rows[0];

      await client.query('BEGIN');

      // 记录规则应用
      const applicationResult = await client.query(
        `INSERT INTO payment_rule_applications 
         (bill_id, rule_id, applied_by, application_details)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [billId, ruleId, userId, JSON.stringify(application_details || {})]
      );

      // 根据规则类型执行相应操作
      if (rule.rule_type === 'self_only') {
        // 仅缴费人本人支付规则：确保账单分摊只包含缴费人本人
        await this._applySelfOnlyRule(client, billId, rule);
      } else if (rule.rule_type === 'multiple_payers') {
        // 多人支付规则：允许多人共同支付
        await this._applyMultiplePayersRule(client, billId, rule, application_details);
      } else if (rule.rule_type === 'payer_to_payer') {
        // 缴费人之间支付规则：允许缴费人之间互相代付
        await this._applyPayerToPayerRule(client, billId, rule, application_details);
      }

      await client.query('COMMIT');

      logger.info(`用户 ${userId} 将支付规则 ${ruleId} 应用到账单 ${billId}`);

      res.status(200).json({
        success: true,
        data: {
          application: applicationResult.rows[0],
          rule: rule
        },
        message: '支付规则应用成功'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('应用支付规则失败:', error);
      res.status(500).json({
        success: false,
        message: '应用支付规则失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 应用仅缴费人本人支付规则
   * @private
   */
  async _applySelfOnlyRule(client, billId, rule) {
    // 这个规则主要在前端支付时进行验证，后端不需要特殊处理
    // 只需要记录规则应用即可
    return true;
  }

  /**
   * 应用多人支付规则
   * @private
   */
  async _applyMultiplePayersRule(client, billId, rule, applicationDetails) {
    // 更新账单状态，标记为允许多人支付
    await client.query(
      `UPDATE bills 
       SET updated_at = NOW()
       WHERE id = $1`,
      [billId]
    );

    // 这个规则主要在前端支付时进行验证，后端只需要记录规则应用
    return true;
  }

  /**
   * 应用缴费人之间支付规则
   * @private
   */
  async _applyPayerToPayerRule(client, billId, rule, applicationDetails) {
    // 更新账单状态，标记为允许缴费人之间支付
    await client.query(
      `UPDATE bills 
       SET updated_at = NOW()
       WHERE id = $1`,
      [billId]
    );

    // 这个规则主要在前端支付时进行验证，后端只需要记录规则应用
    return true;
  }

  /**
   * 创建支付转移记录（缴费人之间支付）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createPaymentTransfer(req, res) {
    const client = await this.pool.connect();
    try {
      const { billId } = req.params;
      const userId = req.user.id;
      const { to_user_id, amount, payment_method, transaction_id, notes } = req.body;

      // 验证必填字段
      if (!to_user_id || !amount || !payment_method) {
        return res.status(400).json({
          success: false,
          message: '请提供完整的支付转移信息'
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
        `SELECT b.*, r.id as room_id
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
      const roomId = bill.room_id;

      // 检查用户是否有权限操作账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限操作此账单'
        });
      }

      // 检查目标用户是否在房间中
      const targetUserCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, to_user_id]
      );

      if (targetUserCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '目标用户不在房间中'
        });
      }

      // 检查是否有适用的缴费人之间支付规则
      const ruleCheck = await client.query(
        `SELECT 1 FROM payment_rule_applications pra
         JOIN special_payment_rules spr ON pra.rule_id = spr.id
         WHERE pra.bill_id = $1 AND spr.rule_type = 'payer_to_payer' AND spr.is_active = TRUE`,
        [billId]
      );

      if (ruleCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '此账单不允许缴费人之间支付'
        });
      }

      await client.query('BEGIN');

      // 创建支付转移记录
      const transferResult = await client.query(
        `INSERT INTO payment_transfers 
         (bill_id, from_user_id, to_user_id, amount, payment_method, transaction_id, notes, transfer_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [billId, userId, to_user_id, amount, payment_method, transaction_id, notes]
      );

      // 更新账单分摊状态
      await client.query(
        `UPDATE bill_splits 
         SET status = 'paid', paid_at = NOW(), updated_at = NOW()
         WHERE bill_id = $1 AND user_id = $2`,
        [billId, to_user_id]
      );

      // 创建支付记录
      await client.query(
        `INSERT INTO payments 
         (bill_id, user_id, payer_id, amount, payment_method, transaction_id, payment_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'completed')`,
        [billId, to_user_id, userId, amount, payment_method, transaction_id]
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

      logger.info(`用户 ${userId} 为账单 ${billId} 的用户 ${to_user_id} 支付了金额 ${amount}`);

      res.status(201).json({
        success: true,
        data: {
          transfer: transferResult.rows[0]
        },
        message: '支付转移记录创建成功'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('创建支付转移记录失败:', error);
      res.status(500).json({
        success: false,
        message: '创建支付转移记录失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取账单的支付转移记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getBillPaymentTransfers(req, res) {
    const client = await this.pool.connect();
    try {
      const { billId } = req.params;
      const userId = req.user.id;

      // 检查账单是否存在
      const billCheck = await client.query(
        `SELECT b.*, r.id as room_id
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
      const roomId = bill.room_id;

      // 检查用户是否有权限查看账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看此账单'
        });
      }

      // 获取支付转移记录
      const transfersResult = await client.query(
        `SELECT pt.*, 
                fu.username as from_user_name, 
                tu.username as to_user_name
         FROM payment_transfers pt
         JOIN users fu ON pt.from_user_id = fu.id
         JOIN users tu ON pt.to_user_id = tu.id
         WHERE pt.bill_id = $1
         ORDER BY pt.transfer_time DESC`,
        [billId]
      );

      res.status(200).json({
        success: true,
        data: {
          bill_id: billId,
          transfers: transfersResult.rows
        }
      });
    } catch (error) {
      logger.error('获取账单支付转移记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取账单支付转移记录失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }
}

module.exports = new SpecialPaymentRulesController();