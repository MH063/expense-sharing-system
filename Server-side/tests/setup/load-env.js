/**
 * 加载测试环境变量
 * 在所有测试开始前加载环境变量
 */

const path = require('path');

// 加载测试环境变量
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

// 设置测试环境变量
process.env.NODE_ENV = 'test';