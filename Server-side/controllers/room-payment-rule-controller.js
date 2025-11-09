const { RoomPaymentRule, Room, User, Bill, Payment } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * 获取所有房间支付规则
 */
const getAllRoomPaymentRules = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, roomId, search } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereCondition = {};
    
    if (status) {
      whereCondition.status = status;
    }
    
    if (roomId) {
      whereCondition.roomId = roomId;
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await RoomPaymentRule.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      data: {
        roomPaymentRules: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取房间支付规则失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取房间支付规则失败',
      error: error.message
    });
  }
};

/**
 * 根据ID获取房间支付规则
 */
const getRoomPaymentRuleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const roomPaymentRule = await RoomPaymentRule.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    if (!roomPaymentRule) {
      return res.status(404).json({
        success: false,
        message: '房间支付规则不存在'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: { roomPaymentRule }
    });
  } catch (error) {
    logger.error('获取房间支付规则详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取房间支付规则详情失败',
      error: error.message
    });
  }
};

/**
 * 根据房间ID获取支付规则
 */
const getRoomPaymentRulesByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status = 'active' } = req.query;
    
    // 验证房间是否存在
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在'
      });
    }
    
    const roomPaymentRules = await RoomPaymentRule.findAll({
      where: {
        roomId,
        status
      },
      include: [
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      order: [['priority', 'ASC'], ['createdAt', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      data: { roomPaymentRules }
    });
  } catch (error) {
    logger.error('获取房间支付规则失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取房间支付规则失败',
      error: error.message
    });
  }
};

/**
 * 创建房间支付规则
 */
const createRoomPaymentRule = async (req, res) => {
  try {
    const {
      roomId,
      name,
      description,
      ruleType,
      paymentMethod,
      amountType,
      fixedAmount,
      percentage,
      maxAmount,
      minAmount,
      applicableBillTypes,
      applicableUsers,
      applicableTimeRange,
      priority = 1,
      status = 'active'
    } = req.body;
    
    // 验证房间是否存在
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在'
      });
    }
    
    // 验证必填字段
    if (!roomId || !name || !ruleType || !paymentMethod || !amountType) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }
    
    // 验证金额类型和金额字段
    if (amountType === 'fixed' && !fixedAmount) {
      return res.status(400).json({
        success: false,
        message: '固定金额类型必须提供固定金额'
      });
    }
    
    if (amountType === 'percentage' && (!percentage || percentage <= 0 || percentage > 100)) {
      return res.status(400).json({
        success: false,
        message: '百分比类型必须提供有效百分比(0-100)'
      });
    }
    
    // 创建房间支付规则
    const newRoomPaymentRule = await RoomPaymentRule.create({
      roomId,
      name,
      description,
      ruleType,
      paymentMethod,
      amountType,
      fixedAmount: amountType === 'fixed' ? fixedAmount : null,
      percentage: amountType === 'percentage' ? percentage : null,
      maxAmount,
      minAmount,
      applicableBillTypes,
      applicableUsers,
      applicableTimeRange,
      priority,
      status,
      createdBy: req.user.id
    });
    
    // 获取创建后的完整数据
    const createdRule = await RoomPaymentRule.findByPk(newRoomPaymentRule.id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    return res.status(201).json({
      success: true,
      message: '房间支付规则创建成功',
      data: { roomPaymentRule: createdRule }
    });
  } catch (error) {
    logger.error('创建房间支付规则失败:', error);
    return res.status(500).json({
      success: false,
      message: '创建房间支付规则失败',
      error: error.message
    });
  }
};

/**
 * 更新房间支付规则
 */
const updateRoomPaymentRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 验证房间支付规则是否存在
    const roomPaymentRule = await RoomPaymentRule.findByPk(id);
    if (!roomPaymentRule) {
      return res.status(404).json({
        success: false,
        message: '房间支付规则不存在'
      });
    }
    
    // 如果更新了roomId，验证房间是否存在
    if (updateData.roomId && updateData.roomId !== roomPaymentRule.roomId) {
      const room = await Room.findByPk(updateData.roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: '房间不存在'
        });
      }
    }
    
    // 验证金额类型和金额字段
    if (updateData.amountType === 'fixed' && !updateData.fixedAmount) {
      return res.status(400).json({
        success: false,
        message: '固定金额类型必须提供固定金额'
      });
    }
    
    if (updateData.amountType === 'percentage' && (!updateData.percentage || updateData.percentage <= 0 || updateData.percentage > 100)) {
      return res.status(400).json({
        success: false,
        message: '百分比类型必须提供有效百分比(0-100)'
      });
    }
    
    // 更新房间支付规则
    await roomPaymentRule.update(updateData);
    
    // 获取更新后的完整数据
    const updatedRule = await RoomPaymentRule.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: '房间支付规则更新成功',
      data: { roomPaymentRule: updatedRule }
    });
  } catch (error) {
    logger.error('更新房间支付规则失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新房间支付规则失败',
      error: error.message
    });
  }
};

/**
 * 删除房间支付规则
 */
const deleteRoomPaymentRule = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证房间支付规则是否存在
    const roomPaymentRule = await RoomPaymentRule.findByPk(id);
    if (!roomPaymentRule) {
      return res.status(404).json({
        success: false,
        message: '房间支付规则不存在'
      });
    }
    
    // 检查是否有关联的支付记录
    const associatedPayments = await Payment.count({
      where: { roomPaymentRuleId: id }
    });
    
    if (associatedPayments > 0) {
      // 如果有关联支付记录，进行软删除
      await roomPaymentRule.update({ status: 'deleted' });
      
      return res.status(200).json({
        success: true,
        message: '房间支付规则已标记为删除（因存在关联支付记录）'
      });
    } else {
      // 如果没有关联支付记录，进行硬删除
      await roomPaymentRule.destroy();
      
      return res.status(200).json({
        success: true,
        message: '房间支付规则删除成功'
      });
    }
  } catch (error) {
    logger.error('删除房间支付规则失败:', error);
    return res.status(500).json({
      success: false,
      message: '删除房间支付规则失败',
      error: error.message
    });
  }
};

/**
 * 切换房间支付规则状态
 */
const toggleRoomPaymentRuleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证房间支付规则是否存在
    const roomPaymentRule = await RoomPaymentRule.findByPk(id);
    if (!roomPaymentRule) {
      return res.status(404).json({
        success: false,
        message: '房间支付规则不存在'
      });
    }
    
    // 切换状态
    const newStatus = roomPaymentRule.status === 'active' ? 'inactive' : 'active';
    await roomPaymentRule.update({ status: newStatus });
    
    return res.status(200).json({
      success: true,
      message: `房间支付规则已${newStatus === 'active' ? '启用' : '禁用'}`,
      data: { status: newStatus }
    });
  } catch (error) {
    logger.error('切换房间支付规则状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '切换房间支付规则状态失败',
      error: error.message
    });
  }
};

/**
 * 批量更新房间支付规则
 */
const batchUpdateRoomPaymentRules = async (req, res) => {
  try {
    const { ruleIds, updateData } = req.body;
    
    if (!ruleIds || !Array.isArray(ruleIds) || ruleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要更新的规则ID列表'
      });
    }
    
    // 验证所有规则是否存在
    const rules = await RoomPaymentRule.findAll({
      where: { id: { [Op.in]: ruleIds } }
    });
    
    if (rules.length !== ruleIds.length) {
      return res.status(404).json({
        success: false,
        message: '部分房间支付规则不存在'
      });
    }
    
    // 批量更新
    await RoomPaymentRule.update(updateData, {
      where: { id: { [Op.in]: ruleIds } }
    });
    
    // 获取更新后的数据
    const updatedRules = await RoomPaymentRule.findAll({
      where: { id: { [Op.in]: ruleIds } },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name', 'number']
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: `成功更新${updatedRules.length}条房间支付规则`,
      data: { roomPaymentRules: updatedRules }
    });
  } catch (error) {
    logger.error('批量更新房间支付规则失败:', error);
    return res.status(500).json({
      success: false,
      message: '批量更新房间支付规则失败',
      error: error.message
    });
  }
};

