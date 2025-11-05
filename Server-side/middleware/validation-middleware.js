const { body, param, query, validationResult } = require('express-validator');
const { pool } = require('../config/db');

/**
 * 验证结果处理中间件
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  next();
};

/**
 * 用户相关验证规则
 */
const userValidation = {
  // 注册验证
  register: [
    body('username')
      .isLength({ min: 3, max: 20 })
      .withMessage('用户名长度应在3-20个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('密码长度至少8位')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])/)
      .withMessage('密码必须包含大小写字母、数字和特殊字符'),
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail(),
    body('displayName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('显示名称长度应在1-50个字符之间')
  ],
  
  // 登录验证
  login: [
    body('username')
      .notEmpty()
      .withMessage('用户名不能为空'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
  ],
  
  // 更新用户信息验证
  updateProfile: [
    body('displayName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('显示名称长度应在1-50个字符之间'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail(),
    body('avatar_url')
      .optional()
      .isURL()
      .withMessage('头像URL格式不正确')
  ],
  
  // 修改密码验证
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('当前密码不能为空'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('新密码长度至少8位')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])/)
      .withMessage('新密码必须包含大小写字母、数字和特殊字符')
  ],
  
  // 用户ID参数验证
  userId: [
    param('id')
      .isUUID()
      .withMessage('用户ID格式不正确')
  ],
  
  // 忘记密码验证
  forgotPassword: [
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail()
  ],
  
  // 重置密码验证
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('重置令牌不能为空'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('密码长度至少8位')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])/)
      .withMessage('密码必须包含大小写字母、数字和特殊字符')
  ]
};

// 为了兼容性，添加别名
const userValidationRules = userValidation;
const loginValidationRules = userValidation.login;

/**
 * 管理员相关验证规则
 */
const adminValidationRules = {
  // 管理员登录验证
  login: [
    body('username')
      .notEmpty()
      .withMessage('管理员用户名不能为空'),
    body('password')
      .notEmpty()
      .withMessage('管理员密码不能为空')
  ]
};

/**
 * 寝室相关验证规则
 */
