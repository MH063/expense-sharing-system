/**
 * 自动化测试启动脚本
 * 用于启动自动化安全扫描和性能测试调度器
 */

const { TestScheduler } = require('./scheduler');

/**
 * 启动函数
 */
function startScheduler() {
  console.log('========================================');
  console.log('  自动化测试调度器');
  console.log('========================================');
  console.log('功能:');
  console.log('- 自动安全扫描: 每天凌晨2点执行');
  console.log('- 自动性能测试: 每周日凌晨3点执行');
  console.log('- 自动生成测试报告');
  console.log('- 自动通知测试结果');
  console.log('========================================');
  console.log('');
  
  const scheduler = new TestScheduler();
  
  // 启动调度器
  scheduler.start();
  
  // 处理进程退出信号
  process.on('SIGINT', () => {
    console.log('\n收到SIGINT信号，正在停止调度器...');
    scheduler.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n收到SIGTERM信号，正在停止调度器...');
    scheduler.stop();
    process.exit(0);
  });
  
  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    scheduler.stop();
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
  });
  
  // 导出调度器实例，以便外部可以手动触发测试
  global.testScheduler = scheduler;
  
  console.log('自动化测试调度器已启动，按Ctrl+C停止');
  console.log('');
  console.log('手动触发测试命令:');
  console.log('- 安全测试: global.testScheduler.triggerSecurityTest()');
  console.log('- 性能测试: global.testScheduler.triggerPerformanceTest()');
}

// 如果直接运行此脚本，则启动调度器
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler };