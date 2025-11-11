const { body, param, query } = require('express-validator');
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
    return res.clientError('请求参数校验失败', {
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
        return res.status(400).json({ 
          success: false, 
          message: 'username 为必填项' 
        });
      }
      const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (result.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: '用户名已被注册' 
        });
      }
      next();
    } catch (error) {
      console.error('用户名可用性检查错误:', error);
      return res.status(500).json({ 
        success: false, 
        message: '服务器内部错误' 
      });
    }
  },
  // 检查邮箱是否可用（未被占用）
  isEmailAvailable: async (req, res, next) => {
    try {
      const email = req.body && req.body.email;
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: 'email 为必填项' 
        });
      }
      const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: '邮箱已被注册' 
        });
      }
      next();
    } catch (error) {
      console.error('邮箱可用性检查错误:', error);
      return res.status(500).json({ 
        success: false, 
        message: '服务器内部错误' 
      });
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
  ],
  updateUserRole: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('用户ID为必填项')
      .isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
    body('role')
      .exists({ checkFalsy: true }).withMessage('角色为必填项')
      .isString().withMessage('角色必须是字符串')
      .isIn(['system_admin', 'admin', '寝室长', 'payer', 'user']).withMessage('角色值无效')
  ],
  
  // 获取用户详情验证规则
  getUserById: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('用户ID为必填项')
      .isInt({ min: 1 }).withMessage('用户ID必须是正整数')
  ],
  
  // 创建用户验证规则
  createUser: [
    body('username')
      .notEmpty().withMessage('用户名不能为空')
      .isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名只能包含字母、数字和下划线'),
    body('password')
      .notEmpty().withMessage('密码不能为空')
      .isLength({ min: 8 }).withMessage('密码长度至少8位')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
      .withMessage('密码需包含大小写、数字、特殊字符'),
    body('email')
      .notEmpty().withMessage('邮箱不能为空')
      .isEmail().withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('displayName')
      .optional()
      .isLength({ max: 100 }).withMessage('显示名称不能超过100个字符'),
    body('role')
      .optional()
      .isIn(['system_admin', 'admin', '寝室长', 'payer', 'user']).withMessage('角色值无效')
  ],
  
  // 更新用户验证规则
  updateUser: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('用户ID为必填项')
      .isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
    body('username')
      .optional()
      .isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名只能包含字母、数字和下划线'),
    body('email')
      .optional()
      .isEmail().withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('displayName')
      .optional()
      .isLength({ max: 100 }).withMessage('显示名称不能超过100个字符')
  ],
  
  // 更新用户状态验证规则
  updateUserStatus: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('用户ID为必填项')
      .isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
    body('status')
      .exists({ checkFalsy: true }).withMessage('状态为必填项')
      .isIn(['active', 'inactive']).withMessage('状态值无效')
  ],
  
  // 重置用户密码验证规则
  resetUserPassword: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('用户ID为必填项')
      .isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
    body('newPassword')
      .notEmpty().withMessage('新密码不能为空')
      .isLength({ min: 8 }).withMessage('密码长度至少8位')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
      .withMessage('密码需包含大小写、数字、特殊字符')
  ],
  
  // 删除用户验证规则
  deleteUser: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('用户ID为必填项')
      .isInt({ min: 1 }).withMessage('用户ID必须是正整数')
  ],
  
  // 批量更新用户状态验证规则
  batchUpdateUserStatus: [
    body('userIds')
      .isArray({ min: 1 }).withMessage('用户ID列表不能为空')
      .custom((value) => {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('用户ID列表不能为空');
        }
        for (const id of value) {
          if (!Number.isInteger(id) || id <= 0) {
            throw new Error('所有用户ID必须是正整数');
          }
        }
        return true;
      }),
    body('status')
      .exists({ checkFalsy: true }).withMessage('状态为必填项')
      .isIn(['active', 'inactive']).withMessage('状态值无效')
  ],
  
  // 账单管理相关验证规则
  
  // 获取账单列表验证规则
  getBills: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
    query('roomId')
      .optional()
      .isInt({ min: 1 }).withMessage('房间ID必须是正整数'),
    query('status')
      .optional()
      .isIn(['pending', 'confirmed', 'paid', 'cancelled']).withMessage('状态值无效'),
    query('category')
      .optional()
      .isString().withMessage('分类必须是字符串'),
    query('dateFrom')
      .optional()
      .isISO8601().withMessage('开始日期格式不正确'),
    query('dateTo')
      .optional()
      .isISO8601().withMessage('结束日期格式不正确')
  ],
  
  // 获取账单详情验证规则
  getBillById: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数')
  ],
  
  // 创建账单验证规则
  createBill: [
    body('roomId')
      .exists({ checkFalsy: true }).withMessage('房间ID为必填项')
      .isInt({ min: 1 }).withMessage('房间ID必须是正整数'),
    body('title')
      .exists({ checkFalsy: true }).withMessage('账单标题为必填项')
      .isString().withMessage('账单标题必须是字符串')
      .isLength({ min: 1, max: 200 }).withMessage('账单标题长度必须在1-200个字符之间'),
    body('amount')
      .exists({ checkFalsy: true }).withMessage('金额为必填项')
      .isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('category')
      .exists({ checkFalsy: true }).withMessage('分类为必填项')
      .isString().withMessage('分类必须是字符串')
      .isLength({ min: 1, max: 50 }).withMessage('分类长度必须在1-50个字符之间'),
    body('date')
      .exists({ checkFalsy: true }).withMessage('日期为必填项')
      .isISO8601().withMessage('日期格式不正确'),
    body('description')
      .optional()
      .isString().withMessage('描述必须是字符串')
      .isLength({ max: 500 }).withMessage('描述不能超过500个字符'),
    body('splitType')
      .optional()
      .isIn(['EQUAL', 'CUSTOM', 'PERCENTAGE']).withMessage('分摊类型无效'),
    body('splitDetails')
      .optional()
      .isArray().withMessage('分摊详情必须是数组'),
    body('paidBy')
      .optional()
      .isInt({ min: 1 }).withMessage('支付者ID必须是正整数')
  ],
  
  // 更新账单验证规则
  updateBill: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    body('title')
      .optional()
      .isString().withMessage('账单标题必须是字符串')
      .isLength({ min: 1, max: 200 }).withMessage('账单标题长度必须在1-200个字符之间'),
    body('amount')
      .optional()
      .isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('category')
      .optional()
      .isString().withMessage('分类必须是字符串')
      .isLength({ min: 1, max: 50 }).withMessage('分类长度必须在1-50个字符之间'),
    body('date')
      .optional()
      .isISO8601().withMessage('日期格式不正确'),
    body('description')
      .optional()
      .isString().withMessage('描述必须是字符串')
      .isLength({ max: 500 }).withMessage('描述不能超过500个字符'),
    body('status')
      .optional()
      .isIn(['pending', 'confirmed', 'paid', 'cancelled']).withMessage('状态值无效')
  ],
  
  // 删除账单验证规则
  deleteBill: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数')
  ],
  
  // 更新账单状态验证规则
  updateBillStatus: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    body('status')
      .exists({ checkFalsy: true }).withMessage('状态为必填项')
      .isIn(['pending', 'confirmed', 'paid', 'cancelled']).withMessage('状态值无效')
  ],
  
  // 获取账单评论验证规则
  getBillComments: [
    param('billId')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数')
  ],
  
  // 添加账单评论验证规则
  addBillComment: [
    param('billId')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    body('content')
      .exists({ checkFalsy: true }).withMessage('评论内容为必填项')
      .isString().withMessage('评论内容必须是字符串')
      .isLength({ min: 1, max: 500 }).withMessage('评论内容长度必须在1-500个字符之间')
  ],
  
  // 更新账单评论验证规则
  updateBillComment: [
    param('commentId')
      .exists({ checkFalsy: true }).withMessage('评论ID为必填项')
      .isInt({ min: 1 }).withMessage('评论ID必须是正整数'),
    body('content')
      .exists({ checkFalsy: true }).withMessage('评论内容为必填项')
      .isString().withMessage('评论内容必须是字符串')
      .isLength({ min: 1, max: 500 }).withMessage('评论内容长度必须在1-500个字符之间')
  ],
  
  // 删除账单评论验证规则
  deleteBillComment: [
    param('commentId')
      .exists({ checkFalsy: true }).withMessage('评论ID为必填项')
      .isInt({ min: 1 }).withMessage('评论ID必须是正整数')
  ],
  
  // 更新账单分摊验证规则
  updateBillSplit: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    body('splitType')
      .exists({ checkFalsy: true }).withMessage('分摊类型为必填项')
      .isIn(['EQUAL', 'CUSTOM', 'PERCENTAGE']).withMessage('分摊类型无效'),
    body('splitDetails')
      .exists({ checkFalsy: true }).withMessage('分摊详情为必填项')
      .isArray().withMessage('分摊详情必须是数组')
  ],
  
  // 获取账单统计验证规则
  getBillStatistics: [
    query('roomId')
      .optional()
      .isInt({ min: 1 }).withMessage('房间ID必须是正整数'),
    query('userId')
      .optional()
      .isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year']).withMessage('周期值无效'),
    query('dateFrom')
      .optional()
      .isISO8601().withMessage('开始日期格式不正确'),
    query('dateTo')
      .optional()
      .isISO8601().withMessage('结束日期格式不正确')
  ],
  
  // 创建账单分类验证规则
  createBillCategory: [
    body('name')
      .exists({ checkFalsy: true }).withMessage('分类名称为必填项')
      .isString().withMessage('分类名称必须是字符串')
      .isLength({ min: 1, max: 50 }).withMessage('分类名称长度必须在1-50个字符之间'),
    body('description')
      .optional()
      .isString().withMessage('分类描述必须是字符串')
      .isLength({ max: 200 }).withMessage('分类描述不能超过200个字符'),
    body('icon')
      .optional()
      .isString().withMessage('图标必须是字符串')
      .isLength({ max: 50 }).withMessage('图标不能超过50个字符'),
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i).withMessage('颜色必须是有效的十六进制颜色代码')
  ],
  
  // 更新账单分类验证规则
  updateBillCategory: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('分类ID为必填项')
      .isInt({ min: 1 }).withMessage('分类ID必须是正整数'),
    body('name')
      .optional()
      .isString().withMessage('分类名称必须是字符串')
      .isLength({ min: 1, max: 50 }).withMessage('分类名称长度必须在1-50个字符之间'),
    body('description')
      .optional()
      .isString().withMessage('分类描述必须是字符串')
      .isLength({ max: 200 }).withMessage('分类描述不能超过200个字符'),
    body('icon')
      .optional()
      .isString().withMessage('图标必须是字符串')
      .isLength({ max: 50 }).withMessage('图标不能超过50个字符'),
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i).withMessage('颜色必须是有效的十六进制颜色代码')
  ],
  
  // 删除账单分类验证规则
  deleteBillCategory: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('分类ID为必填项')
      .isInt({ min: 1 }).withMessage('分类ID必须是正整数')
  ],
  
  // 获取账单分类列表验证规则
  getBillCategories: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数')
  ],
  
  // 分享账单验证规则
  shareBill: [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    body('shareType')
      .exists({ checkFalsy: true }).withMessage('分享类型为必填项')
      .isIn(['link', 'image', 'export']).withMessage('分享类型无效'),
    body('expireTime')
      .optional()
      .isISO8601().withMessage('过期时间格式不正确')
  ],
  
  // 导出账单验证规则
  exportBills: [
    query('format')
      .optional()
      .isIn(['excel', 'csv', 'pdf']).withMessage('导出格式无效'),
    query('roomId')
      .optional()
      .isInt({ min: 1 }).withMessage('房间ID必须是正整数'),
    query('dateFrom')
      .optional()
      .isISO8601().withMessage('开始日期格式不正确'),
    query('dateTo')
      .optional()
      .isISO8601().withMessage('结束日期格式不正确')
  ],
  
  changePassword: [
    body('currentPassword')
      .exists({ checkFalsy: true }).withMessage('currentPassword 为必填项')
      .isString().withMessage('currentPassword 必须是字符串')
      .isLength({ min: 8 }).withMessage('currentPassword 长度至少 8 位'),
    body('newPassword')
      .exists({ checkFalsy: true }).withMessage('newPassword 为必填项')
      .isString().withMessage('newPassword 必须是字符串')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
      .withMessage('newPassword 需包含大小写、数字、特殊字符且至少 8 位'),
    body('confirmPassword')
      .exists({ checkFalsy: true }).withMessage('confirmPassword 为必填项')
      .isString().withMessage('confirmPassword 必须是字符串')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('confirmPassword 必须与 newPassword 相同');
        }
        return true;
      })
  ],
  refreshToken: [
    body('refreshToken')
      .exists({ checkFalsy: true }).withMessage('refreshToken 为必填项')
      .isString().withMessage('refreshToken 必须是字符串')
  ],
  verifyPermission: [
    body('permission')
      .exists({ checkFalsy: true }).withMessage('permission 为必填项')
      .isString().withMessage('permission 必须是字符串')
      .isLength({ min: 1, max: 100 }).withMessage('permission 长度需在 1-100 之间')
  ],
  
  // 创建权限验证规则
  // 更新权限验证规则
  // 创建角色权限关联验证规则
  // 这些规则已移动到roleValidationRules对象内
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
    body('total_amount').exists().isFloat({ gt: 0 }).withMessage('total_amount 必须为正数'),
    body('room_id').exists().isInt().withMessage('room_id 必须为整数'),
    body('due_date').exists().isISO8601().withMessage('due_date 需为 ISO 日期'),
    body('split_type').optional().isIn(['EQUAL','CUSTOM','PERCENTAGE']).withMessage('split_type 非法')
  ],
  update: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('title').optional().isString(),
    body('total_amount').optional().isFloat({ gt: 0 }),
    body('due_date').optional().isISO8601(),
    body('category').optional().isString()
  ],
  review: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('action').exists().isIn(['APPROVE','REJECT']).withMessage('action 必须为 APPROVE/REJECT'),
    body('comment').optional().isString()
  ]
};

