const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

// 可能的PostgreSQL安装路径
const possiblePostgresPaths = [
  'C:\\Program Files\\PostgreSQL',
  'C:\\Program Files (x86)\\PostgreSQL',
  'C:\\PostgreSQL',
  'D:\\Program Files\\PostgreSQL',
  'D:\\Program Files (x86)\\PostgreSQL',
  'D:\\PostgreSQL'
];

// 查找PostgreSQL安装路径
async function findPostgresInstallation() {
  log.info('查找PostgreSQL安装路径...');
  
  for (const basePath of possiblePostgresPaths) {
    try {
      if (fs.existsSync(basePath)) {
        log.info(`找到PostgreSQL基础路径: ${basePath}`);
        
        // 获取版本列表
        const versions = fs.readdirSync(basePath)
          .filter(dir => /^\d+(\.\d+)*$/.test(dir))
          .sort((a, b) => {
            // 按版本号降序排序，获取最新版本
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
              const aPart = aParts[i] || 0;
              const bPart = bParts[i] || 0;
              if (aPart !== bPart) return bPart - aPart;
            }
            return 0;
          });
        
        if (versions.length > 0) {
          const latestVersion = versions[0];
          const dataPath = path.join(basePath, latestVersion, 'data');
          
          if (fs.existsSync(dataPath)) {
            log.info(`找到PostgreSQL数据目录: ${dataPath}`);
            return dataPath;
          }
        }
      }
    } catch (error) {
      log.debug(`检查路径 ${basePath} 时出错: ${error.message}`);
    }
  }
  
  // 尝试通过注册表查找
  return new Promise((resolve) => {
    exec('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\PostgreSQL\\Installations" /s /v BaseDirectory', (error, stdout) => {
      if (error) {
        log.warn('通过注册表查找PostgreSQL失败');
        resolve(null);
        return;
      }
      
      const matches = stdout.match(/BaseDirectory\s+REG_SZ\s+(.+)/g);
      if (matches && matches.length > 0) {
        const paths = matches.map(match => match.split('REG_SZ')[1].trim());
        log.info('通过注册表找到PostgreSQL安装路径:', paths);
        
        // 查找最新版本的数据目录
        for (const installPath of paths) {
          const dataPath = path.join(installPath, 'data');
          if (fs.existsSync(dataPath)) {
            log.info(`找到PostgreSQL数据目录: ${dataPath}`);
            resolve(dataPath);
            return;
          }
        }
      }
      
      resolve(null);
    });
  });
}

// 检查pg_hba.conf文件
function checkPgHbaConf(dataPath) {
  const pgHbaPath = path.join(dataPath, 'pg_hba.conf');
  
  if (!fs.existsSync(pgHbaPath)) {
    log.error(`未找到pg_hba.conf文件: ${pgHbaPath}`);
    return null;
  }
  
  log.info(`找到pg_hba.conf文件: ${pgHbaPath}`);
  
  try {
    const content = fs.readFileSync(pgHbaPath, 'utf8');
    const lines = content.split('\n');
    
    log.info('pg_hba.conf内容:');
    
    // 过滤掉注释和空行，只显示有效配置
    const validLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });
    
    if (validLines.length === 0) {
      log.warn('未找到有效配置行');
    } else {
      validLines.forEach((line, index) => {
        log.info(`  ${index + 1}. ${line}`);
      });
    }
    
    // 检查本地连接配置
    const localConnectionLines = validLines.filter(line => {
      const parts = line.split(/\s+/);
      return parts[0] === 'local' || (parts[0] === 'host' && parts[3] === '127.0.0.1/32') || (parts[0] === 'host' && parts[3] === '::1/128');
    });
    
    if (localConnectionLines.length > 0) {
      log.info('\n本地连接配置:');
      localConnectionLines.forEach((line, index) => {
        const parts = line.split(/\s+/);
        const type = parts[0];
        const database = parts[1];
        const user = parts[2];
        const address = parts[3];
        const method = parts[4];
        
        log.info(`  ${index + 1}. ${type} ${database} ${user} ${address} ${method}`);
        
        // 检查认证方法
        if (method === 'md5' || method === 'scram-sha-256') {
          log.info(`    ✅ 使用密码认证 (${method})`);
        } else if (method === 'trust') {
          log.warn(`    ⚠️ 使用信任认证 (无密码)`);
        } else if (method === 'peer') {
          log.info(`    ℹ️ 使用对等认证 (操作系统用户)`);
        } else {
          log.info(`    ℹ️ 使用认证方法: ${method}`);
        }
      });
    } else {
      log.warn('\n未找到本地连接配置');
    }
    
    return { path: pgHbaPath, content, validLines };
  } catch (error) {
    log.error(`读取pg_hba.conf文件失败: ${error.message}`);
    return null;
  }
}

