/**
 * 验证辅助工具模块
 * 提供常用的验证规则和验证函数
 */

const { body, param, query } = require('express-validator');

/**
 * 通用验证规则
 */
const commonRules = {
  // ID验证
  id: (fieldName = 'id', location = 'param') => {
    const validator = location === 'param' ? param(fieldName) : 
                      location === 'query' ? query(fieldName) : 
                      body(fieldName);
    
    return validator
      .exists({ checkFalsy: true }).withMessage(`${fieldName}为必填项`)
      .isInt({ min: 1 }).withMessage(`${fieldName}必须是正整数`);
  },

  // 用户名验证
  username: (required = true) => {
    const validator = body('username');
    
    if (required) {
      return validator
        .exists({ checkFalsy: true }).withMessage('username为必填项')
        .isString().withMessage('username必须是字符串')
        .isLength({ min: 3, max: 50 }).withMessage('username长度需在3-50之间')
        .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/).withMessage('username只能包含字母、数字、下划线和中文');
    }
    
    return validator
      .optional()
      .isString().withMessage('username必须是字符串')
      .isLength({ min: 3, max: 50 }).withMessage('username长度需在3-50之间')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/).withMessage('username只能包含字母、数字、下划线和中文');
  },

  // 邮箱验证
  email: (required = true) => {
    const validator = body('email');
    
    if (required) {
      return validator
        .exists({ checkFalsy: true }).withMessage('email为必填项')
        .isEmail().withMessage('email格式不正确')
        .normalizeEmail();
    }
    
    return validator
      .optional()
      .isEmail().withMessage('email格式不正确')
      .normalizeEmail();
  },

  // 密码验证（强密码）
  password: (fieldName = 'password', required = true) => {
    const validator = body(fieldName);
    
    if (required) {
      return validator
        .exists({ checkFalsy: true }).withMessage(`${fieldName}为必填项`)
        .isString().withMessage(`${fieldName}必须是字符串`)
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
        .withMessage(`${fieldName}需包含大小写、数字、特殊字符且至少8位`);
    }
    
    return validator
      .optional()
      .isString().withMessage(`${fieldName}必须是字符串`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
      .withMessage(`${fieldName}需包含大小写、数字、特殊字符且至少8位`);
  },

  // 手机号验证
  phone: (required = true) => {
    const validator = body('phone');
    
    if (required) {
      return validator
        .exists({ checkFalsy: true }).withMessage('phone为必填项')
        .matches(/^1[3-9]\d{9}$/).withMessage('phone格式不正确');
    }
    
    return validator
      .optional()
      .matches(/^1[3-9]\d{9}$/).withMessage('phone格式不正确');
  },

  // 分页参数验证
  pagination: () => {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('page必须是正整数'),
      query('pageSize')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('pageSize必须在1-100之间'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('limit必须在1-100之间'),
      query('offset')
        .optional()
        .isInt({ min: 0 }).withMessage('offset必须是非负整数')
    ];
  },

  // 日期范围验证
  dateRange: () => {
    return [
      query('startDate')
        .optional()
        .isISO8601().withMessage('startDate必须是有效的日期格式'),
      query('endDate')
        .optional()
        .isISO8601().withMessage('endDate必须是有效的日期格式')
    ];
  },

  // 金额验证
  amount: (fieldName = 'amount', required = true) => {
    const validator = body(fieldName);
    
    if (required) {
      return validator
        .exists({ checkFalsy: true }).withMessage(`${fieldName}为必填项`)
        .isFloat({ min: 0 }).withMessage(`${fieldName}必须是非负数字`);
    }
    
    return validator
      .optional()
      .isFloat({ min: 0 }).withMessage(`${fieldName}必须是非负数字`);
  },

  // URL验证
  url: (fieldName = 'url', required = true) => {
    const validator = body(fieldName);
    
    if (required) {
      return validator
        .exists({ checkFalsy: true }).withMessage(`${fieldName}为必填项`)
        .isURL().withMessage(`${fieldName}必须是有效的URL`);
    }
    
    return validator
      .optional()
      .isURL().withMessage(`${fieldName}必须是有效的URL`);
  },

  // 布尔值验证
  boolean: (fieldName, required = true) => {
    const validator = body(fieldName);
    
    if (required) {
      return validator
        .exists().withMessage(`${fieldName}为必填项`)
        .isBoolean().withMessage(`${fieldName}必须是布尔值`);
    }
    
    return validator
      .optional()
      .isBoolean().withMessage(`${fieldName}必须是布尔值`);
  },

  // 枚举值验证
  enum: (fieldName, allowedValues, required = true) => {
    const validator = body(fieldName);
    
    if (required) {
      return validator
        .exists({ checkFalsy: true }).withMessage(`${fieldName}为必填项`)
        .isIn(allowedValues).withMessage(`${fieldName}必须是以下值之一: ${allowedValues.join(', ')}`);
    }
    
    return validator
      .optional()
      .isIn(allowedValues).withMessage(`${fieldName}必须是以下值之一: ${allowedValues.join(', ')}`);
  },

  // 字符串长度验证
  stringLength: (fieldName, min = 1, max = 255, required = true) => {
    const validator = body(fieldName);
    
    if (required) {
      return validator
        .exists({ checkFalsy: true }).withMessage(`${fieldName}为必填项`)
        .isString().withMessage(`${fieldName}必须是字符串`)
        .isLength({ min, max }).withMessage(`${fieldName}长度需在${min}-${max}之间`);
    }
    
    return validator
      .optional()
      .isString().withMessage(`${fieldName}必须是字符串`)
      .isLength({ min, max }).withMessage(`${fieldName}长度需在${min}-${max}之间`);
  }
};

