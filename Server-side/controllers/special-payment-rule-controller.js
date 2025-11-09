const { SpecialPaymentRule, Room, User, Bill, Payment } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

/**
 * 获取特殊支付规则列表
 */
const getSpecialPaymentRules = async (req, res) => {
  try {
    console.log('获取特殊支付规则列表，参数:', req.query);
    
    const {
      page = 1,
      limit = 20,
      roomId,
      type,
      isActive,
      search
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};
    
    // 房间筛选
    if (roomId) {
      whereClause.roomId = roomId;
    }
    
    // 类型筛选
    if (type) {
      whereClause.type = type;
    }
    
    // 状态筛选
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }
    
    // 搜索条件
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows: rules } = await SpecialPaymentRule.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        rules,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取特殊支付规则列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取特殊支付规则列表失败',
      error: error.message
    });
  }
};

/**
 * 获取特殊支付规则详情
 */
const getSpecialPaymentRuleById = async (req, res) => {
  try {
    console.log('获取特殊支付规则详情，ID:', req.params.id);
    
    const { id } = req.params;
    
    const rule = await SpecialPaymentRule.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        }
      ]
    });
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: '特殊支付规则不存在'
      });
    }
    
    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('获取特殊支付规则详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取特殊支付规则详情失败',
      error: error.message
    });
  }
};

/**
 * 创建特殊支付规则
 */
const createSpecialPaymentRule = async (req, res) => {
  try {
    console.log('创建特殊支付规则，数据:', req.body);
    
    const {
      name,
      description,
      roomId,
      type,
      amount,
      amountType,
      applicableBillTypes,
      applicableUsers,
      conditions,
      startDate,
      endDate,
      isActive = true
    } = req.body;
    
    // 验证房间是否存在
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(400).json({
        success: false,
        message: '房间不存在'
      });
    }
    
    // 验证适用用户是否存在（如果提供）
    if (applicableUsers && applicableUsers.length > 0) {
      const users = await User.findAll({
        where: { id: { [Op.in]: applicableUsers } }
      });
      
      if (users.length !== applicableUsers.length) {
        return res.status(400).json({
          success: false,
          message: '部分适用用户不存在'
        });
      }
    }
    
    // 创建特殊支付规则
    const rule = await SpecialPaymentRule.create({
      id: uuidv4(),
      name,
      description,
      roomId,
      type,
      amount,
      amountType,
      applicableBillTypes,
      applicableUsers,
      conditions,
      startDate,
      endDate,
      isActive
    });
    
    // 获取创建后的规则详情
    const createdRule = await SpecialPaymentRule.findByPk(rule.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: createdRule,
      message: '特殊支付规则创建成功'
    });
  } catch (error) {
    console.error('创建特殊支付规则失败:', error);
    res.status(500).json({
      success: false,
      message: '创建特殊支付规则失败',
      error: error.message
    });
  }
};

/**
 * 更新特殊支付规则
 */
const updateSpecialPaymentRule = async (req, res) => {
  try {
    console.log('更新特殊支付规则，ID:', req.params.id, '数据:', req.body);
    
    const { id } = req.params;
    const updateData = req.body;
    
    // 检查规则是否存在
    const rule = await SpecialPaymentRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: '特殊支付规则不存在'
      });
    }
    
    // 如果更新了房间ID，验证房间是否存在
    if (updateData.roomId && updateData.roomId !== rule.roomId) {
      const room = await Room.findByPk(updateData.roomId);
      if (!room) {
        return res.status(400).json({
          success: false,
          message: '房间不存在'
        });
      }
    }
    
    // 如果更新了适用用户，验证用户是否存在
    if (updateData.applicableUsers && updateData.applicableUsers.length > 0) {
      const users = await User.findAll({
        where: { id: { [Op.in]: updateData.applicableUsers } }
      });
      
      if (users.length !== updateData.applicableUsers.length) {
        return res.status(400).json({
          success: false,
          message: '部分适用用户不存在'
        });
      }
    }
    
    // 更新规则
    await rule.update(updateData);
    
    // 获取更新后的规则详情
    const updatedRule = await SpecialPaymentRule.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        }
      ]
    });
    
    res.json({
      success: true,
      data: updatedRule,
      message: '特殊支付规则更新成功'
    });
  } catch (error) {
    console.error('更新特殊支付规则失败:', error);
    res.status(500).json({
      success: false,
      message: '更新特殊支付规则失败',
      error: error.message
    });
  }
};