const roomValidation = {
  // 创建寝室验证
  create: [
    body('name')
      .isLength({ min: 1, max: 50 })
      .withMessage('寝室名称长度应在1-50个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('寝室描述长度不能超过200个字符'),
    body('max_members')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('寝室最大成员数应在1-20之间')
  ],
  
  // 创建寝室验证（别名，用于兼容性）
  createRoom: [
    body('name')
      .isLength({ min: 1, max: 50 })
      .withMessage('寝室名称长度应在1-50个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('寝室描述长度不能超过200个字符'),
    body('max_members')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('寝室最大成员数应在1-20之间')
  ],
  
  // 加入寝室验证
  join: [
    param('roomId')
      .isUUID()
      .withMessage('寝室ID格式不正确'),
    body('inviteCode')
      .notEmpty()
      .withMessage('邀请码不能为空')
  ],
  
  // 加入寝室验证（别名，用于兼容性）
  joinRoom: [
    body('roomId')
      .isUUID()
      .withMessage('寝室ID格式不正确'),
    body('inviteCode')
      .notEmpty()
      .withMessage('邀请码不能为空')
  ],
  
  // 转移寝室所有权验证
  transferOwnership: [
    param('id')
      .isUUID()
      .withMessage('寝室ID格式不正确'),
    body('newOwnerId')
      .isUUID()
      .withMessage('新寝室长ID格式不正确')
  ],
  
  // 更新寝室信息验证
  updateRoom: [
    param('id')
      .isUUID()
      .withMessage('寝室ID格式不正确'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('寝室名称长度应在1-50个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('寝室描述长度不能超过200个字符'),
    body('max_members')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('寝室最大成员数应在1-20之间')
  ],
  
  // 验证邀请码验证
  verifyInviteCode: [
    body('inviteCode')
      .notEmpty()
      .withMessage('邀请码不能为空')
  ],
  
  // 寝室ID参数验证
  roomId: [
    param('id')
      .isUUID()
      .withMessage('寝室ID格式不正确')
  ]
};

// 为了兼容性，添加别名
const roomValidationRules = roomValidation;

/**
 * 账单相关验证规则
 */
const billValidation = {
  // 创建账单验证
  create: [
    body('title')
      .isLength({ min: 1, max: 100 })
      .withMessage('账单标题长度应在1-100个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('账单描述长度不能超过500个字符'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('账单金额必须大于0'),
    body('categoryId')
      .isUUID()
      .withMessage('账单分类ID格式不正确'),
    body('roomId')
      .isUUID()
      .withMessage('寝室ID格式不正确'),
    body('dueDate')
      .isISO8601()
      .withMessage('到期日期格式不正确'),
    body('splitType')
      .isIn(['equal', 'percentage', 'custom'])
      .withMessage('分摊类型必须是equal、percentage或custom之一'),
    body('splitDetails')
      .if(body('splitType').not().equals('equal'))
      .isArray({ min: 1 })
      .withMessage('分摊详情不能为空'),
    body('splitDetails.*.userId')
      .if(body('splitDetails').exists())
      .isUUID()
      .withMessage('分摊用户ID格式不正确'),
    body('splitDetails.*.amount')
      .if(body('splitType').equals('custom'))
      .isFloat({ min: 0.01 })
      .withMessage('分摊金额必须大于0'),
    body('splitDetails.*.percentage')
      .if(body('splitType').equals('percentage'))
      .isFloat({ min: 0.01, max: 100 })
      .withMessage('分摊百分比必须在0.01-100之间')
  ],
  
  // 更新账单验证
  update: [
    param('id')
      .isUUID()
      .withMessage('账单ID格式不正确'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('账单标题长度应在1-100个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('账单描述长度不能超过500个字符'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('账单金额必须大于0'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('到期日期格式不正确')
  ],
  
  // 审核账单验证
  review: [
    param('id')
      .isUUID()
      .withMessage('账单ID格式不正确'),
    body('action')
      .isIn(['approve', 'reject'])
      .withMessage('审核动作必须是approve或reject'),
    body('reason')
      .if(body('action').equals('reject'))
      .notEmpty()
      .withMessage('拒绝理由不能为空')
  ],
  
  // 账单ID参数验证
  billId: [
    param('id')
      .isUUID()
      .withMessage('账单ID格式不正确')
  ]
};

// 为了兼容性，添加别名
const billValidationRules = billValidation;

/**
 * 费用相关验证规则
 */
const expenseValidation = {
  // 创建费用验证
  create: [
    body('title')
      .isLength({ min: 1, max: 100 })
      .withMessage('费用标题长度应在1-100个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('费用描述长度不能超过500个字符'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('费用金额必须大于0'),
    body('expenseTypeId')
      .isUUID()
      .withMessage('费用类型ID格式不正确'),
    body('roomId')
      .isUUID()
      .withMessage('寝室ID格式不正确'),
    body('payerId')
      .isUUID()
      .withMessage('支付者ID格式不正确'),
    body('splitType')
      .isIn(['equal', 'percentage', 'custom'])
      .withMessage('分摊类型必须是equal、percentage或custom之一'),
    body('splitDetails')
      .if(body('splitType').not().equals('equal'))
      .isArray({ min: 1 })
      .withMessage('分摊详情不能为空'),
    body('splitDetails.*.userId')
      .if(body('splitDetails').exists())
      .isUUID()
      .withMessage('分摊用户ID格式不正确'),
    body('splitDetails.*.amount')
      .if(body('splitType').equals('custom'))
      .isFloat({ min: 0.01 })
      .withMessage('分摊金额必须大于0'),
    body('splitDetails.*.percentage')
      .if(body('splitType').equals('percentage'))
      .isFloat({ min: 0.01, max: 100 })
      .withMessage('分摊百分比必须在0.01-100之间'),
    body('expenseDate')
      .optional()
      .isISO8601()
      .withMessage('费用日期格式不正确')
  ],
  
  // 为了兼容性，添加别名
  createExpense: [
    body('title')
      .isLength({ min: 1, max: 100 })
      .withMessage('费用标题长度应在1-100个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('费用描述长度不能超过500个字符'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('费用金额必须大于0'),
    body('expenseTypeId')
      .isUUID()
      .withMessage('费用类型ID格式不正确'),
    body('roomId')
      .isUUID()
      .withMessage('寝室ID格式不正确'),
    body('payerId')
      .isUUID()
      .withMessage('支付者ID格式不正确'),
    body('splitType')
      .isIn(['equal', 'percentage', 'custom'])
      .withMessage('分摊类型必须是equal、percentage或custom之一'),
    body('splitDetails')
      .if(body('splitType').not().equals('equal'))
      .isArray({ min: 1 })
      .withMessage('分摊详情不能为空'),
    body('splitDetails.*.userId')
      .if(body('splitDetails').exists())
      .isUUID()
      .withMessage('分摊用户ID格式不正确'),
    body('splitDetails.*.amount')
      .if(body('splitType').equals('custom'))
      .isFloat({ min: 0.01 })
      .withMessage('分摊金额必须大于0'),
    body('splitDetails.*.percentage')
      .if(body('splitType').equals('percentage'))
      .isFloat({ min: 0.01, max: 100 })
      .withMessage('分摊百分比必须在0.01-100之间'),
    body('expenseDate')
      .optional()
      .isISO8601()
      .withMessage('费用日期格式不正确')
  ],
  
  // 更新费用验证
  update: [
    param('id')
      .isUUID()
      .withMessage('费用ID格式不正确'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('费用标题长度应在1-100个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('费用描述长度不能超过500个字符'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('费用金额必须大于0')
  ],
  
  // 为了兼容性，添加别名
  updateExpense: [
    param('id')
      .isUUID()
      .withMessage('费用ID格式不正确'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('费用标题长度应在1-100个字符之间'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('费用描述长度不能超过500个字符'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('费用金额必须大于0')
  ],
  
  // 确认支付分摊金额验证
  confirmSplitPayment: [
    param('id')
      .isUUID()
      .withMessage('费用分摊ID格式不正确'),
    body('paymentMethod')
      .isIn(['alipay', 'wechat', 'bank_transfer', 'cash'])
      .withMessage('支付方式必须是alipay、wechat、bank_transfer或cash之一'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('支付金额必须大于0'),
    body('transactionId')
      .optional()
      .isString()
      .withMessage('交易ID必须是字符串'),
    body('notes')
      .optional()
      .isString()
      .withMessage('备注必须是字符串')
  ],
  
  // 智能分摊计算验证
  calculateSmartSplit: [
    body('totalAmount')
      .isFloat({ min: 0.01 })
      .withMessage('总金额必须大于0'),
    body('participantIds')
      .isArray({ min: 1 })
      .withMessage('参与者ID列表不能为空'),
    body('participantIds.*')
      .isUUID()
      .withMessage('参与者ID格式不正确'),
    body('splitType')
      .isIn(['equal', 'percentage', 'custom'])
      .withMessage('分摊类型必须是equal、percentage或custom之一'),
    body('splitDetails')
      .if(body('splitType').not().equals('equal'))
      .isArray({ min: 1 })
      .withMessage('分摊详情不能为空'),
    body('splitDetails.*.userId')
      .if(body('splitDetails').exists())
      .isUUID()
      .withMessage('分摊用户ID格式不正确'),
    body('splitDetails.*.amount')
      .if(body('splitType').equals('custom'))
      .isFloat({ min: 0.01 })
      .withMessage('分摊金额必须大于0'),
    body('splitDetails.*.percentage')
      .if(body('splitType').equals('percentage'))
      .isFloat({ min: 0.01, max: 100 })
      .withMessage('分摊百分比必须在0.01-100之间')
  ],
  
  // 确认费用支付验证
  confirmExpensePayment: [
    param('expenseId')
      .isUUID()
      .withMessage('费用ID格式不正确'),
    body('paymentMethod')
      .isIn(['alipay', 'wechat', 'bank_transfer', 'cash'])
      .withMessage('支付方式必须是alipay、wechat、bank_transfer或cash之一'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('支付金额必须大于0'),
    body('transactionId')
      .optional()
      .isString()
      .withMessage('交易ID必须是字符串'),
    body('notes')
      .optional()
      .isString()
      .withMessage('备注必须是字符串')
  ],
  
  // 费用ID参数验证
  expenseId: [
    param('id')
      .isUUID()
      .withMessage('费用ID格式不正确')
  ]
};

// 为了兼容性，添加别名
const expenseValidationRules = expenseValidation;

/**
 * 支付相关验证规则
 */
const paymentValidation = {
  // 确认支付验证
  confirmPayment: [
    param('billId')
      .isUUID()
      .withMessage('账单ID格式不正确'),
    body('paymentMethod')
      .isIn(['alipay', 'wechat', 'bank_transfer', 'cash'])
      .withMessage('支付方式必须是alipay、wechat、bank_transfer或cash之一'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('支付金额必须大于0'),
    body('transactionId')
      .optional()
      .isString()
      .withMessage('交易ID必须是字符串'),
    body('notes')
      .optional()
      .isString()
      .withMessage('备注必须是字符串')
  ],
  
  // 创建离线支付记录验证
  createOfflinePayment: [
    body('billId')
      .isUUID()
      .withMessage('账单ID格式不正确'),
    body('paymentMethod')
      .isIn(['cash', 'bank_transfer'])
      .withMessage('离线支付方式必须是cash或bank_transfer'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('支付金额必须大于0'),
    body('paymentDate')
      .isISO8601()
      .withMessage('支付日期格式不正确'),
    body('notes')
      .optional()
      .isString()
      .withMessage('备注必须是字符串')
  ],
  
  // 标记同步失败验证
  markSyncFailed: [
    param('paymentId')
      .isUUID()
      .withMessage('支付ID格式不正确'),
    body('reason')
      .isString()
      .withMessage('失败原因必须是字符串')
  ],
  
  // 支付ID参数验证
  paymentId: [
    param('id')
      .isUUID()
      .withMessage('支付ID格式不正确')
  ],
  
  // 账单支付状态参数验证
  billId: [
    param('billId')
      .isUUID()
      .withMessage('账单ID格式不正确')
  ]
};

// 为了兼容性，添加别名
const paymentValidationRules = paymentValidation;

/**
 * 通知相关验证规则
 */
const notificationValidation = {
  // 创建通知验证
  create: [
    body('title')
      .isLength({ min: 1, max: 100 })
      .withMessage('通知标题长度应在1-100个字符之间'),
    body('content')
      .isLength({ min: 1, max: 500 })
      .withMessage('通知内容长度应在1-500个字符之间'),
    body('type')
      .isIn(['bill', 'payment', 'room', 'system'])
      .withMessage('通知类型必须是bill、payment、room或system之一'),
    body('recipientIds')
      .isArray({ min: 1 })
      .withMessage('接收者ID列表不能为空'),
    body('recipientIds.*')
      .isUUID()
      .withMessage('接收者ID格式不正确'),
    body('relatedId')
      .optional()
      .isString()
      .withMessage('关联ID必须是字符串'),
    body('actionUrl')
      .optional()
      .isURL()
      .withMessage('操作链接格式不正确')
  ],
  
  // 批量标记已读验证
  markAllRead: [
    body('notificationIds')
      .optional()
      .isArray()
      .withMessage('通知ID列表必须是数组'),
    body('notificationIds.*')
      .if(body('notificationIds').exists())
      .isUUID()
      .withMessage('通知ID格式不正确')
  ],
  
  // 通知ID参数验证
  notificationId: [
    param('id')
      .isUUID()
      .withMessage('通知ID格式不正确')
  ]
};

// 为了兼容性，添加别名
const notificationValidationRules = notificationValidation;

/**
 * 统计相关验证规则
 */
const statsValidation = {
  // 用户统计验证
  userStats: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式不正确'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式不正确'),
    query('type')
      .optional()
      .isIn(['expense', 'bill', 'payment'])
      .withMessage('统计类型必须是expense、bill或payment之一')
  ],
  
  // 寝室统计验证
  roomStats: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式不正确'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式不正确'),
    query('type')
      .optional()
      .isIn(['expense', 'bill', 'payment'])
      .withMessage('统计类型必须是expense、bill或payment之一')
  ],
  
  // 系统统计验证
  systemStats: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式不正确'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式不正确'),
    query('type')
      .optional()
      .isIn(['users', 'rooms', 'bills', 'payments'])
      .withMessage('统计类型必须是users、rooms、bills或payments之一')
  ],
  
  // 费用预测验证
  forecast: [
    query('type')
      .isIn(['expense', 'bill'])
      .withMessage('预测类型必须是expense或bill'),
    query('period')
      .isIn(['month', 'quarter', 'year'])
      .withMessage('预测周期必须是month、quarter或year')
  ]
};

// 为了兼容性，添加别名
const statsValidationRules = statsValidation;

/**
 * 支付转移相关验证规则
 */
const paymentTransferValidation = {
  // 获取支付转移记录列表验证
  getPaymentTransfers: [
    query('billId').optional().isUUID().withMessage('账单ID必须是有效的UUID'),
    query('transferType').optional().isIn(['self_pay', 'multiple_payers', 'payer_transfer']).withMessage('转移类型无效'),
    query('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('状态无效'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数')
  ],
  
  // 创建支付转移记录验证
  createPaymentTransfer: [
    body('billId').isUUID().withMessage('账单ID必须是有效的UUID'),
    body('transferType').isIn(['self_pay', 'multiple_payers', 'payer_transfer']).withMessage('转移类型无效'),
    body('amount').isFloat({ min: 0.01 }).withMessage('金额必须是大于0的数字'),
    body('fromUserId').isUUID().withMessage('付款人ID必须是有效的UUID'),
    body('toUserId').isUUID().withMessage('收款人ID必须是有效的UUID'),
    body('note').optional().isLength({ max: 500 }).withMessage('备注长度不能超过500个字符')
  ],
  
  // 获取支付转移记录详情验证
  getPaymentTransferById: [
    param('id').isUUID().withMessage('转移记录ID必须是有效的UUID')
  ],
  
  // 确认支付转移记录验证
  confirmPaymentTransfer: [
    param('id').isUUID().withMessage('转移记录ID必须是有效的UUID')
  ],
  
  // 取消支付转移记录验证
  cancelPaymentTransfer: [
    param('id').isUUID().withMessage('转移记录ID必须是有效的UUID')
  ]
};

// 为了兼容性，添加别名
const paymentTransferValidationRules = paymentTransferValidation;

/**
 * 业务逻辑验证中间件
 */
const businessValidation = {
  // 验证用户是否是寝室成员
  isRoomMember: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const roomId = req.body.roomId || req.params.roomId || req.params.id;
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: '缺少寝室ID'
        });
      }
      
      const result = await pool.query(
        'SELECT 1 FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, roomId]
      );
      
      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }
      
      next();
    } catch (error) {
      console.error('验证寝室成员身份失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  },
  
  // 验证用户是否是寝室创建者
  isRoomCreator: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const roomId = req.params.roomId || req.params.id;
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: '缺少寝室ID'
        });
      }
      
      const result = await pool.query(
        'SELECT creator_id FROM rooms WHERE id = $1',
        [roomId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '寝室不存在'
        });
      }
      
      if (result.rows[0].creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: '只有寝室创建者可以执行此操作'
        });
      }
      
      next();
    } catch (error) {
      console.error('验证寝室创建者身份失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  },
  
  // 验证账单是否存在且用户有权限访问
  canAccessBill: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const billId = req.params.billId || req.params.id;
      
      if (!billId) {
        return res.status(400).json({
          success: false,
          message: '缺少账单ID'
        });
      }
      
      const result = await pool.query(
        `SELECT b.room_id FROM bills b
         JOIN user_room_relations urr ON b.room_id = urr.room_id
         WHERE b.id = $1 AND urr.user_id = $2 AND urr.is_active = TRUE`,
        [billId, userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '账单不存在或您没有权限访问'
        });
      }
      
      req.billRoomId = result.rows[0].room_id;
      next();
    } catch (error) {
      console.error('验证账单访问权限失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  },
  
  // 验证费用是否存在且用户有权限访问
  canAccessExpense: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const expenseId = req.params.expenseId || req.params.id;
      
      if (!expenseId) {
        return res.status(400).json({
          success: false,
          message: '缺少费用ID'
        });
      }
      
      const result = await pool.query(
        `SELECT e.room_id FROM expenses e
         JOIN user_room_relations urr ON e.room_id = urr.room_id
         WHERE e.id = $1 AND urr.user_id = $2 AND urr.is_active = TRUE`,
        [expenseId, userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用不存在或您没有权限访问'
        });
      }
      
      req.expenseRoomId = result.rows[0].room_id;
      next();
    } catch (error) {
      console.error('验证费用访问权限失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  },
  
  // 验证用户名是否已存在
  isUsernameAvailable: async (req, res, next) => {
    try {
      const { username } = req.body;
      
      const result = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '用户名已被注册'
        });
      }
      
      next();
    } catch (error) {
      console.error('验证用户名可用性失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  },
  
  // 验证邮箱是否已存在
  isEmailAvailable: async (req, res, next) => {
    try {
      const { email } = req.body;
      
      const result = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '邮箱已被注册'
        });
      }
      
      next();
    } catch (error) {
      console.error('验证邮箱可用性失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
};

// 为了兼容性，添加别名
const businessValidationRules = businessValidation;

module.exports = {
  handleValidationErrors,
  userValidation,
  userValidationRules,
  loginValidationRules,
  adminValidationRules,
  roomValidation,
  roomValidationRules,
  billValidation,
  billValidationRules,
  expenseValidation,
  expenseValidationRules,
  paymentValidation,
  paymentValidationRules,
  notificationValidation,
  notificationValidationRules,
  statsValidation,
  statsValidationRules,
  businessValidation,
  businessValidationRules,
  paymentTransferValidation,
  paymentTransferValidationRules
};