/**
 * 业务验证函数
 */
const validators = {
  /**
   * 验证密码强度
   * @param {string} password - 密码
   * @returns {Object} 验证结果
   */
  validatePasswordStrength: (password) => {
    const result = {
      isValid: true,
      score: 0,
      feedback: []
    };

    // 长度检查
    if (password.length < 8) {
      result.isValid = false;
      result.feedback.push('密码长度至少8位');
    } else {
      result.score += 1;
    }

    // 包含小写字母
    if (!/[a-z]/.test(password)) {
      result.isValid = false;
      result.feedback.push('密码需包含小写字母');
    } else {
      result.score += 1;
    }

    // 包含大写字母
    if (!/[A-Z]/.test(password)) {
      result.isValid = false;
      result.feedback.push('密码需包含大写字母');
    } else {
      result.score += 1;
    }

    // 包含数字
    if (!/\d/.test(password)) {
      result.isValid = false;
      result.feedback.push('密码需包含数字');
    } else {
      result.score += 1;
    }

    // 包含特殊字符
    if (!/[^\w\s]/.test(password)) {
      result.isValid = false;
      result.feedback.push('密码需包含特殊字符');
    } else {
      result.score += 1;
    }

    return result;
  },

  /**
   * 验证邮箱格式
   * @param {string} email - 邮箱
   * @returns {boolean} 是否有效
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 验证手机号格式
   * @param {string} phone - 手机号
   * @returns {boolean} 是否有效
   */
  isValidPhone: (phone) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  /**
   * 验证用户名格式
   * @param {string} username - 用户名
   * @returns {boolean} 是否有效
   */
  isValidUsername: (username) => {
    const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]{3,50}$/;
    return usernameRegex.test(username);
  },

  /**
   * 验证金额格式
   * @param {number} amount - 金额
   * @returns {boolean} 是否有效
   */
  isValidAmount: (amount) => {
    return typeof amount === 'number' && amount >= 0 && !isNaN(amount);
  },

  /**
   * 验证日期格式
   * @param {string} date - 日期字符串
   * @returns {boolean} 是否有效
   */
  isValidDate: (date) => {
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
  },

  /**
   * 验证ID格式
   * @param {any} id - ID
   * @returns {boolean} 是否有效
   */
  isValidId: (id) => {
    const numId = Number(id);
    return Number.isInteger(numId) && numId > 0;
  }
};

/**
 * 快速验证规则组合
 */
const quickRules = {
  // 登录验证规则
  login: [
    commonRules.username(true),
    commonRules.password('password', true)
  ],

  // 注册验证规则
  register: [
    commonRules.username(true),
    commonRules.email(true),
    commonRules.password('password', true),
    commonRules.stringLength('displayName', 1, 100, false)
  ],

  // 修改密码验证规则
  changePassword: [
    commonRules.password('currentPassword', true),
    commonRules.password('newPassword', true)
  ],

  // 重置密码验证规则
  resetPassword: [
    commonRules.stringLength('token', 1, 500, true),
    commonRules.password('newPassword', true)
  ],

  // 更新资料验证规则
  updateProfile: [
    commonRules.username(false),
    commonRules.email(false),
    commonRules.stringLength('displayName', 1, 100, false),
    commonRules.phone(false)
  ]
};

module.exports = {
  commonRules,
  validators,
  quickRules
};
