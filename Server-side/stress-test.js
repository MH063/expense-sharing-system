const http = require('http');
const { performance } = require('perf_hooks');

// 测试配置
const config = {
  serverUrl: 'http://localhost:4000',
  concurrentRequests: 100,  // 并发请求数
  totalRequests: 1000,      // 总请求数
  testEndpoints: [
    { path: '/health', method: 'GET', body: null },
    { path: '/api/auth/login', method: 'POST', body: JSON.stringify({ username: 'testuser', password: '123456' }) },
  ]
};

// 存储结果
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  responseTimes: [],
  errors: []
};

// 发送单个请求
function sendRequest(endpoint) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': endpoint.body ? Buffer.byteLength(endpoint.body) : 0
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.totalRequests++;
        results.responseTimes.push(responseTime);
        results.totalTime += responseTime;
        
        if (responseTime < results.minResponseTime) {
          results.minResponseTime = responseTime;
        }
        
        if (responseTime > results.maxResponseTime) {
          results.maxResponseTime = responseTime;
        }
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          results.successfulRequests++;
        } else {
          results.failedRequests++;
          try {
            const errorData = JSON.parse(data);
            results.errors.push({
              endpoint: endpoint.path,
              statusCode: res.statusCode,
              message: errorData.message || data
            });
          } catch (e) {
            results.errors.push({
              endpoint: endpoint.path,
              statusCode: res.statusCode,
              message: data
            });
          }
        }
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      results.totalRequests++;
      results.responseTimes.push(responseTime);
      results.totalTime += responseTime;
      results.failedRequests++;
      results.errors.push({
        endpoint: endpoint.path,
        error: error.message
      });
      
      resolve({
        error: error.message,
        responseTime,
        success: false
      });
    });

    if (endpoint.body) {
      req.write(endpoint.body);
    }
    
    req.end();
  });
}

// 并发发送请求
async function sendConcurrentRequests(endpoint, count) {
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(sendRequest(endpoint));
  }
  
  return Promise.all(promises);
}

// 计算统计数据
function calculateStats() {
  const avgResponseTime = results.totalTime / results.totalRequests;
  
  // 计算百分位数
  const sortedTimes = results.responseTimes.sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  return {
    totalRequests: results.totalRequests,
    successfulRequests: results.successfulRequests,
    failedRequests: results.failedRequests,
    successRate: (results.successfulRequests / results.totalRequests * 100).toFixed(2) + '%',
    avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
    minResponseTime: results.minResponseTime.toFixed(2) + 'ms',
    maxResponseTime: results.maxResponseTime.toFixed(2) + 'ms',
    p50: p50.toFixed(2) + 'ms',
    p90: p90.toFixed(2) + 'ms',
    p95: p95.toFixed(2) + 'ms',
    p99: p99.toFixed(2) + 'ms',
    requestsPerSecond: (results.totalRequests / (results.totalTime / 1000)).toFixed(2),
    errors: results.errors.slice(0, 10) // 只显示前10个错误
  };
}

// 主测试函数
async function runStressTest() {
  console.log('开始压力测试...');
  console.log(`服务器地址: ${config.serverUrl}`);
  console.log(`总请求数: ${config.totalRequests}`);
  console.log(`并发请求数: ${config.concurrentRequests}`);
  console.log('----------------------------------------');
  
  const overallStartTime = performance.now();
  
  // 对每个端点进行测试
  for (const endpoint of config.testEndpoints) {
    console.log(`测试端点: ${endpoint.method} ${endpoint.path}`);
    
    const endpointStartTime = performance.now();
    const batches = Math.ceil(config.totalRequests / config.concurrentRequests);
    
    for (let i = 0; i < batches; i++) {
      const requestsInBatch = Math.min(
        config.concurrentRequests,
        config.totalRequests - i * config.concurrentRequests
      );
      
      await sendConcurrentRequests(endpoint, requestsInBatch);
      
      // 显示进度
      const progress = ((i + 1) / batches * 100).toFixed(1);
      process.stdout.write(`\r进度: ${progress}%`);
    }
    
    const endpointEndTime = performance.now();
    const endpointTime = endpointEndTime - endpointStartTime;
    
    console.log(`\r完成! 端点测试耗时: ${endpointTime.toFixed(2)}ms`);
    console.log('----------------------------------------');
  }
  
  const overallEndTime = performance.now();
  const overallTime = overallEndTime - overallStartTime;
  
  console.log(`总测试时间: ${overallTime.toFixed(2)}ms`);
  console.log('----------------------------------------');
  
  // 显示统计结果
  const stats = calculateStats();
  console.log('测试结果统计:');
  console.log(`总请求数: ${stats.totalRequests}`);
  console.log(`成功请求数: ${stats.successfulRequests}`);
  console.log(`失败请求数: ${stats.failedRequests}`);
  console.log(`成功率: ${stats.successRate}`);
  console.log(`平均响应时间: ${stats.avgResponseTime}`);
  console.log(`最小响应时间: ${stats.minResponseTime}`);
  console.log(`最大响应时间: ${stats.maxResponseTime}`);
  console.log(`50%请求响应时间: ${stats.p50}`);
  console.log(`90%请求响应时间: ${stats.p90}`);
  console.log(`95%请求响应时间: ${stats.p95}`);
  console.log(`99%请求响应时间: ${stats.p99}`);
  console.log(`每秒请求数: ${stats.requestsPerSecond}`);
  
  if (stats.errors.length > 0) {
    console.log('----------------------------------------');
    console.log('错误详情 (前10个):');
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.endpoint}: ${error.statusCode} - ${error.message}`);
    });
  }
}

// 运行测试
runStressTest().catch(console.error);