const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');
const { pool } = require('../config/db');

/**
 * 统一处理 express-validator 校验错误
 */
function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const formatted = result.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value,
      location: err.location
    }));
    return res.status(400).json({
      success: false,
      message: '请求参数校验失败',
      code: 'ValidationError',
      errors: formatted,
      timestamp: new Date().toISOString()
    });
  }
  next();
}

/**
 * 用户相关的校验规则集合
 */
const userValidationRules = {
  // 更新个人资料
  updateProfile: [
    body('displayName')
      .optional()
      .isString().withMessage('displayName 必须是字符串')
      .isLength({ min: 1, max: 100 }).withMessage('displayName 长度需在 1-100 之间'),
    body('email')
      .optional()
      .isEmail().withMessage('email 格式不正确')
      .normalizeEmail(),
    body('avatar_url')
      .optional()
      .isString().withMessage('avatar_url 必须是字符串')
      .isLength({ max: 500 }).withMessage('avatar_url 长度过长')
  ],

  // 修改密码
  changePassword: [
    body('currentPassword')
      .exists({ checkFalsy: true }).withMessage('currentPassword 为必填项')
      .isString().withMessage('currentPassword 必须是字符串')
      .isLength({ min: 8 }).withMessage('currentPassword 长度至少 8 位'),
    body('newPassword')
      .exists({ checkFalsy: true }).withMessage('newPassword 为必填项')
      .isString().withMessage('newPassword 必须是字符串')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
      .withMessage('newPassword 需包含大小写、数字、特殊字符且至少 8 位')
  ],

  // 注册
  register: [
    body('username')
      .exists({ checkFalsy: true }).withMessage('username 为必填项')
      .isString().withMessage('username 必须是字符串')
      .isLength({ min: 3, max: 50 }).withMessage('username 长度需在 3-50 之间'),
    body('password')
      .exists({ checkFalsy: true }).withMessage('password 为必填项')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
      .withMessage('password 需包含大小写、数字、特殊字符且至少 8 位'),
    body('email')
      .exists({ checkFalsy: true }).withMessage('email 为必填项')
      .isEmail().withMessage('email 格式不正确')
      .normalizeEmail(),
    body('displayName')
      .optional()
      .isString().withMessage('displayName 必须是字符串')
      .isLength({ min: 1, max: 100 }).withMessage('displayName 长度需在 1-100 之间')
  ]
};

/**
 * 登录相关校验规则集合
 */
const loginValidationRules = [
  body('username')
    .exists({ checkFalsy: true }).withMessage('username 为必填项'),
  body('password')
    .exists({ checkFalsy: true }).withMessage('password 为必填项')
];

/**
 * 单项用户输入校验集合（非规则分组）
 */
const userValidation = {
  forgotPassword: [
    body('email')
      .exists({ checkFalsy: true }).withMessage('email 为必填项')
      .isEmail().withMessage('email 格式不正确')
      .normalizeEmail()
  ],
  resetPassword: [
    body('token')
      .exists({ checkFalsy: true }).withMessage('token 为必填项')
      .isString().withMessage('token 必须是字符串'),
    body('newPassword')
      .exists({ checkFalsy: true }).withMessage('newPassword 为必填项')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
      .withMessage('newPassword 需包含大小写、数字、特殊字符且至少 8 位')
  ]
};

/**
 * 业务校验中间件（访问数据库做可用性检查）
 */
const businessValidation = {
  // 检查用户名是否可用（未被占用）
  isUsernameAvailable: async (req, res, next) => {
    try {
      const username = req.body && req.body.username;
      if (!username) {
        return res.status(400).json({ success: false, message: 'username 为必填项' });
      }
      const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (result.rows.length > 0) {
        return res.status(409).json({ success: false, message: '用户名已被注册' });
      }
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  },
  // 检查邮箱是否可用（未被占用）
  isEmailAvailable: async (req, res, next) => {
    try {
      const email = req.body && req.body.email;
      if (!email) {
        return res.status(400).json({ success: false, message: 'email 为必填项' });
      }
      const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        return res.status(409).json({ success: false, message: '邮箱已被注册' });
      }
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }
};

const adminValidationRules = {
  login: [
    body('username')
      .exists({ checkFalsy: true }).withMessage('username 为必填项')
      .isString().withMessage('username 必须是字符串')
      .isLength({ min: 3, max: 50 }).withMessage('username 长度需在 3-50 之间'),
    body('password')
      .exists({ checkFalsy: true }).withMessage('password 为必填项')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
      .withMessage('password 需包含大小写、数字、特殊字符且至少 8 位')
  ]
};

/** 统计相关校验规则 */
const statsValidationRules = {
  userStats: [],
  roomStats: [
    body('roomId').optional().isInt().withMessage('roomId 必须为整数')
  ],
  systemStats: [],
  forecast: [
    body('startDate').optional().isISO8601().withMessage('startDate 需为 ISO 日期'),
    body('endDate').optional().isISO8601().withMessage('endDate 需为 ISO 日期')
  ]
};

/** 房间相关校验规则 */
const roomValidationRules = {
  createRoom: [
    body('name').exists({ checkFalsy: true }).withMessage('name 为必填项').isLength({ min: 1, max: 100 }),
    body('code').optional().isString().isLength({ max: 50 })
  ],
  joinRoom: [
    body('roomCode').exists({ checkFalsy: true }).withMessage('roomCode 为必填项').isString()
  ],
  transferOwnership: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('toUserId').exists().isInt().withMessage('toUserId 必须为整数')
  ],
  updateRoom: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('code').optional().isString().isLength({ max: 50 })
  ],
  verifyInviteCode: [
    body('code').exists({ checkFalsy: true }).withMessage('code 为必填项').isString(),
    body('roomId').optional().isInt().withMessage('roomId 必须为整数')
  ]
};

