/**
 * 密码验证工具
 * 验证密码强度和安全性
 */

/**
 * 验证密码强度
 * @param {string} password - 待验证的密码
 * @returns {Object} 验证结果
 */
const validatePassword = (password) => {
  const result = {
    isValid: true,
    errors: []
  };

  // 检查密码长度
  if (password.length < 8) {
    result.isValid = false;
    result.errors.push('密码长度至少8位');
  }

  // 检查是否包含大写字母
  if (!/[A-Z]/.test(password)) {
    result.isValid = false;
    result.errors.push('密码必须包含至少一个大写字母');
  }

  // 检查是否包含小写字母
  if (!/[a-z]/.test(password)) {
    result.isValid = false;
    result.errors.push('密码必须包含至少一个小写字母');
  }

  // 检查是否包含数字
  if (!/\d/.test(password)) {
    result.isValid = false;
    result.errors.push('密码必须包含至少一个数字');
  }

  // 检查是否包含特殊字符
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.isValid = false;
    result.errors.push('密码必须包含至少一个特殊字符');
  }

  // 检查常见弱密码
  const weakPasswords = [
    'password', '12345678', 'qwertyui', 'admin123', 'letmein1',
    'welcome1', 'monkey1', 'dragon1', 'master1', 'mustang1'
  ];
  
  if (weakPasswords.includes(password.toLowerCase())) {
    result.isValid = false;
    result.errors.push('密码过于简单，请选择更复杂的密码');
  }

  return result;
};

module.exports = {
  validatePassword
};