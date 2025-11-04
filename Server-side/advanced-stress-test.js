const http = require('http');
const cluster = require('cluster');
const os = require('os');

// 测试配置
const config = {
  serverUrl: 'http://localhost:4000',
  totalRequests: 5000,      // 总请求数
  concurrentRequests: 200,   // 并发请求数
  duration: 60,              // 测试持续时间（秒）
  endpoints: [
    { path: '/api/health', method: 'GET', weight: 0.3 },       // 30% 健康检查
    { path: '/api/auth/login', method: 'POST', weight: 0.5, body: JSON.stringify({ username: 'testuser', password: 'password' }) }, // 50% 登录
    { path: '/api/users/profile', method: 'GET', weight: 0.2, auth: true }  // 20% 获取用户资料
  ]
};

// 全局统计
let globalStats = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  responseTimeSum: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  errors: {},
  statusCodeCounts: {},
  startTime: null,
  endTime: null
};

// 发送单个请求
function sendRequest(endpoint, authToken = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
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
    
    // 添加认证头
    if (endpoint.auth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 400,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      
      resolve({
        statusCode: 0,
        responseTime,
        success: false,
        error: error.message
      });
    });

    if (endpoint.body) {
      req.write(endpoint.body);
    }
    
    req.end();
  });
}

// 更新统计信息
function updateStats(result) {
  globalStats.totalRequests++;
  
  if (result.success) {
    globalStats.successRequests++;
  } else {
    globalStats.failedRequests++;
    
    // 记录错误
    const errorKey = result.error || `HTTP ${result.statusCode}`;
    if (!globalStats.errors[errorKey]) {
      globalStats.errors[errorKey] = 0;
    }
    globalStats.errors[errorKey]++;
  }
  
  // 更新响应时间统计
  globalStats.responseTimeSum += result.responseTime;
  globalStats.minResponseTime = Math.min(globalStats.minResponseTime, result.responseTime);
  globalStats.maxResponseTime = Math.max(globalStats.maxResponseTime, result.responseTime);
  
  // 更新状态码统计
  const statusCode = result.statusCode;
  if (!globalStats.statusCodeCounts[statusCode]) {
    globalStats.statusCodeCounts[statusCode] = 0;
  }
  globalStats.statusCodeCounts[statusCode]++;
}

// 打印进度
function printProgress() {
  const elapsed = (Date.now() - globalStats.startTime) / 1000;
  const rps = globalStats.totalRequests / elapsed;
  const successRate = (globalStats.successRequests / globalStats.totalRequests * 100).toFixed(2);
  
  process.stdout.write(`\r进度: ${globalStats.totalRequests}/${config.totalRequests} | RPS: ${rps.toFixed(2)} | 成功率: ${successRate}% | 响应时间: 平均 ${(globalStats.responseTimeSum / globalStats.totalRequests).toFixed(2)}ms`);
}

// 运行压力测试
async function runStressTest() {
  console.log('开始高并发压力测试...');
  console.log(`服务器地址: ${config.serverUrl}`);
  console.log(`总请求数: ${config.totalRequests}`);
  console.log(`并发请求数: ${config.concurrentRequests}`);
  console.log(`测试持续时间: ${config.duration}秒`);
  console.log('----------------------------------------');
  
  globalStats.startTime = Date.now();
  
  // 获取认证token
  let authToken = null;
  try {
    const loginResult = await sendRequest({
      path: '/api/auth/login',
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password' })
    });
    
    if (loginResult.success) {
      const data = JSON.parse(loginResult.data);
      if (data.success && data.data && data.data.token) {
        authToken = data.data.token;
        console.log('获取认证token成功');
      }
    }
  } catch (e) {
    console.log('获取认证token失败，将跳过需要认证的请求');
  }
  
  // 创建请求队列
  const requestQueue = [];
  for (let i = 0; i < config.totalRequests; i++) {
    // 根据权重选择端点
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedEndpoint = config.endpoints[0];
    
    for (const endpoint of config.endpoints) {
      cumulativeWeight += endpoint.weight;
      if (random <= cumulativeWeight) {
        selectedEndpoint = endpoint;
        break;
      }
    }
    
    requestQueue.push(selectedEndpoint);
  }
  
  // 并发执行请求
  const promises = [];
  let requestIndex = 0;
  
  // 初始并发请求
  for (let i = 0; i < Math.min(config.concurrentRequests, requestQueue.length); i++) {
    promises.push(executeRequest(requestQueue[requestIndex++], authToken));
  }
  
  // 处理请求结果
  const results = await Promise.all(promises);
  results.forEach(updateStats);
  
  // 继续处理剩余请求
  while (requestIndex < requestQueue.length) {
    const batchPromises = [];
    const batchSize = Math.min(config.concurrentRequests, requestQueue.length - requestIndex);
    
    for (let i = 0; i < batchSize; i++) {
      batchPromises.push(executeRequest(requestQueue[requestIndex++], authToken));
    }
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(updateStats);
    
    printProgress();
    
    // 检查是否超时
    if ((Date.now() - globalStats.startTime) / 1000 > config.duration) {
      console.log('\n测试达到最大持续时间，停止测试');
      break;
    }
  }
  
  globalStats.endTime = Date.now();
  
  console.log('\n----------------------------------------');
  printFinalReport();
}

