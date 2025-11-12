const http = require('http');
const fs = require('fs');

// 测试配置
const BASE_URL = 'http://localhost:4000/api';
const TEST_USERS = [
  { username: 'sysadmin', password: 'SysAdmin123!@#', role: '系统管理员' },
  { username: 'admin001', password: 'Admin123!@#', role: '管理员' },
  { username: 'dormleader001', password: 'DormLeader123!@#', role: '寝室长' },
  { username: 'user001', password: 'User123!@#', role: '普通用户' },
  { username: 'payer001', password: 'Payer123!@#', role: '缴费人' }
];

// 测试端点及其预期访问权限
const TEST_ENDPOINTS = [
  { path: '/auth/profile', method: 'GET', description: '获取用户资料', allCanAccess: true },
  { path: '/admin/dashboard', method: 'GET', description: '管理员仪表板', adminOnly: true },
  { path: '/admin/users', method: 'GET', description: '用户管理', adminOnly: true },
  { path: '/admin/roles', method: 'GET', description: '角色管理', adminOnly: true },
  { path: '/admin/permissions', method: 'GET', description: '权限管理', adminOnly: true },
  { path: '/bills', method: 'GET', description: '账单列表', allCanAccess: true },
  { path: '/bills', method: 'POST', description: '创建账单', leaderAndAbove: true },
  { path: '/expenses', method: 'GET', description: '费用列表', allCanAccess: true },
  { path: '/expenses', method: 'POST', description: '创建费用', leaderAndAbove: true },
  { path: '/rooms', method: 'GET', description: '房间列表', allCanAccess: true },
  { path: '/rooms', method: 'POST', description: '创建房间', adminOnly: true },
  { path: '/stats/dashboard', method: 'GET', description: '统计仪表板', allCanAccess: true },
  { path: '/stats/room', method: 'GET', description: '房间统计', leaderAndAbove: true },
  { path: '/stats/user', method: 'GET', description: '用户统计', allCanAccess: true },
  { path: '/payment/transfer', method: 'POST', description: '支付转账', allCanAccess: true },
  { path: '/payment/qr-code', method: 'GET', description: '支付码', allCanAccess: true }
];

// 存储测试结果
const testResults = [];

/**
 * 用户登录获取token
 */
async function loginUser(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username,
      password
    });
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          if (jsonData.success && jsonData.data && jsonData.data.accessToken) {
            resolve(jsonData.data.accessToken);
          } else {
            console.error(`用户 ${username} 登录失败: 响应格式不正确`);
            resolve(null);
          }
        } catch (error) {
          console.error(`用户 ${username} 登录失败: 解析响应数据失败`, error.message);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`用户 ${username} 登录失败:`, error.message);
      resolve(null);
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * 测试API端点访问权限
 */
async function testEndpointAccess(token, endpoint, userRole) {
  return new Promise((resolve) => {
    const path = endpoint.path.startsWith('/') ? `/api${endpoint.path}` : `/api/${endpoint.path}`;
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: endpoint.method,
      headers: {}
    };
    
    // 添加认证令牌
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 如果是POST请求，添加请求体
    if (endpoint.method === 'POST') {
      const postData = JSON.stringify({});
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const success = res.statusCode === 200;
          resolve({
            success,
            status: res.statusCode,
            message: success ? '访问成功' : '访问失败',
            data: data ? JSON.parse(data) : null
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          success: false,
          status: 0,
          message: error.message,
          data: null
        });
      });
      
      req.write(postData);
      req.end();
    } else {
      // GET请求
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const success = res.statusCode === 200;
          resolve({
            success,
            status: res.statusCode,
            message: success ? '访问成功' : '访问失败',
            data: data ? JSON.parse(data) : null
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          success: false,
          status: 0,
          message: error.message,
          data: null
        });
      });
      
      req.end();
    }
  });
}

/**
 * 验证权限是否符合预期
 */
function validatePermission(result, endpoint, userRole) {
  const { success, status } = result;
  
  // 管理员专用端点
  if (endpoint.adminOnly) {
    const isAdmin = ['系统管理员', '管理员'].includes(userRole);
    return {
      expected: isAdmin,
      actual: success,
      correct: isAdmin === success
    };
  }
  
  // 寝室长及以上角色端点
  if (endpoint.leaderAndAbove) {
    const isLeaderOrAbove = ['系统管理员', '管理员', '寝室长'].includes(userRole);
    return {
      expected: isLeaderOrAbove,
      actual: success,
      correct: isLeaderOrAbove === success
    };
  }
  
  // 所有用户可访问的端点
  if (endpoint.allCanAccess) {
    return {
      expected: true,
      actual: success,
      correct: success
    };
  }
  
  // 默认情况
  return {
    expected: false,
    actual: success,
    correct: !success
  };
}

