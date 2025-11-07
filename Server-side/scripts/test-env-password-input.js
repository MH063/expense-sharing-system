// 直接测试环境变量获取
process.env.NODE_ENV = 'test';
process.env.DB_PASSWORD = 'test_password';
process.env.JWT_SECRETS = 'test_jwt_secret';

const { getDatabasePassword, getJwtSecret } = require('../utils/password-input');

async function testEnvPasswordInput() {
  console.log('=== 测试环境变量密码获取 ===\n');
  console.log('当前环境:', process.env.NODE_ENV);
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '已设置' : '未设置');
  console.log('JWT_SECRETS:', process.env.JWT_SECRETS ? '已设置' : '未设置');
  
  console.log('\n1. 测试数据库密码获取:');
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
testEnvPasswordInput().catch(console.error);