/**
 * 删除特殊支付规则
 */
const deleteSpecialPaymentRule = async (req, res) => {
  try {
    console.log('删除特殊支付规则，ID:', req.params.id);
    
    const { id } = req.params;
    
    // 检查规则是否存在
    const rule = await SpecialPaymentRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: '特殊支付规则不存在'
      });
    }
    
    // 检查规则是否已被使用
    const paymentCount = await Payment.count({
      where: { specialPaymentRuleId: id }
    });
    
    if (paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该规则已被使用，无法删除'
      });
    }
    
    // 删除规则
    await rule.destroy();
    
    res.json({
      success: true,
      message: '特殊支付规则删除成功'
    });
  } catch (error) {
    console.error('删除特殊支付规则失败:', error);
    res.status(500).json({
      success: false,
      message: '删除特殊支付规则失败',
      error: error.message
    });
  }
};

/**
 * 激活/停用特殊支付规则
 */
const toggleSpecialPaymentRuleStatus = async (req, res) => {
  try {
    console.log('切换特殊支付规则状态，ID:', req.params.id, '状态:', req.body.isActive);
    
    const { id } = req.params;
    const { isActive } = req.body;
    
    // 检查规则是否存在
    const rule = await SpecialPaymentRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: '特殊支付规则不存在'
      });
    }
    
    // 更新状态
    await rule.update({ isActive });
    
    res.json({
      success: true,
      data: { id, isActive },
      message: `特殊支付规则已${isActive ? '激活' : '停用'}`
    });
  } catch (error) {
    console.error('切换特殊支付规则状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换特殊支付规则状态失败',
      error: error.message
    });
  }
};

/**
 * 获取房间的特殊支付规则
 */
const getRoomSpecialPaymentRules = async (req, res) => {
  try {
    console.log('获取房间的特殊支付规则，房间ID:', req.params.roomId);
    
    const { roomId } = req.params;
    
    // 检查房间是否存在
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在'
      });
    }
    
    // 获取房间的所有激活的特殊支付规则
    const rules = await SpecialPaymentRule.findAll({
      where: {
        roomId,
        isActive: true,
        [Op.or]: [
          { endDate: { [Op.is]: null } },
          { endDate: { [Op.gte]: new Date() } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('获取房间特殊支付规则失败:', error);
    res.status(500).json({
      success: false,
      message: '获取房间特殊支付规则失败',
      error: error.message
    });
  }
};

/**
 * 计算应用特殊支付规则后的金额
 */
const calculatePaymentWithRules = async (req, res) => {
  try {
    console.log('计算应用特殊支付规则后的金额，参数:', req.body);
    
    const {
      roomId,
      billType,
      originalAmount,
      userId,
      billDate = new Date()
    } = req.body;
    
    // 检查房间是否存在
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(400).json({
        success: false,
        message: '房间不存在'
      });
    }
    
    // 获取适用的特殊支付规则
    const applicableRules = await SpecialPaymentRule.findAll({
      where: {
        roomId,
        isActive: true,
        applicableBillTypes: { [Op.contains]: [billType] },
        startDate: { [Op.lte]: billDate },
        [Op.or]: [
          { endDate: { [Op.is]: null } },
          { endDate: { [Op.gte]: billDate } }
        ],
        [Op.or]: [
          { applicableUsers: { [Op.is]: null } },
          { applicableUsers: { [Op.contains]: [userId] } }
        ]
      }
    });
    
    let finalAmount = originalAmount;
    const appliedRules = [];
    
    // 应用每个规则
    for (const rule of applicableRules) {
      let adjustedAmount = finalAmount;
      
      if (rule.amountType === 'fixed') {
        if (rule.type === 'discount') {
          adjustedAmount = Math.max(0, finalAmount - rule.amount);
        } else if (rule.type === 'surcharge') {
          adjustedAmount = finalAmount + rule.amount;
        } else if (rule.type === 'exemption') {
          adjustedAmount = 0;
        }
      } else if (rule.amountType === 'percentage') {
        if (rule.type === 'discount') {
          adjustedAmount = finalAmount * (1 - rule.amount / 100);
        } else if (rule.type === 'surcharge') {
          adjustedAmount = finalAmount * (1 + rule.amount / 100);
        } else if (rule.type === 'exemption') {
          adjustedAmount = 0;
        }
      }
      
      // 检查规则条件（如果有）
      let isConditionMet = true;
      if (rule.conditions) {
        // 这里可以根据实际条件进行验证
        // 例如：最低金额限制、特定时间段等
        if (rule.conditions.minAmount && originalAmount < rule.conditions.minAmount) {
          isConditionMet = false;
        }
      }
      
      if (isConditionMet) {
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.type,
          amountType: rule.amountType,
          amount: rule.amount,
          originalAmount: finalAmount,
          adjustedAmount
        });
        
        finalAmount = adjustedAmount;
      }
    }
    
    res.json({
      success: true,
      data: {
        originalAmount,
        finalAmount,
        totalDiscount: originalAmount - finalAmount,
        appliedRules
      }
    });
  } catch (error) {
    console.error('计算应用特殊支付规则后的金额失败:', error);
    res.status(500).json({
      success: false,
      message: '计算应用特殊支付规则后的金额失败',
      error: error.message
    });
  }
};

