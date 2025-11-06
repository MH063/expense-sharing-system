const { validationResult } = require('express-validator');

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

module.exports = {
  handleValidationErrors
};
