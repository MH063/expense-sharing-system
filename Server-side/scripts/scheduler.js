/**
 * 自动化测试调度器
 * 设置定时任务，自动执行安全测试和性能测试
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { SecurityScanner } = require('./security-scanner');
const { PerformanceTester } = require('./performance-tester');

// 配置参数
const config = {
  // 调度配置
  scheduler: {
    enabled: true,
    timezone: 'Asia/Shanghai'
  },
  // 安全测试配置
  securityTest: {
    enabled: true,
    schedule: '0 2 * * *', // 每天凌晨2点执行
    maxRetries: 2,
    retryDelay: 5 * 60 * 1000 // 5分钟
  },
  // 性能测试配置
  performanceTest: {
    enabled: true,
    schedule: '0 3 * * 0', // 每周日凌晨3点执行
    maxRetries: 2,
    retryDelay: 5 * 60 * 1000 // 5分钟
  },
  // 通知配置
  notification: {
    enabled: true,
    email: {
      enabled: false, // 需要配置SMTP服务器
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'your-email@example.com',
          pass: 'your-password'
        }
      },
      from: 'your-email@example.com',
      to: 'admin@example.com'
    },
    webhook: {
      enabled: false, // 需要配置webhook URL
      url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    }
  },
  // 日志配置
  logging: {
    enabled: true,
    logDir: path.join(__dirname, 'logs'),
    maxLogFiles: 10,
    maxLogSize: 10 * 1024 * 1024 // 10MB
  }
};

/**
 * 测试调度器类
 */
class TestScheduler {
  constructor() {
    this.tasks = {};
    this.logger = new Logger(config.logging);
  }

  /**
   * 启动调度器
   */
  start() {
    if (!config.scheduler.enabled) {
      this.logger.info('调度器已禁用');
      return;
    }

    this.logger.info('启动自动化测试调度器...');
    
    // 注册安全测试任务
    if (config.securityTest.enabled) {
      this.registerSecurityTestTask();
    }
    
    // 注册性能测试任务
    if (config.performanceTest.enabled) {
      this.registerPerformanceTestTask();
    }
    
    this.logger.info('自动化测试调度器已启动');
  }

  /**
   * 停止调度器
   */
  stop() {
    this.logger.info('停止自动化测试调度器...');
    
    // 停止所有定时任务
    for (const taskName in this.tasks) {
      if (this.tasks[taskName]) {
        this.tasks[taskName].stop();
        this.logger.info(`已停止任务: ${taskName}`);
      }
    }
    
    this.tasks = {};
    this.logger.info('自动化测试调度器已停止');
  }

  /**
   * 注册安全测试任务
   */
  registerSecurityTestTask() {
    const taskName = 'security-test';
    
    this.tasks[taskName] = cron.schedule(config.securityTest.schedule, async () => {
      this.logger.info('开始执行定时安全测试...');
      
      try {
        const result = await this.executeWithRetry(
          this.executeSecurityTest.bind(this),
          config.securityTest.maxRetries,
          config.securityTest.retryDelay,
          '安全测试'
        );
        
        if (result) {
          this.logger.info(`安全测试完成，安全评分: ${result.securityScore}%`);
          
          // 发送通知
          await this.sendNotification('security-test', result);
        }
      } catch (error) {
        this.logger.error(`安全测试失败: ${error.message}`);
        
        // 发送错误通知
        await this.sendErrorNotification('security-test', error);
      }
    }, {
      scheduled: false,
      timezone: config.scheduler.timezone
    });
    
    this.tasks[taskName].start();
    this.logger.info(`已注册安全测试任务，计划: ${config.securityTest.schedule}`);
  }

  /**
   * 注册性能测试任务
   */
  registerPerformanceTestTask() {
    const taskName = 'performance-test';
    
    this.tasks[taskName] = cron.schedule(config.performanceTest.schedule, async () => {
      this.logger.info('开始执行定时性能测试...');
      
      try {
        const result = await this.executeWithRetry(
          this.executePerformanceTest.bind(this),
          config.performanceTest.maxRetries,
          config.performanceTest.retryDelay,
          '性能测试'
        );
        
        if (result) {
          this.logger.info(`性能测试完成，平均响应时间: ${result.summary.averageResponseTime.toFixed(2)}ms`);
          
          // 发送通知
          await this.sendNotification('performance-test', result);
        }
      } catch (error) {
        this.logger.error(`性能测试失败: ${error.message}`);
        
        // 发送错误通知
        await this.sendErrorNotification('performance-test', error);
      }
    }, {
      scheduled: false,
      timezone: config.scheduler.timezone
    });
    
    this.tasks[taskName].start();
    this.logger.info(`已注册性能测试任务，计划: ${config.performanceTest.schedule}`);
  }

