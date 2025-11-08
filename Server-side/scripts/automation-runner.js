/**
 * 自动化测试系统启动脚本
 * 整合安全测试、性能测试、报告生成和通知系统
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 配置参数
const config = {
  // 脚本路径 - 只包含实际存在的脚本
  scripts: {
    scheduler: path.join(__dirname, 'scheduler.js'),
    runPaymentOptimizationTests: path.join(__dirname, 'run-payment-optimization-tests.js')
  },
  // 输出目录
  outputDir: path.join(__dirname, 'logs'),
  // 选项
  options: {
    generateReport: true,
    sendNotification: false,
    keepRunning: false
  }
};

/**
 * 确保输出目录存在
 */
function ensureOutputDirectory() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
}

/**
 * 运行脚本
 */
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`运行脚本: ${scriptPath}`);
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const logFileName = `${path.basename(scriptPath, '.js')}-${timestamp}.log`;
    const logFilePath = path.join(config.outputDir, logFileName);
    
    // 创建日志文件
    const logStream = fs.createWriteStream(logFilePath);
    
    const child = spawn('node', [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // 将输出写入日志文件和控制台
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    
    child.stdout.on('data', (data) => {
      console.log(`[${scriptPath}] ${data.toString().trim()}`);
    });
    
    child.stderr.on('data', (data) => {
      console.error(`[${scriptPath}] ${data.toString().trim()}`);
    });
    
    child.on('close', (code) => {
      console.log(`脚本 ${scriptPath} 执行完成，退出码: ${code}`);
      logStream.end();
      
      if (code === 0) {
        resolve({ success: true, code, logFile: logFilePath });
      } else {
        resolve({ success: false, code, logFile: logFilePath });
      }
    });
    
    child.on('error', (error) => {
      console.error(`运行脚本 ${scriptPath} 时出错:`, error);
      logStream.end();
      reject(error);
    });
  });
}

/**
 * 运行完整测试套件
 */
async function runFullTestSuite() {
  console.log('开始运行完整测试套件...');
  ensureOutputDirectory();
  
  const results = {
    paymentOptimization: null,
    summary: {
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      overallSuccess: false
    }
  };
  
  try {
    // 1. 运行支付流程优化测试
    console.log('步骤 1/1: 运行支付流程优化测试...');
    results.paymentOptimization = await runScript(config.scripts.runPaymentOptimizationTests);
    
    // 计算总时间
    results.summary.endTime = new Date().toISOString();
    results.summary.duration = new Date(results.summary.endTime) - new Date(results.summary.startTime);
    
    // 确定整体成功状态
    results.summary.overallSuccess = results.paymentOptimization.success;
    
    // 打印摘要
    printSummary(results);
    
    return results;
  } catch (error) {
    console.error('运行完整测试套件失败:', error);
    throw error;
  }
}

/**
 * 打印测试摘要
 */
function printSummary(results) {
  console.log('\n' + '='.repeat(50));
  console.log('测试套件执行摘要');
  console.log('='.repeat(50));
  
  console.log(`开始时间: ${results.summary.startTime}`);
  console.log(`结束时间: ${results.summary.endTime}`);
  console.log(`总耗时: ${(results.summary.duration / 1000).toFixed(2)} 秒`);
  
  console.log('\n测试结果:');
  console.log(`支付流程优化测试: ${results.paymentOptimization.success ? '✅ 成功' : '❌ 失败'} (退出码: ${results.paymentOptimization.code})`);
  if (results.paymentOptimization.logFile) {
    console.log(`  日志文件: ${results.paymentOptimization.logFile}`);
  }
  
  console.log(`\n整体状态: ${results.summary.overallSuccess ? '✅ 成功' : '❌ 失败'}`);
  console.log('='.repeat(50) + '\n');
}

/**
 * 启动调度器
 */
function startScheduler() {
  console.log('启动测试调度器...');
  
  const child = spawn('node', [config.scripts.scheduler], {
    stdio: 'inherit'
  });
  
  child.on('close', (code) => {
    console.log(`调度器退出，退出码: ${code}`);
  });
  
  child.on('error', (error) => {
    console.error('启动调度器失败:', error);
  });
  
  return child;
}

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { ...config.options };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--no-report':
        options.generateReport = false;
        break;
      case '--notify':
        options.sendNotification = true;
        break;
      case '--scheduler':
        options.keepRunning = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
自动化测试系统启动脚本

用法:
  node automation-runner.js [选项]

选项:
  --no-report    不生成综合报告
  --notify       发送通知 (需要配置通知设置)
  --scheduler    启动调度器并保持运行
  --help         显示此帮助信息

示例:
  node automation-runner.js                # 运行一次完整测试套件
  node automation-runner.js --no-report    # 运行测试但不生成报告
  node automation-runner.js --scheduler    # 启动调度器
  `);
}

/**
 * 主函数
 */
async function main() {
  try {
    const options = parseArgs();
    Object.assign(config.options, options);
    
    console.log('自动化测试系统启动');
    
    if (config.options.keepRunning) {
      // 启动调度器
      const scheduler = startScheduler();
      
      // 处理进程信号
      process.on('SIGINT', () => {
        console.log('\n收到SIGINT信号，正在关闭调度器...');
        scheduler.kill('SIGINT');
      });
      
      process.on('SIGTERM', () => {
        console.log('\n收到SIGTERM信号，正在关闭调度器...');
        scheduler.kill('SIGTERM');
      });
      
      // 等待调度器进程
      scheduler.on('close', (code) => {
        console.log(`调度器已关闭，退出码: ${code}`);
        process.exit(code);
      });
    } else {
      // 运行一次完整测试套件
      const results = await runFullTestSuite();
      
      // 根据结果设置退出码
      process.exit(results.summary.overallSuccess ? 0 : 1);
    }
  } catch (error) {
    console.error('自动化测试系统启动失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { runFullTestSuite, startScheduler, config };