/**
 * 日期工具函数
 * 提供日期格式化和日期范围计算等功能
 */

/**
 * 格式化日期范围
 * @param {Date|string} startDate - 开始日期
 * @param {Date|string} endDate - 结束日期
 * @param {string} format - 格式类型，默认为 'YYYY-MM-DD'
 * @returns {Object} 格式化后的日期范围对象
 */
function formatDateRange(startDate, endDate, format = 'YYYY-MM-DD') {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // 确保日期有效
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('无效的日期范围');
  }
  
  // 根据格式类型格式化日期
  let formattedStart, formattedEnd;
  
  switch (format) {
    case 'YYYY-MM-DD':
      formattedStart = start.toISOString().split('T')[0];
      formattedEnd = end.toISOString().split('T')[0];
      break;
    case 'YYYY-MM-DD HH:mm:ss':
      formattedStart = start.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      formattedEnd = end.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      break;
    case 'MM/DD':
      formattedStart = `${(start.getMonth() + 1).toString().padStart(2, '0')}/${start.getDate()}`;
      formattedEnd = `${(end.getMonth() + 1).toString().padStart(2, '0')}/${end.getDate()}`;
      break;
    default:
      formattedStart = start.toISOString().split('T')[0];
      formattedEnd = end.toISOString().split('T')[0];
  }
  
  return {
    startDate: formattedStart,
    endDate: formattedEnd,
    daysDiff: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  };
}

/**
 * 获取当前日期的开始时间（00:00:00）
 * @returns {Date} 当前日期的开始时间
 */
function getStartOfDay(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

/**
 * 获取当前日期的结束时间（23:59:59）
 * @returns {Date} 当前日期的结束时间
 */
function getEndOfDay(date = new Date()) {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * 获取本周的开始日期（周一）
 * @returns {Date} 本周的开始日期
 */
function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
  return new Date(d.setDate(diff));
}

/**
 * 获取本月的开始日期
 * @returns {Date} 本月的开始日期
 */
function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 获取本月的结束日期
 * @returns {Date} 本月的结束日期
 */
function getEndOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

module.exports = {
  formatDateRange,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getStartOfMonth,
  getEndOfMonth
};