/**
 * 数据库表结构创建工具使用示例
 */

const path = require('path');
const DatabaseSchemaCreator = require('./database-schema-creator');

/**
 * 示例1: 使用默认配置创建数据库表结构
 */
async function example1() {
  console.log('示例1: 使用默认配置创建数据库表结构');
  console.log('=====================================');
  
  try {
    // 创建实例，使用默认配置
    const creator = new DatabaseSchemaCreator();
    
    // 执行表结构创建
    const sqlFilePath = path.join(__dirname, '../db/init_postgres_v18.sql');
    const report = await creator.executeSchemaCreation(sqlFilePath);
    
    // 输出执行结果
    console.log('执行结果:', JSON.stringify(report, null, 2));
    
    if (report.success) {
      console.log('数据库表结构创建成功！');
    } else {
      console.log('数据库表结构创建失败！');
    }
  } catch (error) {
    console.error('执行过程中发生错误:', error.message);
  }
  
  console.log('\n');
}

/**
 * 示例2: 使用自定义配置创建数据库表结构
 */
async function example2() {
  console.log('示例2: 使用自定义配置创建数据库表结构');
  console.log('=====================================');
  
  try {
    // 创建实例，自定义配置
    const creator = new DatabaseSchemaCreator({
      dbConfig: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: '123456789',
        database: 'expense_dev'
      },
      logLevel: 'debug',
      logFile: path.join(__dirname, 'custom-schema-creation.log'),
      connectionTimeout: 15000,
      maxRetries: 5
    });
    
    // 执行表结构创建
    const sqlFilePath = path.join(__dirname, '../db/init_postgres_v18.sql');
    const report = await creator.executeSchemaCreation(sqlFilePath);
    
    // 输出执行结果
    console.log('执行结果:', JSON.stringify(report, null, 2));
    
    if (report.success) {
      console.log('数据库表结构创建成功！');
    } else {
      console.log('数据库表结构创建失败！');
    }
  } catch (error) {
    console.error('执行过程中发生错误:', error.message);
  }
  
  console.log('\n');
}

/**
 * 示例3: 仅测试数据库连接
 */
async function example3() {
  console.log('示例3: 仅测试数据库连接');
  console.log('========================');
  
  try {
    // 创建实例
    const creator = new DatabaseSchemaCreator();
    
    // 测试数据库连接
    const isConnected = await creator.testConnection();
    
    if (isConnected) {
      console.log('数据库连接成功！');
    } else {
      console.log('数据库连接失败！');
    }
  } catch (error) {
    console.error('测试连接时发生错误:', error.message);
  }
  
  console.log('\n');
}

/**
 * 示例4: 验证SQL文件
 */
async function example4() {
  console.log('示例4: 验证SQL文件');
  console.log('==================');
  
  try {
    // 创建实例
    const creator = new DatabaseSchemaCreator();
    
    // 验证SQL文件
    const sqlFilePath = path.join(__dirname, '../db/init_postgres_v18.sql');
    const sqlContent = await creator.validateSqlFile(sqlFilePath);
    
    console.log(`SQL文件验证成功！`);
    console.log(`文件大小: ${sqlContent.length} 字符`);
    console.log(`语句数量: ${creator.splitSqlStatements(sqlContent).length}`);
  } catch (error) {
    console.error('验证SQL文件时发生错误:', error.message);
  }
  
  console.log('\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('数据库表结构创建工具使用示例');
  console.log('==============================\n');
  
  // 运行示例
  await example1();
  await example2();
  await example3();
  await example4();
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('执行示例时发生错误:', error);
    process.exit(1);
  });
}

module.exports = {
  example1,
  example2,
  example3,
  example4
};