  /**
   * 执行安全测试
   */
  async executeSecurityTest() {
    const scanner = new SecurityScanner();
    return await scanner.runFullScan();
  }

  /**
   * 执行性能测试
   */
  async executePerformanceTest() {
    const tester = new PerformanceTester();
    return await tester.runFullTest();
  }

  /**
   * 带重试的执行函数
   */
  async executeWithRetry(fn, maxRetries, retryDelay, taskName) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        this.logger.info(`执行${taskName} (尝试 ${attempt}/${maxRetries + 1})`);
        const result = await fn();
        this.logger.info(`${taskName}执行成功`);
        return result;
      } catch (error) {
        lastError = error;
        this.logger.error(`${taskName}执行失败 (尝试 ${attempt}/${maxRetries + 1}): ${error.message}`);
        
        if (attempt <= maxRetries) {
          this.logger.info(`${retryDelay / 1000}秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 发送测试结果通知
   */
  async sendNotification(testType, result) {
    if (!config.notification.enabled) {
      return;
    }
    
    try {
      // 发送邮件通知
      if (config.notification.email.enabled) {
        await this.sendEmailNotification(testType, result);
      }
      
      // 发送webhook通知
      if (config.notification.webhook.enabled) {
        await this.sendWebhookNotification(testType, result);
      }
    } catch (error) {
      this.logger.error(`发送通知失败: ${error.message}`);
    }
  }

  /**
   * 发送错误通知
   */
  async sendErrorNotification(testType, error) {
    if (!config.notification.enabled) {
      return;
    }
    
    try {
      // 发送邮件通知
      if (config.notification.email.enabled) {
        await this.sendEmailErrorNotification(testType, error);
      }
      
      // 发送webhook通知
      if (config.notification.webhook.enabled) {
        await this.sendWebhookErrorNotification(testType, error);
      }
    } catch (notifyError) {
      this.logger.error(`发送错误通知失败: ${notifyError.message}`);
    }
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(testType, result) {
    // 这里需要实现邮件发送逻辑
    // 可以使用nodemailer库
    this.logger.info(`邮件通知已发送: ${testType}测试完成`);
  }

  /**
   * 发送webhook通知
   */
  async sendWebhookNotification(testType, result) {
    const axios = require('axios');
    
    let message;
    
    if (testType === 'security-test') {
      message = {
        text: `安全测试完成`,
        attachments: [
          {
            color: result.securityScore >= 90 ? 'good' : result.securityScore >= 70 ? 'warning' : 'danger',
            fields: [
              { title: '安全评分', value: `${result.securityScore}%`, short: true },
              { title: '总测试数', value: result.totalTests, short: true },
              { title: '通过测试', value: result.passedTests, short: true },
              { title: '失败测试', value: result.failedTests, short: true },
              { title: '高危漏洞', value: result.vulnerabilities.filter(v => v.severity === 'high').length, short: true },
              { title: '中危漏洞', value: result.vulnerabilities.filter(v => v.severity === 'medium').length, short: true }
            ]
          }
        ]
      };
    } else if (testType === 'performance-test') {
      message = {
        text: `性能测试完成`,
        attachments: [
          {
            color: result.summary.performanceRating === 'excellent' ? 'good' : 
                   result.summary.performanceRating === 'good' ? 'good' : 
                   result.summary.performanceRating === 'acceptable' ? 'warning' : 'danger',
            fields: [
              { title: '性能评级', value: result.summary.performanceRating, short: true },
              { title: '平均响应时间', value: `${result.summary.averageResponseTime.toFixed(2)}ms`, short: true },
              { title: '总请求数', value: result.summary.totalRequests, short: true },
              { title: '错误率', value: `${result.summary.errorRate}%`, short: true },
              { title: 'P95响应时间', value: `${result.summary.p95ResponseTime.toFixed(2)}ms`, short: true },
              { title: '请求/秒', value: result.summary.requestsPerSecond, short: true }
            ]
          }
        ]
      };
    }
    
    await axios.post(config.notification.webhook.url, message);
    this.logger.info(`Webhook通知已发送: ${testType}测试完成`);
  }

  /**
   * 发送邮件错误通知
   */
  async sendEmailErrorNotification(testType, error) {
    // 这里需要实现邮件发送逻辑
    this.logger.info(`邮件错误通知已发送: ${testType}测试失败`);
  }

  /**
   * 发送webhook错误通知
   */
  async sendWebhookErrorNotification(testType, error) {
    const axios = require('axios');
    
    const message = {
      text: `测试失败`,
      attachments: [
        {
          color: 'danger',
          fields: [
            { title: '测试类型', value: testType, short: true },
            { title: '错误信息', value: error.message, short: false }
          ]
        }
      ]
    };
    
    await axios.post(config.notification.webhook.url, message);
    this.logger.info(`Webhook错误通知已发送: ${testType}测试失败`);
  }

  /**
   * 手动触发安全测试
   */
  async triggerSecurityTest() {
    this.logger.info('手动触发安全测试...');
    
    try {
      const result = await this.executeWithRetry(
        this.executeSecurityTest.bind(this),
        0, // 手动触发不重试
        0,
        '安全测试'
      );
      
      this.logger.info(`安全测试完成，安全评分: ${result.securityScore}%`);
      return result;
    } catch (error) {
      this.logger.error(`安全测试失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 手动触发性能测试
   */
  async triggerPerformanceTest() {
    this.logger.info('手动触发性能测试...');
    
    try {
      const result = await this.executeWithRetry(
        this.executePerformanceTest.bind(this),
        0, // 手动触发不重试
        0,
        '性能测试'
      );
      
      this.logger.info(`性能测试完成，平均响应时间: ${result.summary.averageResponseTime.toFixed(2)}ms`);
      return result;
    } catch (error) {
      this.logger.error(`性能测试失败: ${error.message}`);
      throw error;
    }
  }
}

/**
 * 日志记录器类
 */
class Logger {
  constructor(config) {
    this.config = config;
    this.logDir = config.logDir;
    
    // 确保日志目录存在
    if (this.config.enabled && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 记录信息日志
   */
  info(message) {
    this.log('INFO', message);
  }

  /**
   * 记录错误日志
   */
  error(message) {
    this.log('ERROR', message);
  }

  /**
   * 记录日志
   */
  log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    // 输出到控制台
    console.log(logMessage);
    
    // 写入文件
    if (this.config.enabled) {
      this.writeToFile(logMessage);
    }
  }

  /**
   * 写入日志文件
   */
  writeToFile(message) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `scheduler-${today}.log`);
    
    try {
      fs.appendFileSync(logFile, message + '\n');
      
      // 检查日志文件大小，如果超过限制则轮转
      const stats = fs.statSync(logFile);
      if (stats.size > this.config.maxLogSize) {
        this.rotateLogFile(logFile);
      }
    } catch (error) {
      console.error(`写入日志文件失败: ${error.message}`);
    }
  }

  /**
   * 轮转日志文件
   */
  rotateLogFile(logFile) {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const rotatedFile = logFile.replace('.log', `-${timestamp}.log`);
      fs.renameSync(logFile, rotatedFile);
      
      // 清理旧日志文件
      this.cleanOldLogFiles();
    } catch (error) {
      console.error(`轮转日志文件失败: ${error.message}`);
    }
  }

  /**
   * 清理旧日志文件
   */
  cleanOldLogFiles() {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('scheduler-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          mtime: fs.statSync(path.join(this.logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // 保留最近的N个文件
      if (files.length > this.config.maxLogFiles) {
        const filesToDelete = files.slice(this.config.maxLogFiles);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log(`已删除旧日志文件: ${file.name}`);
        }
      }
    } catch (error) {
      console.error(`清理旧日志文件失败: ${error.message}`);
    }
  }
}

/**
 * 主函数
 */
function main() {
  const scheduler = new TestScheduler();
  
  // 启动调度器
  scheduler.start();
  
  // 处理进程退出信号
  process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在停止调度器...');
    scheduler.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在停止调度器...');
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
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { TestScheduler, Logger, config };