/**
 * 账单路由
 * 处理账单相关的HTTP请求
 */

const express = require('express');
const billService = require('../services/database/bill-service');
const { authenticateToken } = require('../middleware/auth-middleware');
const enhancedCacheMiddleware = require('../middleware/enhanced-cache-middleware');
const billController = require('../controllers/bill-controller');

const router = express.Router();

/**
 * 获取用户所在房间的账单列表（通用接口）
 * GET /api/bills
 * 支持参数：status, limit, page, search
 */
router.get('/', authenticateToken, enhancedCacheMiddleware.smartBillCache.getBills, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户所属的房间
    const userService = require('../services/database/user-service');
    const userRooms = await userService.getUserRooms(userId);
    
    if (userRooms.length === 0) {
      return res.json({
        success: true,
        data: {
          bills: [],
          pagination: {
            page: 1,
            limit: parseInt(req.query.limit) || 20,
            total: 0,
            totalPages: 0
          }
        }
      });
    }
    
    // 如果用户属于多个房间，默认取第一个房间
    // 可以在前端后续扩展为支持选择特定房间
    const roomId = userRooms[0].id;
    
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      search: req.query.search,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };
    
    const result = await billService.getRoomBills(roomId, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取账单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账单列表失败',
      error: error.message
    });
  }
});

/**
 * 获取房间账单列表
 * GET /api/bills/room/:roomId
 */
router.get('/room/:roomId', authenticateToken, enhancedCacheMiddleware.smartBillCache.getBills, async (req, res) => {
  try {
    const { roomId } = req.params;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      search: req.query.search,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };
    
    const result = await billService.getRoomBills(roomId, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取房间账单失败:', error);
    res.status(500).json({
      success: false,
      message: '获取房间账单失败',
      error: error.message
    });
  }
});

/**
 * 获取账单详情
 * GET /api/bills/:billId
 */
router.get('/:billId', authenticateToken, enhancedCacheMiddleware.smartBillCache.getBillDetail, async (req, res) => {
  try {
    const { billId } = req.params;
    const bill = await billService.getBillWithPayments(billId);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: '账单不存在'
      });
    }
    
    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('获取账单详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账单详情失败',
      error: error.message
    });
  }
});

/**
 * 创建账单
 * POST /api/bills
 */
router.post('/', authenticateToken, enhancedCacheMiddleware.smartBillCache.clearBills, async (req, res) => {
  try {
    const {
      room_id,
      title,
      description,
      amount,
      due_date,
      is_recurring = false,
      recurring_type = null,
      recurring_end_date = null
    } = req.body;
    
    // 验证必填字段
    if (!room_id || !title || !amount) {
      return res.status(400).json({
        success: false,
        message: '房间ID、标题和金额为必填项'
      });
    }
    
    // 验证金额
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: '金额必须为正数'
      });
    }
    
    // 如果是循环账单，验证循环类型
    if (is_recurring && !recurring_type) {
      return res.status(400).json({
        success: false,
        message: '循环账单必须指定循环类型'
      });
    }
    
    // 创建账单
    const billData = {
      room_id,
      title,
      description,
      amount,
      due_date,
      creator_id: req.user.id,
      is_recurring,
      recurring_type,
      recurring_end_date
    };
    
    const bill = await billService.createBill(billData);
    
    res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('创建账单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建账单失败',
      error: error.message
    });
  }
});

/**
 * 更新账单
 * PUT /api/bills/:billId
 */
router.put('/:billId', authenticateToken, enhancedCacheMiddleware.smartBillCache.clearBills, async (req, res) => {
  try {
    const { billId } = req.params;
    const updateData = req.body;
    
    // 验证金额（如果提供）
    if (updateData.amount !== undefined) {
      if (isNaN(updateData.amount) || parseFloat(updateData.amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: '金额必须为正数'
        });
      }
    }
    
    // 更新账单
    const bill = await billService.updateBill(billId, updateData);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: '账单不存在'
      });
    }
    
    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('更新账单失败:', error);
    res.status(500).json({
      success: false,
      message: '更新账单失败',
      error: error.message
    });
  }
});

/**
 * 更新账单状态
 * PATCH /api/bills/:billId/status
 */
router.patch('/:billId/status', authenticateToken, enhancedCacheMiddleware.smartBillCache.clearBills, async (req, res) => {
  try {
    const { billId } = req.params;
    const { status } = req.body;
    
    // 验证状态
    const validStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }
    
    // 更新账单状态
    const bill = await billService.updateBillStatus(billId, status);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: '账单不存在'
      });
    }
    
    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('更新账单状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新账单状态失败',
      error: error.message
    });
  }
});

/**
 * 删除账单
 * DELETE /api/bills/:billId
 */
router.delete('/:billId', authenticateToken, enhancedCacheMiddleware.smartBillCache.clearBills, async (req, res) => {
  try {
    const { billId } = req.params;
    
    // 删除账单
    const success = await billService.deleteBill(billId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '账单不存在'
      });
    }
    
    res.json({
      success: true,
      message: '账单删除成功'
    });
  } catch (error) {
    console.error('删除账单失败:', error);
    res.status(500).json({
      success: false,
      message: '删除账单失败',
      error: error.message
    });
  }
});

/**
 * 获取用户账单列表
 * GET /api/bills/user
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      role: req.query.role || 'all',
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };
    
    const result = await billService.getUserBills(userId, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取用户账单失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户账单失败',
      error: error.message
    });
  }
});

/**
 * 获取账单统计信息
 * GET /api/bills/room/:roomId/stats
 */
router.get('/room/:roomId/stats', authenticateToken, enhancedCacheMiddleware.smartBillCache.getBillStats, async (req, res) => {
  try {
    const { roomId } = req.params;
    const options = {
      period: req.query.period || 'all'
    };
    
    const stats = await billService.getBillStats(roomId, options);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取账单统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账单统计失败',
      error: error.message
    });
  }
});

/**
 * 批量获取账单信息
 * POST /api/bills/batch
 */
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const { billIds } = req.body;
    
    if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的账单ID数组'
      });
    }
    
    // 限制批量查询数量，防止查询过多数据
    if (billIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: '批量查询账单数量不能超过50个'
      });
    }
    
    const bills = await billService.getBillsBatch(billIds);
    
    // 将Map转换为数组
    const billsArray = Array.from(bills.values());
    
    res.json({
      success: true,
      data: billsArray
    });
  } catch (error) {
    console.error('批量获取账单信息失败:', error);
    res.status(500).json({
      success: false,
      message: '批量获取账单信息失败',
      error: error.message
    });
  }
});

// 获取账单结算状态
router.get('/:id/settlement', authenticateToken, enhancedCacheMiddleware.getSmartCache('bill:settlement', { ttl: 60 }), billController.getBillSettlementStatus);

// 结算账单
router.post('/:id/settle', authenticateToken, billController.settleBill);

// 获取账单分类列表
router.get('/categories', authenticateToken, enhancedCacheMiddleware.getSmartCache('bill:categories', { ttl: 300 }), billController.getBillCategories);

// 创建账单分类
router.post('/categories', authenticateToken, billController.createBillCategory);

// 更新账单分类
router.put('/categories/:id', authenticateToken, billController.updateBillCategory);

// 删除账单分类
router.delete('/categories/:id', authenticateToken, billController.deleteBillCategory);

module.exports = router;