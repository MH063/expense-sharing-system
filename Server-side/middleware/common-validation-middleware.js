/**
 * 通用验证中间件
 * 提供统一的验证功能，减少重复的验证代码
 */

const { ValidationError } = require('./unified-error-handler');

/**
 * 验证必填字段
 * @param {Array} fields - 必填字段列表
 * @returns {Function} 验证中间件
 */
function validateRequired(fields) {
  return (req, res, next) => {
    const requestId = req.requestId;
    const missingFields = [];

    for (const field of fields) {
      // 支持嵌套字段，如 'user.name'
      const fieldParts = field.split('.');
      let value = req.body;

      for (const part of fieldParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }

      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new ValidationError(`缺少必填字段: ${missingFields.join(', ')}`);
    }

    next();
  };
}

/**
 * 验证字段格式
 * @param {Object} fieldValidations - 字段验证规则
 * @returns {Function} 验证中间件
 */
function validateFields(fieldValidations) {
  return (req, res, next) => {
    const requestId = req.requestId;
    const errors = [];

    for (const [field, rules] of Object.entries(fieldValidations)) {
      // 获取字段值
      const fieldParts = field.split('.');
      let value = req.body;

      for (const part of fieldParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          value = undefined;
          break;
        }
      }

      // 如果字段不存在且不是必填，跳过验证
      if (value === undefined && !rules.required) {
        continue;
      }

      // 验证必填
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} 是必填字段`);
        continue;
      }

      // 如果字段为空且不是必填，跳过其他验证
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // 验证类型
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${field} 必须是 ${rules.type} 类型`);
          continue;
        }
      }

      // 验证字符串长度
      if (rules.type === 'string' && typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(`${field} 长度不能少于 ${rules.minLength} 个字符`);
        }

        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`${field} 长度不能超过 ${rules.maxLength} 个字符`);
        }

        // 验证正则表达式
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} 格式不正确`);
        }
      }

      // 验证数字范围
      if (rules.type === 'number' && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} 不能小于 ${rules.min}`);
        }

        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} 不能大于 ${rules.max}`);
        }
      }

      // 验证数组
      if (rules.type === 'array' && Array.isArray(value)) {
        if (rules.minItems !== undefined && value.length < rules.minItems) {
          errors.push(`${field} 至少需要 ${rules.minItems} 个元素`);
        }

        if (rules.maxItems !== undefined && value.length > rules.maxItems) {
          errors.push(`${field} 最多只能有 ${rules.maxItems} 个元素`);
        }

        // 验证数组元素唯一性
        if (rules.unique && value.length !== new Set(value).size) {
          errors.push(`${field} 中的元素必须唯一`);
        }
      }

      // 验证枚举值
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} 必须是以下值之一: ${rules.enum.join(', ')}`);
      }

      // 自定义验证函数
      if (rules.validate && typeof rules.validate === 'function') {
        const customError = rules.validate(value);
        if (customError) {
          errors.push(`${field}: ${customError}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }

    next();
  };
}

/**
 * 验证密码强度
 * @param {string} fieldName - 密码字段名，默认为 'password'
 * @returns {Function} 验证中间件
 */
function validatePasswordStrength(fieldName = 'password') {
  return (req, res, next) => {
    const requestId = req.requestId;
    const fieldParts = fieldName.split('.');
    let password = req.body;

    for (const part of fieldParts) {
      if (password && typeof password === 'object' && part in password) {
        password = password[part];
      } else {
        password = undefined;
        break;
      }
    }

    if (!password) {
      throw new ValidationError(`${fieldName} 是必填字段`);
    }

    // 密码强度：至少8位，包含大小写、数字、特殊字符各一
    const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    if (!strongPwd.test(password)) {
      throw new ValidationError('密码需包含大小写、数字、特殊字符且至少8位');
    }

    next();
  };
}

/**
 * 验证邮箱格式
 * @param {string} fieldName - 邮箱字段名，默认为 'email'
 * @returns {Function} 验证中间件
 */
function validateEmail(fieldName = 'email') {
  return (req, res, next) => {
    const requestId = req.requestId;
    const fieldParts = fieldName.split('.');
    let email = req.body;

    for (const part of fieldParts) {
      if (email && typeof email === 'object' && part in email) {
        email = email[part];
      } else {
        email = undefined;
        break;
      }
    }

    if (!email) {
      throw new ValidationError(`${fieldName} 是必填字段`);
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(`${fieldName} 格式不正确`);
    }

    next();
  };
}

/**
 * 验证分页参数
 * @returns {Function} 验证中间件
 */
function validatePagination() {
  return (req, res, next) => {
    const requestId = req.requestId;
    const { page, limit } = req.query;

    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        throw new ValidationError('页码必须是大于0的整数');
      }
      req.query.page = pageNum;
    } else {
      req.query.page = 1;
    }

    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new ValidationError('每页数量必须是1-100之间的整数');
      }
      req.query.limit = limitNum;
    } else {
      req.query.limit = 20;
    }

    next();
  };
}

/**
 * 验证日期范围
 * @param {string} startField - 开始日期字段名
 * @param {string} endField - 结束日期字段名
 * @returns {Function} 验证中间件
 */
function validateDateRange(startField = 'start_date', endField = 'end_date') {
  return (req, res, next) => {
    const requestId = req.requestId;
    const { [startField]: startDate, [endField]: endDate } = req.query;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        throw new ValidationError(`${startField} 格式不正确`);
      }

      if (isNaN(end.getTime())) {
        throw new ValidationError(`${endField} 格式不正确`);
      }

      if (start > end) {
        throw new ValidationError(`${startField} 不能晚于 ${endField}`);
      }
    }

    next();
  };
}

/**
 * 验证排序参数
 * @param {Array} allowedFields - 允许的排序字段列表
 * @returns {Function} 验证中间件
 */
function validateSorting(allowedFields) {
  return (req, res, next) => {
    const requestId = req.requestId;
    const { sort_by, sort_order } = req.query;

    if (sort_by !== undefined) {
      if (!allowedFields.includes(sort_by)) {
        throw new ValidationError(`排序字段必须是以下值之一: ${allowedFields.join(', ')}`);
      }
    }

    if (sort_order !== undefined) {
      const normalizedOrder = sort_order.toUpperCase();
      if (!['ASC', 'DESC'].includes(normalizedOrder)) {
        throw new ValidationError('排序方向必须是 ASC 或 DESC');
      }
      req.query.sort_order = normalizedOrder;
    }

    next();
  };
}

/**
 * 验证ID参数
 * @param {string} paramName - 参数名，默认为 'id'
 * @returns {Function} 验证中间件
 */
function validateId(paramName = 'id') {
  return (req, res, next) => {
    const requestId = req.requestId;
    const id = req.params[paramName];

    if (!id) {
      throw new ValidationError(`缺少参数: ${paramName}`);
    }

    // 验证是否为正整数
    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum <= 0) {
      throw new ValidationError(`${paramName} 必须是正整数`);
    }

    // 将验证后的ID存回请求对象
    req.params[paramName] = idNum;

    next();
  };
}

/**
 * 验证用户权限
 * @param {string|Array} requiredRoles - 必需的角色
 * @returns {Function} 验证中间件
 */
function validateUserRoles(requiredRoles) {
  return (req, res, next) => {
    const requestId = req.requestId;

    if (!req.user) {
      throw new UnauthorizedError('用户未认证');
    }

    const userRoles = req.user.roles || [];
    const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    const hasPermission = required.some(role => userRoles.includes(role));

    if (!hasPermission) {
      throw new ForbiddenError('用户权限不足');
    }

    next();
  };
}

/**
 * 验证房间成员身份
 * @param {string} roomIdField - 房间ID字段名，默认为 'room_id'
 * @returns {Function} 验证中间件
 */
function validateRoomMembership(roomIdField = 'room_id') {
  return async (req, res, next) => {
    const requestId = req.requestId;
    const userId = req.user.sub;

    // 从请求中获取房间ID
    let roomId;
    if (req.params && req.params[roomIdField]) {
      roomId = req.params[roomIdField];
    } else if (req.query && req.query[roomIdField]) {
      roomId = req.query[roomIdField];
    } else if (req.body && req.body[roomIdField]) {
      roomId = req.body[roomIdField];
    }

    if (!roomId) {
      throw new ValidationError(`缺少房间ID: ${roomIdField}`);
    }

    // 验证用户是否是房间成员
    const { DatabaseHelper } = require('../utils/database-helper');
    const isMember = await DatabaseHelper.exists(
      'user_room_relations',
      { user_id: userId, room_id: roomId, is_active: true },
      requestId
    );

    if (!isMember) {
      throw new ForbiddenError('您不是该房间的成员');
    }

    next();
  };
}

module.exports = {
  validateRequired,
  validateFields,
  validatePasswordStrength,
  validateEmail,
  validatePagination,
  validateDateRange,
  validateSorting,
  validateId,
  validateUserRoles,
  validateRoomMembership
};