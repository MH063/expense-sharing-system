/**
 * 数据库密码安全输入工具
 * 支持交互式输入和环境变量获取
 */

const readline = require('readline');
const env = process.env.NODE_ENV || 'development';

/**
 * 创建交互式输入界面
 * @returns {readline.Interface} readline接口实例
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });
}

/**
 * 隐藏密码输入
 * @param {readline.Interface} rl readline接口实例
 * @param {string} prompt 提示信息
 * @returns {Promise<string>} 用户输入的密码
 */
function passwordPrompt(rl, prompt) {
  return new Promise((resolve) => {
    // 保存原始stdout.write方法
    const originalWrite = process.stdout.write;
    
    // 隐藏输入的字符
    process.stdout.write = (string, encoding, fd) => {
      // 只输出换行符和提示信息，不输出密码字符
      if (string === '\n' || string === '\r\n') {
        return originalWrite.call(process.stdout, string, encoding, fd);
      }
      return true;
    };
    
    rl.question(prompt, (password) => {
      // 恢复原始stdout.write方法
      process.stdout.write = originalWrite;
      console.log(); // 添加换行
      resolve(password);
    });
  });
}

/**
 * 获取数据库密码
 * 开发环境：交互式输入
 * 测试环境：从环境变量获取
 * 生产环境：从环境变量获取
 * @returns {Promise<string>} 数据库密码
 */
async function getDatabasePassword() {
  // 如果环境变量中已设置密码，直接使用
  if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '') {
    console.log('✓ 使用环境变量中的数据库密码');
    return process.env.DB_PASSWORD;
  }
  
  // 根据环境决定如何获取密码
  switch (env) {
    case 'development':
      console.log('\n=== 开发环境数据库密码输入 ===');
      const rl = createInterface();
      try {
        const password = await passwordPrompt(rl, '请输入数据库密码: ');
        rl.close();
        if (!password) {
          console.log('错误: 密码不能为空');
          process.exit(1);
        }
        return password;
      } catch (error) {
        console.error('密码输入错误:', error.message);
        process.exit(1);
      }
      
    case 'test':
      console.log('⚠️  测试环境未设置DB_PASSWORD环境变量');
      console.log('请通过以下方式之一设置数据库密码:');
      console.log('1. 设置环境变量: set DB_PASSWORD=your_password');
      console.log('2. 在.env.test文件中添加: DB_PASSWORD=your_password');
      process.exit(1);
      break;
      
    case 'production':
      console.log('⚠️  生产环境未设置DB_PASSWORD环境变量');
      console.log('生产环境必须通过环境变量设置数据库密码');
      process.exit(1);
      break;
      
    default:
      console.log(`⚠️  未知环境: ${env}`);
      console.log('默认使用交互式输入');
      const defaultRl = createInterface();
      try {
        const password = await passwordPrompt(defaultRl, '请输入数据库密码: ');
        defaultRl.close();
        if (!password) {
          console.log('错误: 密码不能为空');
          process.exit(1);
        }
        return password;
      } catch (error) {
        console.error('密码输入错误:', error.message);
        process.exit(1);
      }
  }
}

/**
 * 获取JWT密钥
 * @returns {Promise<string>} JWT密钥
 */
async function getJwtSecret() {
  // 如果环境变量中已设置密钥，直接使用
  if (process.env.JWT_SECRETS && process.env.JWT_SECRETS.trim() !== '') {
    console.log('✓ 使用环境变量中的JWT密钥');
    return process.env.JWT_SECRETS;
  }
  
  // 根据环境决定如何获取密钥
  switch (env) {
    case 'development':
      console.log('\n=== 开发环境JWT密钥输入 ===');
      const rl = createInterface();
      try {
        const secret = await passwordPrompt(rl, '请输入JWT密钥 (留空使用默认密钥): ');
        rl.close();
        return secret || 'development-secret-key-not-for-production';
      } catch (error) {
        console.error('密钥输入错误:', error.message);
        process.exit(1);
      }
      
    case 'test':
      console.log('⚠️  测试环境未设置JWT_SECRETS环境变量');
      console.log('使用默认测试密钥');
      return 'test-secret-key-not-for-production';
      
    case 'production':
      console.log('⚠️  生产环境未设置JWT_SECRETS环境变量');
      console.log('生产环境必须通过环境变量设置JWT密钥');
      process.exit(1);
      break;
      
    default:
      console.log(`⚠️  未知环境: ${env}`);
      console.log('使用默认密钥');
      return 'default-secret-key-not-for-production';
  }
}

module.exports = {
  getDatabasePassword,
  getJwtSecret
};