/**
 * 计算房间支付金额
 */
const calculateRoomPaymentAmount = async (req, res) => {
  try {
    const { roomId, billAmount, billType, userId } = req.body;
    
    if (!roomId || !billAmount || !billType) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段: roomId, billAmount, billType'
      });
    }
    
    // 验证房间是否存在
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在'
      });
    }
    
    // 获取房间适用的支付规则
    const applicableRules = await RoomPaymentRule.findAll({
      where: {
        roomId,
        status: 'active',
        [Op.or]: [
          { applicableBillTypes: { [Op.contains]: [billType] } },
          { applicableBillTypes: { [Op.contains]: ['all'] } }
        ]
      },
      order: [['priority', 'ASC']]
    });
    
    // 如果没有适用的规则，返回原始金额
    if (applicableRules.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          originalAmount: billAmount,
          finalAmount: billAmount,
          discountAmount: 0,
          appliedRules: []
        }
      });
    }
    
    // 应用规则计算最终金额
    let finalAmount = parseFloat(billAmount);
    let discountAmount = 0;
    const appliedRules = [];
    
    for (const rule of applicableRules) {
      // 检查用户是否在适用用户列表中
      if (rule.applicableUsers && rule.applicableUsers.length > 0) {
        if (!userId || !rule.applicableUsers.includes(userId)) {
          continue;
        }
      }
      
      // 检查时间范围是否适用
      if (rule.applicableTimeRange) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const { startTime, endTime } = rule.applicableTimeRange;
        
        const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
        const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
        
        if (currentTime < startMinutes || currentTime > endMinutes) {
          continue;
        }
      }
      
      // 应用规则
      let ruleDiscount = 0;
      
      if (rule.amountType === 'fixed') {
        ruleDiscount = parseFloat(rule.fixedAmount);
      } else if (rule.amountType === 'percentage') {
        ruleDiscount = finalAmount * (parseFloat(rule.percentage) / 100);
      }
      
      // 应用最大/最小金额限制
      if (rule.maxAmount && ruleDiscount > parseFloat(rule.maxAmount)) {
        ruleDiscount = parseFloat(rule.maxAmount);
      }
      
      if (rule.minAmount && ruleDiscount < parseFloat(rule.minAmount)) {
        ruleDiscount = parseFloat(rule.minAmount);
      }
      
      // 根据规则类型调整最终金额
      if (rule.ruleType === 'discount') {
        finalAmount -= ruleDiscount;
        discountAmount += ruleDiscount;
      } else if (rule.ruleType === 'surcharge') {
        finalAmount += ruleDiscount;
      } else if (rule.ruleType === 'exemption') {
        finalAmount = 0;
        discountAmount = parseFloat(billAmount);
      }
      
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.ruleType,
        discountAmount: ruleDiscount
      });
      
      // 如果是豁免类型，直接跳出循环
      if (rule.ruleType === 'exemption') {
        break;
      }
    }
    
    // 确保最终金额不为负数
    finalAmount = Math.max(0, finalAmount);
    
    return res.status(200).json({
      success: true,
      data: {
        originalAmount: parseFloat(billAmount),
        finalAmount,
        discountAmount,
        appliedRules
      }
    });
  } catch (error) {
    logger.error('计算房间支付金额失败:', error);
    return res.status(500).json({
      success: false,
      message: '计算房间支付金额失败',
      error: error.message
    });
  }
};

/**
 * 获取房间支付规则使用统计
 */
