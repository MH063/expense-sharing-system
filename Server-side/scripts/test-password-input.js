// 测试密码输入工具
const { getDatabasePassword, getJwtSecret } = require('../utils/password-input');

async function testPasswordInput() {
  console.log('=== 测试密码输入工具 ===\n');
  
  // 测试数据库密码获取
  console.log('1. 测试数据库密码获取:');
  try {
    const password = await getDatabasePassword();
    console.log(`获取到的密码: ${password ? '已获取 (长度: ' + password.length + ')' : '未获取'}`);
  } catch (error) {
    console.error('获取密码时出错:', error.message);
  }
  
  console.log('\n2. 测试JWT密钥获取:');
  try {
    const jwtSecret = await getJwtSecret();
    console.log(`获取到的JWT密钥: ${jwtSecret ? '已获取 (长度: ' + jwtSecret.length + ')' : '未获取'}`);
  } catch (error) {
    console.error('获取JWT密钥时出错:', error.message);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testPasswordInput().catch(console.error);