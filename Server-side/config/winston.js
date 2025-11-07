/**
 * Winston日志配置
 * 提供统一的日志记录功能
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 定义日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 告诉winston使用自定义颜色
winston.addColors(colors);

// 定义日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 定义传输方式
const transports = [
  // 控制台输出
  new winston.transports.Console(),
  // 错误日志文件 - 使用UTF-8编码
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    options: { flags: 'w', encoding: 'utf8' }
  }),
  // 所有日志文件 - 使用UTF-8编码
  new winston.transports.File({ 
    filename: 'logs/all.log',
    options: { flags: 'w', encoding: 'utf8' }
  }),
];

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

module.exports = logger;