// 执行单个请求
async function executeRequest(endpoint, authToken) {
  try {
    return await sendRequest(endpoint, authToken);
  } catch (error) {
    return {
      statusCode: 0,
      responseTime: 0,
      success: false,
      error: error.message
    };
  }
}

// 打印最终报告
function printFinalReport() {
  const totalTime = (globalStats.endTime - globalStats.startTime) / 1000;
  const avgResponseTime = globalStats.responseTimeSum / globalStats.totalRequests;
  const successRate = (globalStats.successRequests / globalStats.totalRequests * 100).toFixed(2);
  const rps = globalStats.totalRequests / totalTime;
  
  console.log('----------------------------------------');
  console.log('压力测试结果统计:');
  console.log(`总请求数: ${globalStats.totalRequests}`);
  console.log(`成功请求数: ${globalStats.successRequests}`);
  console.log(`失败请求数: ${globalStats.failedRequests}`);
  console.log(`成功率: ${successRate}%`);
  console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`最小响应时间: ${globalStats.minResponseTime}ms`);
  console.log(`最大响应时间: ${globalStats.maxResponseTime}ms`);
  console.log(`每秒请求数: ${rps.toFixed(2)}`);
  console.log(`总测试时间: ${totalTime.toFixed(2)}s`);
  console.log('----------------------------------------');
  
  // 状态码分布
  console.log('状态码分布:');
  for (const statusCode in globalStats.statusCodeCounts) {
    console.log(`  ${statusCode}: ${globalStats.statusCodeCounts[statusCode]} (${(globalStats.statusCodeCounts[statusCode] / globalStats.totalRequests * 100).toFixed(2)}%)`);
  }
  
  // 错误详情
  if (Object.keys(globalStats.errors).length > 0) {
    console.log('----------------------------------------');
    console.log('错误详情:');
    for (const error in globalStats.errors) {
      console.log(`  ${error}: ${globalStats.errors[error]} 次`);
    }
  }
  
  // 性能评估
  console.log('----------------------------------------');
  console.log('性能评估:');
  
  if (parseFloat(successRate) >= 99) {
    console.log('✅ 系统稳定性: 优秀 (成功率 ≥ 99%)');
  } else if (parseFloat(successRate) >= 95) {
    console.log('⚠️  系统稳定性: 良好 (成功率 ≥ 95%)');
  } else if (parseFloat(successRate) >= 90) {
    console.log('❌ 系统稳定性: 一般 (成功率 ≥ 90%)');
  } else {
    console.log('❌ 系统稳定性: 差 (成功率 < 90%)');
  }
  
  if (avgResponseTime <= 100) {
    console.log('✅ 响应时间: 优秀 (平均 ≤ 100ms)');
  } else if (avgResponseTime <= 300) {
    console.log('⚠️  响应时间: 良好 (平均 ≤ 300ms)');
  } else if (avgResponseTime <= 1000) {
    console.log('❌ 响应时间: 一般 (平均 ≤ 1000ms)');
  } else {
    console.log('❌ 响应时间: 差 (平均 > 1000ms)');
  }
  
  if (rps >= 1000) {
    console.log('✅ 吞吐量: 优秀 (≥ 1000 RPS)');
  } else if (rps >= 500) {
    console.log('⚠️  吞吐量: 良好 (≥ 500 RPS)');
  } else if (rps >= 100) {
    console.log('❌ 吞吐量: 一般 (≥ 100 RPS)');
  } else {
    console.log('❌ 吞吐量: 差 (< 100 RPS)');
  }
  
  // 保存测试报告
  const reportData = {
    timestamp: new Date().toISOString(),
    config,
    stats: globalStats,
    performance: {
      successRate: parseFloat(successRate),
      avgResponseTime,
      rps
    }
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    'stress-test-report.json',
    JSON.stringify(reportData, null, 2)
  );
  
  console.log('\n详细压力测试报告已保存到 stress-test-report.json');
}

// 主函数
async function main() {
  if (cluster.isMaster) {
    console.log(`主进程 ${process.pid} 正在运行`);
    
    // 派生工作进程
    const numCPUs = os.cpus().length;
    console.log(`检测到 ${numCPUs} 个CPU核心`);
    
    // 对于压力测试，我们只使用一个进程，以避免过度消耗资源
    runStressTest().catch(console.error);
  } else {
    console.log(`工作进程 ${process.pid} 已启动`);
  }
}

// 运行测试
main().catch(console.error);