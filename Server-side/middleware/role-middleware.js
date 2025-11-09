/**
 * 角色验证中间件
 * 用于检查用户是否具有指定的角色权限
 */

/**
 * 检查用户是否具有指定角色
 * @param {Array<string>} roles - 允许访问的角色数组
 * @returns {Function} - Express中间件函数
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    try {
      // 从请求中获取用户信息
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }
      
      // 检查用户角色是否在允许的角色列表中
      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }
      
      // 用户具有所需角色，继续执行下一个中间件
      next();
    } catch (error) {
      console.error('角色验证错误:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

module.exports = checkRole;