/** 费用相关校验规则 */
const expenseValidationRules = {
  createExpense: [
    body('title').exists({ checkFalsy: true }).withMessage('title 为必填项').isString(),
    body('amount').exists().isFloat({ gt: 0 }).withMessage('amount 必须为正数'),
    body('roomId').exists().isInt().withMessage('roomId 必须为整数'),
    body('selected_members').optional().isArray().withMessage('selected_members 必须是数组')
  ],
  updateExpense: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('title').optional().isString(),
    body('amount').optional().isFloat({ gt: 0 }),
    body('selected_members').optional().isArray().withMessage('selected_members 必须是数组')
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

/** 角色相关校验规则 */
const roleValidationRules = {
  createRole: [
    body('name').exists({ checkFalsy: true }).withMessage('name 为必填项').isString(),
    body('description').optional().isString(),
    body('level').optional().isInt().withMessage('level 必须为整数'),
    body('is_active').optional().isBoolean().withMessage('is_active 必须为布尔值')
  ],
  updateRole: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('level').optional().isInt().withMessage('level 必须为整数'),
    body('is_active').optional().isBoolean().withMessage('is_active 必须为布尔值')
  ],
  assignPermission: [
    param('id').exists().isInt().withMessage('id 必须为整数'),
    body('permissionId').exists().isInt().withMessage('permissionId 必须为整数')
  ],
  createRolePermission: [
    body('roleId')
      .notEmpty()
      .withMessage('角色ID不能为空')
      .isInt({ min: 1 })
      .withMessage('角色ID必须是正整数'),
    body('permissionId')
      .notEmpty()
      .withMessage('权限ID不能为空')
      .isInt({ min: 1 })
      .withMessage('权限ID必须是正整数'),
  ],
  // 创建权限验证规则
  createPermission: [
    body('name')
      .notEmpty()
      .withMessage('权限名称不能为空')
      .isLength({ max: 100 })
      .withMessage('权限名称不能超过100个字符'),
    body('code')
      .notEmpty()
      .withMessage('权限代码不能为空')
      .matches(/^[a-zA-Z0-9_:]+$/)
      .withMessage('权限代码只能包含字母、数字、下划线和冒号')
      .isLength({ max: 100 })
      .withMessage('权限代码不能超过100个字符'),
    body('description')
      .optional()
      .isString()
      .withMessage('权限描述必须是字符串')
      .isLength({ max: 255 })
      .withMessage('权限描述不能超过255个字符'),
    body('resource')
      .notEmpty()
      .withMessage('资源不能为空')
      .isString()
      .withMessage('资源必须是字符串')
      .isLength({ max: 100 })
      .withMessage('资源不能超过100个字符'),
    body('action')
      .notEmpty()
      .withMessage('操作不能为空')
      .isString()
      .withMessage('操作必须是字符串')
      .isLength({ max: 100 })
      .withMessage('操作不能超过100个字符'),
  ],
  // 更新权限验证规则
  updatePermission: [
    body('name')
      .optional()
      .isString()
      .withMessage('权限名称必须是字符串')
      .isLength({ max: 100 })
      .withMessage('权限名称不能超过100个字符'),
    body('code')
      .optional()
      .matches(/^[a-zA-Z0-9_:]+$/)
      .withMessage('权限代码只能包含字母、数字、下划线和冒号')
      .isLength({ max: 100 })
      .withMessage('权限代码不能超过100个字符'),
    body('description')
      .optional()
      .isString()
      .withMessage('权限描述必须是字符串')
      .isLength({ max: 255 })
      .withMessage('权限描述不能超过255个字符'),
    body('resource')
      .optional()
      .isString()
      .withMessage('资源必须是字符串')
      .isLength({ max: 100 })
      .withMessage('资源不能超过100个字符'),
    body('action')
      .optional()
      .isString()
      .withMessage('操作必须是字符串')
      .isLength({ max: 100 })
      .withMessage('操作不能超过100个字符'),
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
  notificationValidationRules,
  roleValidationRules
};
