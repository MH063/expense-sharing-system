/**
 * 支付流程优化控制器
 * 处理离线支付、支付提醒和支付记录查询的相关API
 */

const offlinePaymentService = require('../services/offline-payment-service');
const paymentReminderService = require('../services/payment-reminder-service');
const paymentQueryService = require('../services/payment-query-service');
const scheduler = require('../utils/scheduler');

/**
 * 创建离线支付记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createOfflinePayment = async (req, res) => {
  try {
    const { billId, userId, amount, paymentMethod, description } = req.body;
    
    // 验证必要参数
    if (!billId || !userId || !amount || !paymentMethod) {
      return res.error(400, '缺少必要参数');
    }
    
    // 创建离线支付记录
    const result = await offlinePaymentService.createOfflinePayment({
      billId,
      userId,
      amount,
      paymentMethod,
      description,
      createdBy: req.user.id
    });
    
    res.success(201, '离线支付记录创建成功', result);
  } catch (error) {
    console.error('创建离线支付记录失败:', error);
    res.error(500, '创建离线支付记录失败', error.message);
  }
};

/**
 * 同步离线支付记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const syncOfflinePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // 验证参数
    if (!paymentId) {
      return res.error(400, '缺少支付记录ID');
    }
    
    // 同步离线支付记录
    const result = await offlinePaymentService.syncOfflinePayment(paymentId, req.user.id);
    
    res.success(200, '离线支付记录同步成功', result);
  } catch (error) {
    console.error('同步离线支付记录失败:', error);
    res.error(500, '同步离线支付记录失败', error.message);
  }
};

/**
 * 获取用户离线支付记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getUserOfflinePayments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    
    // 验证参数
    if (!userId) {
      return res.error(400, '缺少用户ID');
    }
    
    // 获取离线支付记录
    const result = await offlinePaymentService.getUserOfflinePayments(
      userId, 
      parseInt(page), 
      parseInt(limit),
      status
    );
    
    res.success(200, '获取用户离线支付记录成功', result);
  } catch (error) {
    console.error('获取用户离线支付记录失败:', error);
    res.error(500, '获取用户离线支付记录失败', error.message);
  }
};

/**
 * 获取待同步的离线支付记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPendingSyncPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // 获取待同步的离线支付记录
    const result = await offlinePaymentService.getPendingSyncPayments(
      parseInt(page), 
      parseInt(limit)
    );
    
    res.success(200, '获取待同步离线支付记录成功', result);
  } catch (error) {
    console.error('获取待同步离线支付记录失败:', error);
    res.error(500, '获取待同步离线支付记录失败', error.message);
  }
};

/**
 * 创建支付提醒
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createPaymentReminder = async (req, res) => {
  try {
    const { billId, userId, reminderTime, reminderType, message } = req.body;
    
    // 验证必要参数
    if (!billId || !userId || !reminderTime || !reminderType) {
      return res.error(400, '缺少必要参数');
    }
    
    // 创建支付提醒
    const result = await paymentReminderService.createPaymentReminder({
      billId,
      userId,
      reminderTime,
      reminderType,
      message,
      createdBy: req.user.id
    });
    
    res.success(201, '支付提醒创建成功', result);
  } catch (error) {
    console.error('创建支付提醒失败:', error);
    res.error(500, '创建支付提醒失败', error.message);
  }
};

/**
 * 获取用户支付提醒列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getUserPaymentReminders = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    
    // 验证参数
    if (!userId) {
      return res.error(400, '缺少用户ID');
    }
    
    // 获取用户支付提醒列表
    const result = await paymentReminderService.getUserPaymentReminders(
      userId, 
      parseInt(page), 
      parseInt(limit),
      status
    );
    
    res.success(200, '获取用户支付提醒列表成功', result);
  } catch (error) {
    console.error('获取用户支付提醒列表失败:', error);
    res.error(500, '获取用户支付提醒列表失败', error.message);
  }
};

/**
 * 获取支付记录列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPaymentRecords = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, billId, roomId, paymentMethod, startDate, endDate } = req.query;
    
    // 构建查询参数
    const queryParams = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    // 添加可选参数
    if (userId) queryParams.userId = userId;
    if (billId) queryParams.billId = billId;
    if (roomId) queryParams.roomId = roomId;
    if (paymentMethod) queryParams.paymentMethod = paymentMethod;
    if (startDate) queryParams.startDate = startDate;
    if (endDate) queryParams.endDate = endDate;
    
    // 获取支付记录列表
    const result = await paymentQueryService.getPaymentRecords(queryParams);
    
    res.success(200, '获取支付记录列表成功', result);
  } catch (error) {
    console.error('获取支付记录列表失败:', error);
    res.error(500, '获取支付记录列表失败', error.message);
  }
};

/**
 * 获取支付记录详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPaymentRecordById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // 验证参数
    if (!paymentId) {
      return res.error(400, '缺少支付记录ID');
    }
    
    // 获取支付记录详情
    const result = await paymentQueryService.getPaymentRecordById(paymentId);
    
    if (!result) {
      return res.error(404, '支付记录不存在');
    }
    
    res.success(200, '获取支付记录详情成功', result);
  } catch (error) {
    console.error('获取支付记录详情失败:', error);
    res.error(500, '获取支付记录详情失败', error.message);
  }
};

/**
 * 获取用户支付统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getUserPaymentStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    // 验证参数
    if (!userId) {
      return res.error(400, '缺少用户ID');
    }
    
    // 构建查询参数
    const queryParams = { userId };
    
    if (startDate) queryParams.startDate = startDate;
    if (endDate) queryParams.endDate = endDate;
    
    // 获取用户支付统计
    const result = await paymentQueryService.getUserPaymentStats(queryParams);
    
    res.success(200, '获取用户支付统计成功', result);
  } catch (error) {
    console.error('获取用户支付统计失败:', error);
    res.error(500, '获取用户支付统计失败', error.message);
  }
};

/**
 * 获取房间支付统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getRoomPaymentStats = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;
    
    // 验证参数
    if (!roomId) {
      return res.error(400, '缺少房间ID');
    }
    
    // 构建查询参数
    const queryParams = { roomId };
    
    if (startDate) queryParams.startDate = startDate;
    if (endDate) queryParams.endDate = endDate;
    
    // 获取房间支付统计
    const result = await paymentQueryService.getRoomPaymentStats(queryParams);
    
    res.success(200, '获取房间支付统计成功', result);
  } catch (error) {
    console.error('获取房间支付统计失败:', error);
    res.error(500, '获取房间支付统计失败', error.message);
  }
};

/**
 * 手动触发定时任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const triggerTask = async (req, res) => {
  try {
    const { taskName } = req.params;
    
    // 验证参数
    if (!taskName) {
      return res.error(400, '缺少任务名称');
    }
    
    // 触发定时任务
    const result = await scheduler.triggerTask(taskName);
    
    res.success(200, '触发定时任务成功', result);
  } catch (error) {
    console.error('触发定时任务失败:', error);
    res.error(500, '触发定时任务失败', error.message);
  }
};

/**
 * 获取定时任务状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTaskStatus = async (req, res) => {
  try {
    // 获取定时任务状态
    const result = scheduler.getTasksStatus();
    
    res.success(200, '获取定时任务状态成功', result);
  } catch (error) {
    console.error('获取定时任务状态失败:', error);
    res.error(500, '获取定时任务状态失败', error.message);
  }
};

// 标记同步失败
const markSyncFailed = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    if (!paymentId) {
      return res.error(400, '缺少支付记录ID');
    }
    const result = await offlinePaymentService.markPaymentSyncFailed(paymentId, reason || '');
    res.success(200, '已标记同步失败', result);
  } catch (error) {
    console.error('标记同步失败错误:', error);
    res.error(500, '标记同步失败错误', error.message);
  }
};

// 重试同步失败的记录
const retrySyncOfflinePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.error(400, '缺少支付记录ID');
    }
    const result = await offlinePaymentService.retryPaymentSync(paymentId);
    res.success(200, '重试已触发', result);
  } catch (error) {
    console.error('重试同步失败错误:', error);
    res.error(500, '重试同步失败错误', error.message);
  }
};

module.exports = {
  // 离线支付相关
  createOfflinePayment,
  syncOfflinePayment,
  getUserOfflinePayments,
  getPendingSyncPayments,
  markSyncFailed,
  retrySyncOfflinePayment,
  
  // 支付提醒相关
  createPaymentReminder,
  getUserPaymentReminders,
  
  // 支付记录查询相关
  getPaymentRecords,
  getPaymentRecordById,
  getUserPaymentStats,
  getRoomPaymentStats,
  
  // 定时任务相关
  triggerTask,
  getTaskStatus
};