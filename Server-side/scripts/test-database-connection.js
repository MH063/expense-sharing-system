// 测试数据库连接
const { createSequelizeInstance } = require('../config/database');

async function testDatabaseConnection() {
  console.log('=== 测试数据库连接 ===\n');
  
  try {
    console.log('正在创建数据库实例...');
    const sequelize = await createSequelizeInstance();
    
    console.log('正在测试数据库连接...');
    await sequelize.authenticate();
    
    console.log('✓ 数据库连接成功!');
    
    // 关闭连接
    await sequelize.close();
    console.log('✓ 数据库连接已关闭');
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testDatabaseConnection().catch(console.error);