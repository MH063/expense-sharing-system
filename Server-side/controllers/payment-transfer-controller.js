/**
 * 支付转移记录控制器
 * 处理支付转移记录的创建、查询、确认和取消等操作
 */

const { PaymentTransfer, Bill, User, Room } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * 获取支付转移记录列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPaymentTransfers = async (req, res) => {
  try {
    console.log('获取支付转移记录列表，参数:', req.query);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors: errors.array()
      });
    }
    
    const {
      billId,
      transferType,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 10
    } = req.query;
    
    // 构建查询条件
    const whereClause = {};
    
    if (billId) {
      whereClause.billId = billId;
    }
    
    if (transferType) {
      whereClause.transferType = transferType;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    // 日期范围查询
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate + ' 23:59:59');
      }
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询转移记录
    const { count, rows: transfers } = await PaymentTransfer.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'status']
        },
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });
    
    console.log(`成功查询到 ${count} 条支付转移记录`);
    
    res.status(200).json({
      success: true,
      data: {
        items: transfers,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(count / parseInt(pageSize))
      },
      message: '获取支付转移记录列表成功'
    });
  } catch (error) {
    console.error('获取支付转移记录列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 创建支付转移记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createPaymentTransfer = async (req, res) => {
  try {
    console.log('创建支付转移记录，数据:', req.body);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors: errors.array()
      });
    }
    
    const {
      billId,
      transferType,
      amount,
      fromUserId,
      toUserId,
      note
    } = req.body;
    
    // 检查账单是否存在
    const bill = await Bill.findByPk(billId);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: '账单不存在'
      });
    }
    
    // 检查付款人是否存在
    const fromUser = await User.findByPk(fromUserId);
    if (!fromUser) {
      return res.status(404).json({
        success: false,
        message: '付款人不存在'
      });
    }
    
    // 检查收款人是否存在
    const toUser = await User.findByPk(toUserId);
    if (!toUser) {
      return res.status(404).json({
        success: false,
        message: '收款人不存在'
      });
    }
    
    // 检查付款人和收款人是否相同（除非是本人支付）
    if (transferType !== 'self_pay' && fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        message: '付款人和收款人不能相同'
      });
    }
    
    // 检查金额是否有效
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '金额必须大于0'
      });
    }
    
    // 创建支付转移记录
    const transfer = await PaymentTransfer.create({
      billId,
      transferType,
      amount,
      fromUserId,
      toUserId,
      note,
      status: 'pending', // 初始状态为待确认
      createdBy: req.user.id
    });
    
    // 获取完整的转移记录信息
    const transferWithDetails = await PaymentTransfer.findByPk(transfer.id, {
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'status']
        },
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ]
    });
    
    console.log(`成功创建支付转移记录，ID: ${transfer.id}`);
    
    res.status(201).json({
      success: true,
      data: transferWithDetails,
      message: '创建支付转移记录成功'
    });
  } catch (error) {
    console.error('创建支付转移记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 确认支付转移记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const confirmPaymentTransfer = async (req, res) => {
  try {
    console.log(`确认支付转移记录，ID: ${req.params.id}`);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    
    // 查找转移记录
    const transfer = await PaymentTransfer.findByPk(id, {
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'status']
        },
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ]
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: '支付转移记录不存在'
      });
    }
    
    // 检查转移记录状态
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能确认待确认状态的转移记录'
      });
    }
    
    // 检查权限：只有收款人或管理员可以确认
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (transfer.toUserId !== currentUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '没有权限确认此转移记录'
      });
    }
    
    // 更新转移记录状态
    await transfer.update({
      status: 'completed',
      confirmedAt: new Date(),
      confirmedBy: currentUserId
    });
    
    console.log(`成功确认支付转移记录，ID: ${id}`);
    
    res.status(200).json({
      success: true,
      data: transfer,
      message: '确认支付转移记录成功'
    });
  } catch (error) {
    console.error('确认支付转移记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 取消支付转移记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const cancelPaymentTransfer = async (req, res) => {
  try {
    console.log(`取消支付转移记录，ID: ${req.params.id}`);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    
    // 查找转移记录
    const transfer = await PaymentTransfer.findByPk(id, {
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'status']
        },
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ]
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: '支付转移记录不存在'
      });
    }
    
    // 检查转移记录状态
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能取消待确认状态的转移记录'
      });
    }
    
    // 检查权限：只有付款人、收款人或管理员可以取消
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (transfer.fromUserId !== currentUserId && 
        transfer.toUserId !== currentUserId && 
        !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '没有权限取消此转移记录'
      });
    }
    
    // 更新转移记录状态
    await transfer.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: currentUserId
    });
    
    console.log(`成功取消支付转移记录，ID: ${id}`);
    
    res.status(200).json({
      success: true,
      data: transfer,
      message: '取消支付转移记录成功'
    });
  } catch (error) {
    console.error('取消支付转移记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取支付转移记录详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPaymentTransferById = async (req, res) => {
  try {
    console.log(`获取支付转移记录详情，ID: ${req.params.id}`);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    
    // 查找转移记录
    const transfer = await PaymentTransfer.findByPk(id, {
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'status', 'roomId'],
          include: [
            {
              model: Room,
              as: 'room',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ]
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: '支付转移记录不存在'
      });
    }
    
    console.log(`成功获取支付转移记录详情，ID: ${id}`);
    
    res.status(200).json({
      success: true,
      data: transfer,
      message: '获取支付转移记录详情成功'
    });
  } catch (error) {
    console.error('获取支付转移记录详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getPaymentTransfers,
  createPaymentTransfer,
  confirmPaymentTransfer,
  cancelPaymentTransfer,
  getPaymentTransferById
};