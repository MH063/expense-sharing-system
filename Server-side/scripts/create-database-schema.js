#!/usr/bin/env node

/**
 * 数据库表结构创建工具 - 命令行接口
 */

const path = require('path');
const DatabaseSchemaCreator = require('./database-schema-creator');

/**
 * 打印使用说明
 */
function printUsage() {
  console.log(`
数据库表结构创建工具

用法:
  node create-database-schema.js [选项] <SQL文件路径>

选项:
  --host <主机地址>        数据库主机地址 (默认: localhost)
  --port <端口号>          数据库端口号 (默认: 5432)
  --user <用户名>          数据库用户名 (默认: postgres)
  --password <密码>        数据库密码 (默认: 123456789)
  --database <数据库名>    数据库名称 (默认: expense_dev)
  --log-level <日志级别>    日志级别 (error, warn, info, debug, 默认: info)
  --log-file <日志文件>     日志文件路径 (默认: ./database-schema-creator.log)
  --timeout <毫秒>         连接超时时间 (默认: 10000)
  --max-retries <次数>      最大重试次数 (默认: 3)
  --help                   显示此帮助信息

示例:
  node create-database-schema.js ../db/init_postgres_v18.sql
  node create-database-schema.js --host localhost --port 5432 --user postgres --password mypassword --database mydb ../db/init_postgres_v18.sql
  node create-database-schema.js --log-level debug ../db/init_postgres_v18.sql
`);
}

/**
 * 解析命令行参数
 * @param {Array<string>} args 命令行参数数组
 * @returns {Object} 解析后的参数对象
 */
function parseArgs(args) {
  const options = {
    dbConfig: {},
    logLevel: 'info',
    logFile: path.join(process.cwd(), 'database-schema-creator.log'),
    connectionTimeout: 10000,
    maxRetries: 3,
    sqlFilePath: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--host':
        options.dbConfig.host = args[++i];
        break;
      case '--port':
        options.dbConfig.port = parseInt(args[++i], 10);
        break;
      case '--user':
        options.dbConfig.user = args[++i];
        break;
      case '--password':
        options.dbConfig.password = args[++i];
        break;
      case '--database':
        options.dbConfig.database = args[++i];
        break;
      case '--log-level':
        options.logLevel = args[++i];
        break;
      case '--log-file':
        options.logFile = args[++i];
        break;
      case '--timeout':
        options.connectionTimeout = parseInt(args[++i], 10);
        break;
      case '--max-retries':
        options.maxRetries = parseInt(args[++i], 10);
        break;
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--') && !options.sqlFilePath) {
          options.sqlFilePath = arg;
        }
        break;
    }
  }
  
  return options;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const options = parseArgs(process.argv.slice(2));
    
    // 检查是否提供了SQL文件路径
    if (!options.sqlFilePath) {
      console.error('错误: 请提供SQL文件路径');
      printUsage();
      process.exit(1);
    }
    
    console.log('数据库表结构创建工具');
    console.log('========================');
    console.log(`SQL文件: ${options.sqlFilePath}`);
    console.log(`数据库: ${options.dbConfig.host || 'localhost'}:${options.dbConfig.port || 5432}/${options.dbConfig.database || 'expense_dev'}`);
    console.log(`日志级别: ${options.logLevel}`);
    console.log(`日志文件: ${options.logFile}`);
    console.log('');
    
    // 创建数据库表结构创建器实例
    const creator = new DatabaseSchemaCreator(options);
    
    // 执行表结构创建
    const report = await creator.executeSchemaCreation(options.sqlFilePath);
    
    // 输出执行结果
    console.log('');
    console.log('执行结果');
    console.log('========');
    console.log(`状态: ${report.success ? '成功' : '失败'}`);
    console.log(`执行时间: ${report.duration.formatted}`);
    console.log(`创建表数量: ${report.tablesCreated}`);
    console.log(`验证表数量: ${report.tablesVerified}`);
    
    if (report.warnings.length > 0) {
      console.log('');
      console.log('警告:');
      report.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}`);
      });
    }
    
    if (report.errors.length > 0) {
      console.log('');
      console.log('错误:');
      report.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    }
    
    console.log('');
    
    if (report.success) {
      console.log('数据库表结构创建成功完成！');
      process.exit(0);
    } else {
      console.log('数据库表结构创建失败！');
      process.exit(1);
    }
  } catch (error) {
    console.error('执行过程中发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, printUsage };