/**
 * 运行权限测试
 */
async function runPermissionTests() {
  console.log('开始权限测试...\n');
  
  for (const user of TEST_USERS) {
    console.log(`\n========== 测试用户: ${user.username} (${user.role}) ==========`);
    
    // 登录获取token
    const token = await loginUser(user.username, user.password);
    if (!token) {
      console.log(`用户 ${user.username} 登录失败，跳过测试`);
      continue;
    }
    
    console.log(`用户 ${user.username} 登录成功`);
    
    // 测试各个端点
    for (const endpoint of TEST_ENDPOINTS) {
      console.log(`\n测试端点: ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
      
      const result = await testEndpointAccess(token, endpoint, user.role);
      const validation = validatePermission(result, endpoint, user.role);
      
      console.log(`结果: ${result.message} (状态码: ${result.status})`);
      console.log(`预期访问: ${validation.expected ? '是' : '否'}`);
      console.log(`实际访问: ${validation.actual ? '是' : '否'}`);
      console.log(`权限正确: ${validation.correct ? '✓' : '✗'}`);
      
      // 保存测试结果
      testResults.push({
        user: user.username,
        role: user.role,
        endpoint: endpoint.path,
        method: endpoint.method,
        description: endpoint.description,
        expected: validation.expected,
        actual: validation.actual,
        correct: validation.correct,
        status: result.status,
        message: result.message
      });
    }
  }
  
  // 生成测试报告
  generateTestReport();
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  console.log('\n\n========== 权限测试报告 ==========');
  
  // 按角色分组统计
  const roleStats = {};
  for (const user of TEST_USERS) {
    roleStats[user.role] = {
      total: 0,
      passed: 0,
      failed: 0
    };
  }
  
  // 按端点分组统计
  const endpointStats = {};
  for (const endpoint of TEST_ENDPOINTS) {
    endpointStats[`${endpoint.method} ${endpoint.path}`] = {
      total: 0,
      passed: 0,
      failed: 0
    };
  }
  
  // 统计测试结果
  for (const result of testResults) {
    // 角色统计
    roleStats[result.role].total++;
    if (result.correct) {
      roleStats[result.role].passed++;
    } else {
      roleStats[result.role].failed++;
    }
    
    // 端点统计
    const endpointKey = `${result.method} ${result.endpoint}`;
    endpointStats[endpointKey].total++;
    if (result.correct) {
      endpointStats[endpointKey].passed++;
    } else {
      endpointStats[endpointKey].failed++;
    }
  }
  
  // 打印角色统计
  console.log('\n--- 按角色统计 ---');
  for (const [role, stats] of Object.entries(roleStats)) {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(2);
    console.log(`${role}: ${stats.passed}/${stats.total} (${passRate}%)`);
  }
  
  // 打印失败的测试
  console.log('\n--- 失败的测试 ---');
  const failedTests = testResults.filter(r => !r.correct);
  if (failedTests.length === 0) {
    console.log('所有测试通过！');
  } else {
    for (const test of failedTests) {
      console.log(`用户: ${test.user} (${test.role})`);
      console.log(`端点: ${test.method} ${test.endpoint} - ${test.description}`);
      console.log(`预期: ${test.expected ? '应允许访问' : '应拒绝访问'}`);
      console.log(`实际: ${test.actual ? '允许访问' : '拒绝访问'} (状态码: ${test.status})`);
      console.log(`---`);
    }
  }
  
  // 保存测试报告到文件
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length,
      passedTests: testResults.filter(r => r.correct).length,
      failedTests: failedTests.length,
      passRate: ((testResults.filter(r => r.correct).length / testResults.length) * 100).toFixed(2)
    },
    roleStats,
    endpointStats,
    failedTests,
    allResults: testResults
  };
  
  fs.writeFileSync(
    'c:\\Users\\MH\\Desktop\\记账系统\\权限测试报告.json',
    JSON.stringify(reportData, null, 2)
  );
  
  console.log('\n测试报告已保存到: 权限测试报告.json');
}

// 运行测试
runPermissionTests().catch(console.error);