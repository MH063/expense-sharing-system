const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 解析命令行参数
const args = process.argv.slice(2);
const logLevel = args.find(arg => arg.startsWith('--log-level='))?.split('=')[1] || 
                 args.includes('--log-level') && args[args.indexOf('--log-level') + 1] || 
                 'info';
const username = args.find(arg => arg.startsWith('--username='))?.split('=')[1] || 
                 args.includes('--username') && args[args.indexOf('--username') + 1] || 
                 'postgres';
const newPassword = args.find(arg => arg.startsWith('--password='))?.split('=')[1] || 
                    args.includes('--password') && args[args.indexOf('--password') + 1] || 
                    null;

// 设置日志级别
process.env.LOG_LEVEL = logLevel;

// 日志函数
const log = {
  debug: (msg, data) => logLevel === 'debug' && console.log(`[DEBUG] ${msg}`, data || ''),
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

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

// 获取数据库配置
function getDatabaseConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres' // 使用postgres数据库进行连接
  };
}

// 提示用户输入密码
function promptPassword(question) {
  return new Promise((resolve) => {
    // 隐藏输入的密码
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    process.stdout.write(question);
    
    stdin.on('data', function(char) {
      char = char.toString();
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeAllListeners('data');
          console.log();
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          console.log();
          process.exit(0);
          break;
        case '\u007F': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

// 重置数据库用户密码
async function resetPassword(config, newPassword) {
  log.info('正在重置数据库用户密码...');
  
  // 使用postgres数据库进行连接
  const adminConfig = {
    ...config,
    database: 'postgres'
  };
  
  const pool = new Pool(adminConfig);
  
  try {
    const client = await pool.connect();
    log.info('数据库连接成功');
    
    // 检查用户是否存在
    const userCheckResult = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [username]);
    
    if (userCheckResult.rows.length === 0) {
      log.warn(`用户 ${username} 不存在，将创建新用户`);
      
      // 创建新用户
      await client.query(`CREATE USER ${username} WITH PASSWORD '${newPassword}'`);
      await client.query(`ALTER USER ${username} CREATEDB`);
      log.info(`用户 ${username} 创建成功`);
    } else {
      // 重置现有用户密码
      await client.query(`ALTER USER ${username} WITH PASSWORD '${newPassword}'`);
      log.info(`用户 ${username} 密码重置成功`);
    }
    
    // 授予必要的权限
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${config.database} TO ${username}`);
    log.info(`用户 ${username} 已被授予数据库 ${config.database} 的所有权限`);
    
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    log.error('重置密码失败:', error.message);
    log.error('错误代码:', error.code);
    log.error('错误详情:', error.detail || '无详情');
    
    await pool.end();
    return false;
  }
}

// 测试新密码
async function testNewPassword(config, newPassword) {
  log.info('使用新密码测试数据库连接...');
  
  const testConfig = {
    ...config,
    password: newPassword
  };
  
  const pool = new Pool(testConfig);
  
  try {
    const client = await pool.connect();
    log.info('新密码验证成功');
    
    // 获取当前用户信息
    const userResult = await client.query('SELECT current_user');
    log.info(`当前用户: ${userResult.rows[0].current_user}`);
    
    // 获取当前数据库
    const dbResult = await client.query('SELECT current_database()');
    log.info(`当前数据库: ${dbResult.rows[0].current_database}`);
    
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    log.error('新密码验证失败:', error.message);
    log.error('错误代码:', error.code);
    log.error('错误详情:', error.detail || '无详情');
    
    await pool.end();
    return false;
  }
}

// 更新.env文件中的密码
function updateEnvFile(newPassword) {
  const envPath = path.resolve(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    log.warn(`未找到.env文件: ${envPath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(envPath, 'utf8');
    
    // 替换DB_PASSWORD
    const passwordRegex = /^DB_PASSWORD=.*$/m;
    if (passwordRegex.test(content)) {
      content = content.replace(passwordRegex, `DB_PASSWORD=${newPassword}`);
      fs.writeFileSync(envPath, content);
      log.info(`已更新.env文件中的DB_PASSWORD`);
      return true;
    } else {
      log.warn(`未在.env文件中找到DB_PASSWORD配置`);
      return false;
    }
  } catch (error) {
    log.error(`更新.env文件失败:`, error.message);
    return false;
  }
}

// 主函数
async function main() {
  log.info('=== 数据库用户密码重置工具 ===');
  log.info(`日志级别: ${logLevel}`);
  log.info(`目标用户: ${username}`);
  
  // 1. 加载环境变量
  loadEnvironmentVariables();
  
  // 2. 获取数据库配置
  const config = getDatabaseConfig();
  log.info('数据库配置:');
  log.info(`  主机: ${config.host}`);
  log.info(`  端口: ${config.port}`);
  log.info(`  用户: ${config.user}`);
  log.info(`  数据库: ${config.database}`);
  
  // 3. 获取新密码
  let password = newPassword;
  
  if (!password) {
    console.log('\n请输入新密码:');
    password = await promptPassword('新密码: ');
    
    if (!password || password.length < 8) {
      log.error('密码长度至少为8个字符');
      rl.close();
      return;
    }
    
    console.log('\n请确认新密码:');
    const confirmPassword = await promptPassword('确认密码: ');
    
    if (password !== confirmPassword) {
      log.error('两次输入的密码不一致');
      rl.close();
      return;
    }
  } else {
    log.info(`使用命令行提供的密码: ${'*'.repeat(password.length)}`);
    if (password.length < 8) {
      log.error('密码长度至少为8个字符');
      rl.close();
      return;
    }
  }
  
  // 4. 重置密码
  const resetSuccess = await resetPassword(config, password);
  
  if (!resetSuccess) {
    log.error('密码重置失败');
    rl.close();
    return;
  }
  
  // 5. 测试新密码
  const testSuccess = await testNewPassword(config, password);
  
  if (!testSuccess) {
    log.error('新密码验证失败');
    rl.close();
    return;
  }
  
  // 6. 更新.env文件
  const updateSuccess = updateEnvFile(password);
  
  if (updateSuccess) {
    log.info('已更新.env文件中的密码');
  } else {
    log.warn('未能自动更新.env文件，请手动更新');
  }
  
  log.info('\n✅ 密码重置完成!');
  log.info('\n注意事项:');
  log.info('1. 新密码已设置并验证成功');
  log.info('2. 请确保应用程序使用新密码连接数据库');
  log.info('3. 请妥善保管新密码，不要将其提交到版本控制系统');
  log.info('4. 如果更新了.env文件，请重启应用程序以使更改生效');
  
  rl.close();
}

// 运行主函数
main().catch(error => {
  log.error('运行密码重置工具时发生错误:', error);
  rl.close();
  process.exit(1);
});