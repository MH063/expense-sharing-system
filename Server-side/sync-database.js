/**
 * 数据库同步脚本
 * 使用Sequelize同步数据库模型
 */

const sequelize = require('./config/database');
const models = require('./models');

async function syncDatabase() {
  try {
    console.log('开始同步数据库模型...');
    
    // 同步所有模型
    await sequelize.sync({ alter: true });
    
    console.log('数据库模型同步成功');
    return true;
  } catch (error) {
    console.error('数据库模型同步失败:', error);
    return false;
  }
}

// 如果直接运行此脚本，则执行同步操作
if (require.main === module) {
  syncDatabase()
    .then((success) => {
      if (success) {
        console.log('数据库同步完成');
        process.exit(0);
      } else {
        console.log('数据库同步失败');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('数据库同步过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = { syncDatabase };