const getRoomPaymentRuleStatistics = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;
    
    // 验证房间是否存在
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在'
      });
    }
    
    // 构建日期范围条件
    let dateCondition = {};
    if (startDate && endDate) {
      dateCondition = {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    }
    
    // 获取房间支付规则
    const roomPaymentRules = await RoomPaymentRule.findAll({
      where: { roomId }
    });
    
    // 获取每个规则的使用统计
    const statistics = await Promise.all(
      roomPaymentRules.map(async (rule) => {
        const paymentCount = await Payment.count({
          where: {
            roomPaymentRuleId: rule.id,
            ...dateCondition
          }
        });
        
        const paymentSum = await Payment.sum('amount', {
          where: {
            roomPaymentRuleId: rule.id,
            ...dateCondition
          }
        }) || 0;
        
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          status: rule.status,
          usageCount: paymentCount,
          totalAmount: parseFloat(paymentSum)
        };
      })
    );
    
    // 计算总体统计
    const totalUsage = statistics.reduce((sum, stat) => sum + stat.usageCount, 0);
    const totalAmount = statistics.reduce((sum, stat) => sum + stat.totalAmount, 0);
    
    return res.status(200).json({
      success: true,
      data: {
        roomId,
        roomName: room.name,
        statistics,
        summary: {
          totalRules: roomPaymentRules.length,
          activeRules: roomPaymentRules.filter(r => r.status === 'active').length,
          totalUsage,
          totalAmount
        }
      }
    });
  } catch (error) {
    logger.error('获取房间支付规则使用统计失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取房间支付规则使用统计失败',
      error: error.message
    });
  }
};

/**
 * 复制房间支付规则到其他房间
 */
const copyRoomPaymentRuleToRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetRoomIds, updateName = true } = req.body;
    
    if (!targetRoomIds || !Array.isArray(targetRoomIds) || targetRoomIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供目标房间ID列表'
      });
    }
    
    // 验证源规则是否存在
    const sourceRule = await RoomPaymentRule.findByPk(id);
    if (!sourceRule) {
      return res.status(404).json({
        success: false,
        message: '源房间支付规则不存在'
      });
    }
    
    // 验证目标房间是否存在
    const targetRooms = await Room.findAll({
      where: { id: { [Op.in]: targetRoomIds } }
    });
    
    if (targetRooms.length !== targetRoomIds.length) {
      return res.status(404).json({
        success: false,
        message: '部分目标房间不存在'
      });
    }
    
    // 复制规则到目标房间
    const copiedRules = await Promise.all(
      targetRoomIds.map(async (roomId) => {
        // 检查目标房间是否已有同名规则
        const existingRule = await RoomPaymentRule.findOne({
          where: {
            roomId,
            name: sourceRule.name
          }
        });
        
        if (existingRule) {
          return {
            roomId,
            success: false,
            message: '目标房间已存在同名规则'
          };
        }
        
        // 创建新规则
        const newRule = await RoomPaymentRule.create({
          roomId,
          name: updateName ? `${sourceRule.name} (复制)` : sourceRule.name,
          description: sourceRule.description,
          ruleType: sourceRule.ruleType,
          paymentMethod: sourceRule.paymentMethod,
          amountType: sourceRule.amountType,
          fixedAmount: sourceRule.fixedAmount,
          percentage: sourceRule.percentage,
          maxAmount: sourceRule.maxAmount,
          minAmount: sourceRule.minAmount,
          applicableBillTypes: sourceRule.applicableBillTypes,
          applicableUsers: sourceRule.applicableUsers,
          applicableTimeRange: sourceRule.applicableTimeRange,
          priority: sourceRule.priority,
          status: 'inactive', // 复制的规则默认为非激活状态
          createdBy: req.user.id
        });
        
        return {
          roomId,
          success: true,
          ruleId: newRule.id,
          ruleName: newRule.name
        };
      })
    );
    
    const successCount = copiedRules.filter(r => r.success).length;
    
    return res.status(200).json({
      success: true,
      message: `成功复制规则到${successCount}个房间`,
      data: { copiedRules }
    });
  } catch (error) {
    logger.error('复制房间支付规则失败:', error);
    return res.status(500).json({
      success: false,
      message: '复制房间支付规则失败',
      error: error.message
    });
  }
};

module.exports = {
  getAllRoomPaymentRules,
  getRoomPaymentRuleById,
  getRoomPaymentRulesByRoomId,
  createRoomPaymentRule,
  updateRoomPaymentRule,
  deleteRoomPaymentRule,
  toggleRoomPaymentRuleStatus,
  batchUpdateRoomPaymentRules,
  calculateRoomPaymentAmount,
  getRoomPaymentRuleStatistics,
  copyRoomPaymentRuleToRoom
};