/**
 * 获取特殊支付规则使用统计
 */
const getSpecialPaymentRuleStats = async (req, res) => {
  try {
    console.log('获取特殊支付规则使用统计，ID:', req.params.id, '参数:', req.query);
    
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    // 检查规则是否存在
    const rule = await SpecialPaymentRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: '特殊支付规则不存在'
      });
    }
    
    // 构建查询条件
    const whereClause = { specialPaymentRuleId: id };
    
    if (startDate) {
      whereClause.createdAt = { [Op.gte]: new Date(startDate) };
    }
    
    if (endDate) {
      whereClause.createdAt = { 
        ...whereClause.createdAt,
        [Op.lte]: new Date(endDate) 
      };
    }
    
    // 获取使用该规则的支付记录
    const payments = await Payment.findAll({
      where: whereClause,
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'type', 'amount', 'description']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    // 计算统计数据
    const totalUsage = payments.length;
    const totalDiscountAmount = payments.reduce((sum, payment) => {
      return sum + (payment.originalAmount - payment.amount);
    }, 0);
    
    const stats = {
      ruleId: id,
      ruleName: rule.name,
      totalUsage,
      totalDiscountAmount,
      averageDiscountAmount: totalUsage > 0 ? totalDiscountAmount / totalUsage : 0,
      payments
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取特殊支付规则使用统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取特殊支付规则使用统计失败',
      error: error.message
    });
  }
};

/**
 * 复制特殊支付规则
 */
const copySpecialPaymentRule = async (req, res) => {
  try {
    console.log('复制特殊支付规则，ID:', req.params.id, '数据:', req.body);
    
    const { id } = req.params;
    const { name, roomId } = req.body;
    
    // 检查原规则是否存在
    const originalRule = await SpecialPaymentRule.findByPk(id);
    if (!originalRule) {
      return res.status(404).json({
        success: false,
        message: '特殊支付规则不存在'
      });
    }
    
    // 如果提供了新房间ID，验证房间是否存在
    if (roomId && roomId !== originalRule.roomId) {
      const room = await Room.findByPk(roomId);
      if (!room) {
        return res.status(400).json({
          success: false,
          message: '房间不存在'
        });
      }
    }
    
    // 创建新规则
    const newRule = await SpecialPaymentRule.create({
      id: uuidv4(),
      name,
      description: originalRule.description,
      roomId: roomId || originalRule.roomId,
      type: originalRule.type,
      amount: originalRule.amount,
      amountType: originalRule.amountType,
      applicableBillTypes: originalRule.applicableBillTypes,
      applicableUsers: originalRule.applicableUsers,
      conditions: originalRule.conditions,
      startDate: originalRule.startDate,
      endDate: originalRule.endDate,
      isActive: false // 复制的规则默认为未激活状态
    });
    
    // 获取创建后的规则详情
    const createdRule = await SpecialPaymentRule.findByPk(newRule.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: createdRule,
      message: '特殊支付规则复制成功'
    });
  } catch (error) {
    console.error('复制特殊支付规则失败:', error);
    res.status(500).json({
      success: false,
      message: '复制特殊支付规则失败',
      error: error.message
    });
  }
};

module.exports = {
  getSpecialPaymentRules,
  getSpecialPaymentRuleById,
  createSpecialPaymentRule,
  updateSpecialPaymentRule,
  deleteSpecialPaymentRule,
  toggleSpecialPaymentRuleStatus,
  getRoomSpecialPaymentRules,
  calculatePaymentWithRules,
  getSpecialPaymentRuleStats,
  copySpecialPaymentRule
};