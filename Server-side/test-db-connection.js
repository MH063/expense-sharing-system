const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
const logLevel = args.find(arg => arg.startsWith('--log-level='))?.split('=')[1] || 
                 args.includes('--log-level') && args[args.indexOf('--log-level') + 1] || 
                 'info';

// 设置日志级别
process.env.LOG_LEVEL = logLevel;

// 日志函数
const log = {
  debug: (msg, data) => logLevel === 'debug' && console.log(`[DEBUG] ${msg}`, data || ''),
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

// 检查环境文件
function checkEnvFiles() {
  const envFiles = ['.env.development', `.env.${process.env.NODE_ENV || 'development'}`, '.env'];
  
  log.info('检查环境文件:');
  envFiles.forEach(file => {
    const filePath = path.resolve(__dirname, file);
    const exists = fs.existsSync(filePath);
    log.info(`  ${file}: ${exists ? '存在' : '不存在'}`);
    
    if (exists) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const dbPasswordMatch = content.match(/^DB_PASSWORD=(.+)$/m);
        if (dbPasswordMatch) {
          const password = dbPasswordMatch[1].trim();
          const isPlaceholder = password.includes('placeholder') || password.includes('your_');
          log.info(`    DB_PASSWORD: ${isPlaceholder ? '占位符' : '已设置'}`);
        }
      } catch (error) {
        log.warn(`    读取文件失败: ${error.message}`);
      }
    }
  });
}

// 加载环境变量
function loadEnvironmentVariables() {
  const env = process.env.NODE_ENV || 'development';
  
  // 按优先级加载环境变量文件
  const envFiles = [
    path.resolve(__dirname, '.env.development'), // 开发环境默认配置（最先加载）
    path.resolve(__dirname, `.env.${env}`),       // 环境特定配置
    path.resolve(__dirname, '.env')               // 本地环境变量（最后加载，具有最高优先级）
  ];

  // 按优先级加载环境变量文件
  envFiles.forEach(envPath => {
    try {
      if (fs.existsSync(envPath)) {
        log.info(`加载环境变量文件: ${path.basename(envPath)}`);
        // 本地.env文件使用override=true，其他文件使用override=false
        const isLocalEnv = envPath.endsWith('.env') && !envPath.endsWith('.env.development') && !envPath.includes('.env.');
        require('dotenv').config({ path: envPath, override: isLocalEnv });
      }
    } catch (error) {
      log.warn(`警告: 加载环境变量文件失败: ${envPath}`, error.message);
    }
  });
}

// 显示当前数据库配置
function showDatabaseConfig() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'expense_dev'
  };
  
  log.info('当前数据库配置:');
  log.info(`  主机: ${config.host}`);
  log.info(`  端口: ${config.port}`);
  log.info(`  用户: ${config.user}`);
  log.info(`  密码: ${config.password ? '已设置' : '未设置'}`);
  log.info(`  数据库: ${config.database}`);
  
  // 检查密码是否为占位符
  const isPlaceholder = config.password.includes('placeholder') || 
                        config.password.includes('your_') || 
                        config.password === 'development_password_placeholder';
  
  if (isPlaceholder) {
    log.warn('警告: 数据库密码是占位符，不是真实密码!');
  } else {
    log.info('数据库密码已设置，不是占位符');
  }
  
  return config;
}

// 测试数据库连接
async function testDatabaseConnection(config) {
  log.info('测试数据库连接...');
  
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    const client = await pool.connect();
    log.info('数据库连接成功!');
    
    // 获取PostgreSQL版本
    const result = await client.query('SELECT version()');
    log.info('PostgreSQL版本:', result.rows[0].version.split(',')[0]);
    
    // 获取当前用户
    const userResult = await client.query('SELECT current_user');
    log.info('当前用户:', userResult.rows[0].current_user);
    
    // 获取当前数据库
    const dbResult = await client.query('SELECT current_database()');
    log.info('当前数据库:', dbResult.rows[0].current_database);
    
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    log.error('数据库连接失败:', error.message);
    log.error('错误代码:', error.code);
    log.error('错误详情:', error.detail || '无详情');
    
    await pool.end();
    return false;
  }
}

// 主函数
async function main() {
  log.info('=== 数据库连接测试 ===');
  log.info(`日志级别: ${logLevel}`);
  
  // 1. 检查环境文件
  checkEnvFiles();
  
  // 2. 加载环境变量
  loadEnvironmentVariables();
  
  // 3. 显示数据库配置
  const config = showDatabaseConfig();
  
  // 4. 测试数据库连接
  const isConnected = await testDatabaseConnection(config);
  
  if (isConnected) {
    log.info('\n✅ 数据库连接测试成功!');
  } else {
    log.error('\n❌ 数据库连接测试失败!');
    log.info('\n可能的解决方案:');
    log.info('1. 检查PostgreSQL服务是否运行');
    log.info('2. 验证数据库用户名和密码是否正确');
    log.info('3. 确认数据库是否存在');
    log.info('4. 检查pg_hba.conf认证配置');
    log.info('5. 重置数据库用户密码: ALTER USER postgres PASSWORD \'your_password\';');
  }
}

// 运行主函数
main().catch(error => {
  log.error('运行测试脚本时发生错误:', error);
  process.exit(1);
});