// 检查postgresql.conf文件
function checkPostgresqlConf(dataPath) {
  const postgresqlConfPath = path.join(dataPath, 'postgresql.conf');
  
  if (!fs.existsSync(postgresqlConfPath)) {
    log.warn(`未找到postgresql.conf文件: ${postgresqlConfPath}`);
    return null;
  }
  
  log.info(`找到postgresql.conf文件: ${postgresqlConfPath}`);
  
  try {
    const content = fs.readFileSync(postgresqlConfPath, 'utf8');
    
    // 检查监听地址配置
    const listenAddressesMatch = content.match(/^#?listen_addresses\s*=\s*'(.+)'/m);
    if (listenAddressesMatch) {
      const listenAddresses = listenAddressesMatch[1];
      log.info(`监听地址配置: listen_addresses = '${listenAddresses}'`);
      
      if (listenAddresses === 'localhost' || listenAddresses === '127.0.0.1') {
        log.info('  ✅ 仅监听本地连接');
      } else if (listenAddresses === '*') {
        log.warn('  ⚠️ 监听所有地址，可能存在安全风险');
      } else {
        log.info(`  ℹ️ 监听指定地址: ${listenAddresses}`);
      }
    }
    
    // 检查端口配置
    const portMatch = content.match(/^#?port\s*=\s*(\d+)/m);
    if (portMatch) {
      const port = portMatch[1];
      log.info(`端口配置: port = ${port}`);
    }
    
    return { path: postgresqlConfPath, content };
  } catch (error) {
    log.error(`读取postgresql.conf文件失败: ${error.message}`);
    return null;
  }
}

// 主函数
async function main() {
  log.info('=== PostgreSQL配置检查 ===');
  log.info(`日志级别: ${logLevel}`);
  
  // 1. 查找PostgreSQL安装路径
  const dataPath = await findPostgresInstallation();
  
  if (!dataPath) {
    log.error('未找到PostgreSQL安装路径，请确认PostgreSQL已正确安装');
    log.info('可能的原因:');
    log.info('1. PostgreSQL未安装');
    log.info('2. PostgreSQL安装路径不在常见位置');
    log.info('3. 权限不足，无法访问PostgreSQL安装目录');
    return;
  }
  
  // 2. 检查pg_hba.conf文件
  const pgHbaConf = checkPgHbaConf(dataPath);
  
  // 3. 检查postgresql.conf文件
  const postgresqlConf = checkPostgresqlConf(dataPath);
  
  // 4. 提供配置建议
  log.info('\n=== 配置建议 ===');
  
  if (pgHbaConf) {
    log.info('pg_hba.conf配置建议:');
    log.info('1. 对于本地连接，推荐使用md5或scram-sha-256认证方法');
    log.info('2. 避免使用trust认证方法，除非在开发环境且确保安全');
    log.info('3. 确保配置文件中的用户名与数据库用户名匹配');
    
    // 检查是否有密码认证配置
    const hasPasswordAuth = pgHbaConf.validLines.some(line => {
      const parts = line.split(/\s+/);
      return parts[4] === 'md5' || parts[4] === 'scram-sha-256';
    });
    
    if (!hasPasswordAuth) {
      log.warn('未找到密码认证配置，可能无法使用密码连接数据库');
      log.info('建议添加以下配置到pg_hba.conf:');
      log.info('  # IPv4 local connections:');
      log.info('  host    all             all             127.0.0.1/32            md5');
      log.info('  # IPv6 local connections:');
      log.info('  host    all             all             ::1/128                 md5');
    }
  }
  
  if (postgresqlConf) {
    log.info('\npostgresql.conf配置建议:');
    log.info('1. 确保listen_addresses包含localhost或127.0.0.1');
    log.info('2. 确认端口配置与应用配置一致');
  }
  
  log.info('\n=== 重置数据库用户密码 ===');
  log.info('如果需要重置数据库用户密码，可以使用以下SQL命令:');
  log.info("ALTER USER postgres PASSWORD 'your_new_password';");
  log.info('或者使用psql命令行工具:');
  log.info("psql -U postgres -c \"ALTER USER postgres PASSWORD 'your_new_password';\"");
  
  log.info('\n⚠️ 修改配置文件后需要重启PostgreSQL服务');
  log.info('可以通过Windows服务管理器或以下命令重启:');
  log.info('net stop postgresql-x64-18');
  log.info('net start postgresql-x64-18');
}

// 运行主函数
main().catch(error => {
  log.error('运行配置检查脚本时发生错误:', error);
  process.exit(1);
});