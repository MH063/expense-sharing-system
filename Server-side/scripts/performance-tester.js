/**
 * 自动化性能测试脚本
 * 监控系统性能指标，生成性能报告
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { performance } = require('perf_hooks');
const os = require('os');

// 配置参数
const config = {
  // 测试目标配置
  target: {
    baseUrl: 'http://localhost:4000',
    apiEndpoints: [
      { path: '/api/users/login', method: 'POST', data: { username: 'test', password: 'test' } },
      { path: '/api/transactions', method: 'GET' },
      { path: '/api/categories', method: 'GET' },
      { path: '/api/accounts', method: 'GET' }
    ]
  },
  // 性能测试选项
  testOptions: {
    // 负载测试配置
    loadTest: {
      enabled: true,
      concurrentUsers: 10,
      requestsPerUser: 20,
      rampUpTime: 5 // 秒
    },
    // 响应时间阈值配置 (毫秒)
    responseTimeThresholds: {
      excellent: 200,
      good: 500,
      acceptable: 1000,
      poor: 2000
    },
    // 系统资源监控
    systemMonitoring: {
      enabled: true,
      interval: 1000 // 毫秒
    }
  },
  // 报告配置
  report: {
    outputDir: path.join(__dirname, 'performance-reports'),
    fileName: `performance-test-${new Date().toISOString().split('T')[0]}.json`,
    summaryFileName: 'performance-test-summary.json'
  }
};

/**
 * 性能测试器类
 */
class PerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testDuration: 0,
      endpoints: [],
      systemMetrics: {
        before: {},
        after: {},
        during: []
      },
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0
      }
    };
    this.startTime = Date.now();
    this.systemMonitorInterval = null;
  }

  /**
   * 执行完整性能测试
   */
  async runFullTest() {
    console.log('开始执行自动化性能测试...');
    
    try {
      // 确保报告目录存在
      this.ensureReportDirectory();
      
      // 记录测试前的系统指标
      if (config.testOptions.systemMonitoring.enabled) {
        this.results.systemMetrics.before = this.getSystemMetrics();
        console.log('测试前系统指标已记录');
      }
      
      // 开始系统监控
      if (config.testOptions.systemMonitoring.enabled) {
        this.startSystemMonitoring();
      }
      
      // 执行负载测试
      if (config.testOptions.loadTest.enabled) {
        await this.runLoadTest();
      }
      
      // 执行单端点性能测试
      await this.runSingleEndpointTests();
      
      // 停止系统监控
      if (config.testOptions.systemMonitoring.enabled) {
        this.stopSystemMonitoring();
        this.results.systemMetrics.after = this.getSystemMetrics();
        console.log('测试后系统指标已记录');
      }
      
      // 计算测试持续时间
      this.results.testDuration = Date.now() - this.startTime;
      
      // 计算汇总统计
      this.calculateSummaryStats();
      
      // 生成报告
      await this.generateReport();
      
      // 更新摘要报告
      await this.updateSummaryReport();
      
      console.log(`性能测试完成！总请求: ${this.results.summary.totalRequests}, 成功: ${this.results.summary.successfulRequests}, 失败: ${this.results.summary.failedRequests}`);
      console.log(`平均响应时间: ${this.results.summary.averageResponseTime.toFixed(2)}ms, 请求/秒: ${this.results.summary.requestsPerSecond.toFixed(2)}`);
      
      return this.results;
    } catch (error) {
      console.error('性能测试过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 确保报告目录存在
   */
  ensureReportDirectory() {
    if (!fs.existsSync(config.report.outputDir)) {
      fs.mkdirSync(config.report.outputDir, { recursive: true });
    }
  }

  /**
   * 获取系统指标
   */
  getSystemMetrics() {
    return {
      timestamp: Date.now(),
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: os.loadavg()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      process: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }

  /**
   * 开始系统监控
   */
  startSystemMonitoring() {
    this.systemMonitorInterval = setInterval(() => {
      const metrics = this.getSystemMetrics();
      this.results.systemMetrics.during.push(metrics);
    }, config.testOptions.systemMonitoring.interval);
  }

  /**
   * 停止系统监控
   */
  stopSystemMonitoring() {
    if (this.systemMonitorInterval) {
      clearInterval(this.systemMonitorInterval);
      this.systemMonitorInterval = null;
    }
  }

  /**
   * 执行负载测试
   */
  async runLoadTest() {
    console.log(`执行负载测试: ${config.testOptions.loadTest.concurrentUsers} 个并发用户, 每用户 ${config.testOptions.loadTest.requestsPerUser} 个请求`);
    
    const { concurrentUsers, requestsPerUser, rampUpTime } = config.testOptions.loadTest;
    const rampUpDelay = rampUpTime * 1000 / concurrentUsers; // 每个用户的启动延迟
    
    // 创建用户任务数组
    const userTasks = [];
    
    for (let userId = 0; userId < concurrentUsers; userId++) {
      const userTask = this.createUserTask(userId, requestsPerUser, rampUpDelay * userId);
      userTasks.push(userTask);
    }
    
    // 并发执行所有用户任务
    const userResults = await Promise.allSettled(userTasks);
    
    // 处理结果
    const endpointResults = {};
    
    for (const result of userResults) {
      if (result.status === 'fulfilled') {
        for (const endpointResult of result.value) {
          const { endpoint, responseTime, status, error } = endpointResult;
          
          if (!endpointResults[endpoint]) {
            endpointResults[endpoint] = {
              path: endpoint,
              method: 'POST',
              requests: 0,
              successfulRequests: 0,
              failedRequests: 0,
              responseTimes: [],
              errors: []
            };
          }
          
          endpointResults[endpoint].requests++;
          
          if (status >= 200 && status < 400) {
            endpointResults[endpoint].successfulRequests++;
          } else {
            endpointResults[endpoint].failedRequests++;
            if (error) {
              endpointResults[endpoint].errors.push(error);
            }
          }
          
          endpointResults[endpoint].responseTimes.push(responseTime);
        }
      }
    }
    
    // 将结果添加到总结果中
    for (const endpoint of Object.keys(endpointResults)) {
      this.results.endpoints.push(endpointResults[endpoint]);
    }
  }

  /**
   * 创建用户任务
   */
  async createUserTask(userId, requestsPerUser, delay) {
    // 等待启动延迟
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const results = [];
    
    for (let i = 0; i < requestsPerUser; i++) {
      // 随机选择一个端点
      const endpointConfig = config.target.apiEndpoints[Math.floor(Math.random() * config.target.apiEndpoints.length)];
      
      const result = await this.makeRequest(endpointConfig);
      results.push({
        endpoint: endpointConfig.path,
        ...result
      });
      
      // 随机延迟 100-500ms
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    }
    
    return results;
  }

  /**
   * 执行单端点性能测试
   */
  async runSingleEndpointTests() {
    console.log('执行单端点性能测试...');
    
    for (const endpointConfig of config.target.apiEndpoints) {
      const endpointResult = {
        path: endpointConfig.path,
        method: endpointConfig.method,
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errors: []
      };
      
      // 对每个端点执行10次请求
      for (let i = 0; i < 10; i++) {
        const result = await this.makeRequest(endpointConfig);
        
        endpointResult.requests++;
        
        if (result.status >= 200 && result.status < 400) {
          endpointResult.successfulRequests++;
        } else {
          endpointResult.failedRequests++;
          if (result.error) {
            endpointResult.errors.push(result.error);
          }
        }
        
        endpointResult.responseTimes.push(result.responseTime);
        
        // 请求间隔
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // 计算端点统计信息
      this.calculateEndpointStats(endpointResult);
      
      // 检查是否已存在该端点的结果（来自负载测试）
      const existingEndpointIndex = this.results.endpoints.findIndex(
        ep => ep.path === endpointResult.path
      );
      
      if (existingEndpointIndex >= 0) {
        // 合并结果
        const existingEndpoint = this.results.endpoints[existingEndpointIndex];
        existingEndpoint.requests += endpointResult.requests;
        existingEndpoint.successfulRequests += endpointResult.successfulRequests;
        existingEndpoint.failedRequests += endpointResult.failedRequests;
        existingEndpoint.responseTimes.push(...endpointResult.responseTimes);
        existingEndpoint.errors.push(...endpointResult.errors);
        
        // 重新计算统计信息
        this.calculateEndpointStats(existingEndpoint);
      } else {
        // 添加新结果
        this.results.endpoints.push(endpointResult);
      }
    }
  }

  /**
   * 发送HTTP请求并测量响应时间
   */
  async makeRequest(endpointConfig) {
    const startTime = performance.now();
    
    try {
      let response;
      
      if (endpointConfig.method === 'GET') {
        response = await axios.get(`${config.target.baseUrl}${endpointConfig.path}`, {
          timeout: 10000
        });
      } else if (endpointConfig.method === 'POST') {
        response = await axios.post(
          `${config.target.baseUrl}${endpointConfig.path}`, 
          endpointConfig.data || {}, 
          { timeout: 10000 }
        );
      }
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      return {
        responseTime,
        status: response.status,
        error: null
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      return {
        responseTime,
        status: error.response ? error.response.status : 0,
        error: error.message
      };
    }
  }

  /**
   * 计算端点统计信息
   */
  calculateEndpointStats(endpointResult) {
    if (endpointResult.responseTimes.length === 0) {
      return;
    }
    
    // 排序响应时间以便计算百分位数
    const sortedTimes = [...endpointResult.responseTimes].sort((a, b) => a - b);
    
    endpointResult.averageResponseTime = this.average(endpointResult.responseTimes);
    endpointResult.minResponseTime = Math.min(...endpointResult.responseTimes);
    endpointResult.maxResponseTime = Math.max(...endpointResult.responseTimes);
    endpointResult.medianResponseTime = this.median(sortedTimes);
    endpointResult.p95ResponseTime = this.percentile(sortedTimes, 95);
    endpointResult.p99ResponseTime = this.percentile(sortedTimes, 99);
    endpointResult.errorRate = (endpointResult.failedRequests / endpointResult.requests * 100).toFixed(2);
    endpointResult.requestsPerSecond = (endpointResult.requests / (this.results.testDuration / 1000)).toFixed(2);
    
    // 评估性能等级
    endpointResult.performanceRating = this.evaluatePerformance(endpointResult.averageResponseTime);
  }

  /**
   * 计算汇总统计
   */
  calculateSummaryStats() {
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let allResponseTimes = [];
    
    for (const endpoint of this.results.endpoints) {
      totalRequests += endpoint.requests;
      successfulRequests += endpoint.successfulRequests;
      failedRequests += endpoint.failedRequests;
      allResponseTimes.push(...endpoint.responseTimes);
    }
    
    this.results.summary.totalRequests = totalRequests;
    this.results.summary.successfulRequests = successfulRequests;
    this.results.summary.failedRequests = failedRequests;
    this.results.summary.errorRate = totalRequests > 0 ? (failedRequests / totalRequests * 100).toFixed(2) : 0;
    
    if (allResponseTimes.length > 0) {
      this.results.summary.averageResponseTime = this.average(allResponseTimes);
      this.results.summary.minResponseTime = Math.min(...allResponseTimes);
      this.results.summary.maxResponseTime = Math.max(...allResponseTimes);
      
      const sortedTimes = [...allResponseTimes].sort((a, b) => a - b);
      this.results.summary.medianResponseTime = this.median(sortedTimes);
      this.results.summary.p95ResponseTime = this.percentile(sortedTimes, 95);
      this.results.summary.p99ResponseTime = this.percentile(sortedTimes, 99);
    }
    
    // 计算每秒请求数
    const testDurationSeconds = this.results.testDuration / 1000;
    this.results.summary.requestsPerSecond = testDurationSeconds > 0 ? 
      (totalRequests / testDurationSeconds).toFixed(2) : 0;
    
    // 评估整体性能等级
    this.results.summary.performanceRating = this.evaluatePerformance(this.results.summary.averageResponseTime);
  }

  /**
   * 评估性能等级
   */
  evaluatePerformance(avgResponseTime) {
    const thresholds = config.testOptions.responseTimeThresholds;
    
    if (avgResponseTime <= thresholds.excellent) {
      return 'excellent';
    } else if (avgResponseTime <= thresholds.good) {
      return 'good';
    } else if (avgResponseTime <= thresholds.acceptable) {
      return 'acceptable';
    } else if (avgResponseTime <= thresholds.poor) {
      return 'poor';
    } else {
      return 'unacceptable';
    }
  }

  /**
   * 计算平均值
   */
  average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * 计算中位数
   */
  median(sortedValues) {
    if (sortedValues.length === 0) return 0;
    
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0 ?
      (sortedValues[mid - 1] + sortedValues[mid]) / 2 :
      sortedValues[mid];
  }

  /**
   * 计算百分位数
   */
  percentile(sortedValues, p) {
    if (sortedValues.length === 0) return 0;
    
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * 生成报告
   */
  async generateReport() {
    const reportPath = path.join(config.report.outputDir, config.report.fileName);
    
    const report = {
      ...this.results,
      summary: {
        ...this.results.summary,
        testDate: new Date().toISOString(),
        recommendations: this.generateRecommendations()
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`性能测试报告已生成: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * 生成性能优化建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    // 检查平均响应时间
    if (this.results.summary.averageResponseTime > config.testOptions.responseTimeThresholds.poor) {
      recommendations.push({
        priority: 'high',
        issue: '平均响应时间过长',
        currentValue: `${this.results.summary.averageResponseTime.toFixed(2)}ms`,
        recommendedValue: `<${config.testOptions.responseTimeThresholds.poor}ms`,
        recommendation: '优化数据库查询、添加缓存、优化代码逻辑或增加服务器资源'
      });
    } else if (this.results.summary.averageResponseTime > config.testOptions.responseTimeThresholds.acceptable) {
      recommendations.push({
        priority: 'medium',
        issue: '平均响应时间较长',
        currentValue: `${this.results.summary.averageResponseTime.toFixed(2)}ms`,
        recommendedValue: `<${config.testOptions.responseTimeThresholds.acceptable}ms`,
        recommendation: '考虑优化慢查询、实施缓存策略或优化代码性能'
      });
    }
    
    // 检查错误率
    if (parseFloat(this.results.summary.errorRate) > 5) {
      recommendations.push({
        priority: 'high',
        issue: '错误率过高',
        currentValue: `${this.results.summary.errorRate}%`,
        recommendedValue: '<1%',
        recommendation: '检查错误日志，修复导致请求失败的bug，提高系统稳定性'
      });
    } else if (parseFloat(this.results.summary.errorRate) > 1) {
      recommendations.push({
        priority: 'medium',
        issue: '错误率偏高',
        currentValue: `${this.results.summary.errorRate}%`,
        recommendedValue: '<1%',
        recommendation: '分析错误模式，改进错误处理机制'
      });
    }
    
    // 检查P99响应时间
    if (this.results.summary.p99ResponseTime > config.testOptions.responseTimeThresholds.poor * 2) {
      recommendations.push({
        priority: 'medium',
        issue: 'P99响应时间过长',
        currentValue: `${this.results.summary.p99ResponseTime.toFixed(2)}ms`,
        recommendedValue: `<${config.testOptions.responseTimeThresholds.poor * 2}ms`,
        recommendation: '检查异常请求处理，优化极端情况下的性能'
      });
    }
    
    // 检查系统资源使用情况
    if (this.results.systemMetrics.during.length > 0) {
      const maxMemoryUsage = Math.max(...this.results.systemMetrics.during.map(
        m => parseFloat(m.memory.usagePercent)
      ));
      
      if (maxMemoryUsage > 90) {
        recommendations.push({
          priority: 'high',
          issue: '内存使用率过高',
          currentValue: `${maxMemoryUsage.toFixed(2)}%`,
          recommendedValue: '<80%',
          recommendation: '优化内存使用，检查内存泄漏，考虑增加服务器内存'
        });
      } else if (maxMemoryUsage > 80) {
        recommendations.push({
          priority: 'medium',
          issue: '内存使用率偏高',
          currentValue: `${maxMemoryUsage.toFixed(2)}%`,
          recommendedValue: '<80%',
          recommendation: '监控内存使用趋势，优化内存密集型操作'
        });
      }
    }
    
    // 检查慢端点
    const slowEndpoints = this.results.endpoints.filter(
      ep => ep.averageResponseTime > config.testOptions.responseTimeThresholds.poor
    );
    
    if (slowEndpoints.length > 0) {
      recommendations.push({
        priority: 'medium',
        issue: '存在响应时间较慢的端点',
        details: slowEndpoints.map(ep => ({
          endpoint: ep.path,
          averageResponseTime: `${ep.averageResponseTime.toFixed(2)}ms`
        })),
        recommendation: '针对慢端点进行专项优化，检查数据库查询和业务逻辑'
      });
    }
    
    // 检查高错误率端点
    const highErrorEndpoints = this.results.endpoints.filter(
      ep => parseFloat(ep.errorRate) > 5
    );
    
    if (highErrorEndpoints.length > 0) {
      recommendations.push({
        priority: 'high',
        issue: '存在错误率较高的端点',
        details: highErrorEndpoints.map(ep => ({
          endpoint: ep.path,
          errorRate: `${ep.errorRate}%`,
          errors: ep.errors.slice(0, 5) // 只显示前5个错误
        })),
        recommendation: '优先修复高错误率端点的问题，提高系统稳定性'
      });
    }
    
    return recommendations;
  }

  /**
   * 更新摘要报告
   */
  async updateSummaryReport() {
    const summaryPath = path.join(config.report.outputDir, config.report.summaryFileName);
    
    let summaryData = {
      history: []
    };
    
    // 如果摘要文件存在，读取现有数据
    if (fs.existsSync(summaryPath)) {
      try {
        const existingData = fs.readFileSync(summaryPath, 'utf8');
        summaryData = JSON.parse(existingData);
      } catch (error) {
        console.error('读取摘要报告失败:', error);
      }
    }
    
    // 添加新的测试结果
    summaryData.history.push({
      date: new Date().toISOString(),
      totalRequests: this.results.summary.totalRequests,
      successfulRequests: this.results.summary.successfulRequests,
      failedRequests: this.results.summary.failedRequests,
      averageResponseTime: this.results.summary.averageResponseTime,
      requestsPerSecond: this.results.summary.requestsPerSecond,
      errorRate: this.results.summary.errorRate,
      performanceRating: this.results.summary.performanceRating
    });
    
    // 只保留最近30次测试的历史记录
    if (summaryData.history.length > 30) {
      summaryData.history = summaryData.history.slice(-30);
    }
    
    // 计算趋势
    if (summaryData.history.length > 1) {
      const current = summaryData.history[summaryData.history.length - 1];
      const previous = summaryData.history[summaryData.history.length - 2];
      
      summaryData.trend = {
        averageResponseTime: current.averageResponseTime - previous.averageResponseTime,
        requestsPerSecond: current.requestsPerSecond - previous.requestsPerSecond,
        errorRate: parseFloat(current.errorRate) - parseFloat(previous.errorRate)
      };
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
    console.log(`性能测试摘要报告已更新: ${summaryPath}`);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const tester = new PerformanceTester();
    await tester.runFullTest();
    process.exit(0);
  } catch (error) {
    console.error('性能测试失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { PerformanceTester, config };