/** 支付相关校验规则 */
const paymentValidationRules = {
  confirmPayment: [
    param('billId').exists().isInt().withMessage('billId 必须为整数'),
    body('amount').exists().isFloat({ gt: 0 }).withMessage('amount 必须为正数'),
    body('method').optional().isString()
  ]
};

/** 支付转移相关校验规则 */
const paymentTransferValidationRules = {
  getPaymentTransfers: [
    body('billId').optional().isInt(),
    body('transferType').optional().isString(),
    body('status').optional().isString(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('page').optional().isInt({ min: 1 }),
    body('pageSize').optional().isInt({ min: 1, max: 100 })
  ],
  createPaymentTransfer: [
    body('billId').exists().isInt().withMessage('billId 为必填项'),
    body('transferType').exists().isString().withMessage('transferType 为必填项'),
    body('amount').exists().isFloat({ gt: 0 }).withMessage('amount 必须为正数'),
    body('fromUserId').exists().isInt().withMessage('fromUserId 必须为整数'),
    body('toUserId').exists().isInt().withMessage('toUserId 必须为整数'),
    body('note').optional().isString()
  ],
  getPaymentTransferById: [
    param('id').exists().isInt().withMessage('id 必须为整数')
  ],
  confirmPaymentTransfer: [
    param('id').exists().isInt().withMessage('id 必须为整数')
  ],
  cancelPaymentTransfer: [
    param('id').exists().isInt().withMessage('id 必须为整数')
  ]
};

/** 账单相关校验规则 */
const billValidationRules = {
  create: [
    body('title').exists({ checkFalsy: true }).withMessage('title 为必填项').isString(),
    body('amount').exists().isFloat({ gt: 0 }).withMessage('amount 必须为正数'),
    body('roomId').exists().isInt().withMessage('roomId 必须为整数')
  ],
  update: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('title').optional().isString(),
    body('amount').optional().isFloat({ gt: 0 }),
    body('status').optional().isString()
  ],
  review: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('approved').exists().isBoolean().withMessage('approved 为必填项'),
    body('comment').optional().isString()
  ]
};

/** 费用相关校验规则 */
const expenseValidationRules = {
  createExpense: [
    body('title').exists({ checkFalsy: true }).withMessage('title 为必填项').isString(),
    body('amount').exists().isFloat({ gt: 0 }).withMessage('amount 必须为正数'),
    body('roomId').exists().isInt().withMessage('roomId 必须为整数')
  ],
  updateExpense: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('title').optional().isString(),
    body('amount').optional().isFloat({ gt: 0 })
  ],
  confirmSplitPayment: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('confirmed').exists().isBoolean().withMessage('confirmed 为必填项')
  ],
  calculateSmartSplit: [
    body('participants').exists().isArray().withMessage('participants 为必填数组'),
    body('amount').exists().isFloat({ gt: 0 })
  ],
  confirmExpensePayment: [
    param('expenseId').exists().isInt().withMessage('expenseId 必须为整数'),
    body('amount').exists().isFloat({ gt: 0 })
  ]
};

/** 通知相关校验规则 */
const notificationValidationRules = {
  markAllRead: [
    body('type').optional().isString()
  ],
  create: [
    body('user_id').exists().isInt().withMessage('user_id 为必填整数'),
    body('title').exists({ checkFalsy: true }).isString(),
    body('content').exists({ checkFalsy: true }).isString(),
    body('type').optional().isString(),
    body('related_id').optional().isInt()
  ]
};

module.exports = {
  handleValidationErrors,
  userValidationRules,
  loginValidationRules,
  userValidation,
  businessValidation,
  adminValidationRules,
  statsValidationRules,
  roomValidationRules,
  paymentValidationRules,
  paymentTransferValidationRules,
  billValidationRules,
  expenseValidationRules,
  notificationValidationRules
};
