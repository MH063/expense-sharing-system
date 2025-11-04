const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 测试配置
const config = {
  serverUrl: 'http://localhost:4000',
  testResults: {
    sqlInjection: { passed: 0, failed: 0, details: [] },
    xss: { passed: 0, failed: 0, details: [] },
    csrf: { passed: 0, failed: 0, details: [] },
    authBypass: { passed: 0, failed: 0, details: [] },
    rateLimiting: { passed: 0, failed: 0, details: [] },
    inputValidation: { passed: 0, failed: 0, details: [] },
    sensitiveDataExposure: { passed: 0, failed: 0, details: [] }
  }
};

// 发送HTTP请求
function sendRequest(options, data = null) {
  return new Promise((resolve) => {
    const isHttps = options.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const req = lib.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message
      });
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// 记录测试结果
function recordResult(category, testName, passed, details) {
  config.testResults[category][passed ? 'passed' : 'failed']++;
  config.testResults[category].details.push({
    test: testName,
    passed,
    details
  });
  
  console.log(`${passed ? '✅' : '❌'} ${testName}: ${details}`);
}

// SQL注入测试
async function testSQLInjection() {
  console.log('\n===== SQL注入测试 =====');
  
  const sqlPayloads = [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "admin'--",
    "admin'/*",
    "' OR 'x'='x",
    "'; DROP TABLE users; --",
    "'; INSERT INTO users VALUES('hacker','password'); --",
    "1' UNION SELECT username, password FROM users --"
  ];
  
  // 测试登录端点
  for (const payload of sqlPayloads) {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const data = JSON.stringify({
      username: payload,
      password: 'password'
    });
    
    const result = await sendRequest(options, data);
    
    // 如果返回200状态码或者返回用户数据，则可能存在SQL注入漏洞
    if (result.statusCode === 200) {
      try {
        const response = JSON.parse(result.data);
        if (response.success && response.data && response.data.token) {
          recordResult('sqlInjection', 'SQL注入测试', false, `可能存在SQL注入漏洞: ${payload}`);
          continue;
        }
      } catch (e) {
        // 解析错误，继续测试
      }
    }
    
    // 如果返回401或400，说明可能正确处理了恶意输入
    if (result.statusCode === 401 || result.statusCode === 400) {
      recordResult('sqlInjection', 'SQL注入测试', true, `正确处理恶意输入: ${payload}`);
    } else {
      recordResult('sqlInjection', 'SQL注入测试', false, `未正确处理恶意输入: ${payload}, 状态码: ${result.statusCode}`);
    }
  }
}

// XSS测试
async function testXSS() {
  console.log('\n===== XSS测试 =====');
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(\'XSS\')">',
    '<svg onload="alert(\'XSS\')">',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload="alert(\'XSS\')">',
    '<input autofocus onfocus="alert(\'XSS\')">',
    '<select onfocus="alert(\'XSS\')" autofocus>',
    '<textarea onfocus="alert(\'XSS\')" autofocus>',
    '<keygen onfocus="alert(\'XSS\')" autofocus>',
    '<video><source onerror="alert(\'XSS\')">',
    '<details open ontoggle="alert(\'XSS\')">',
    '<marquee onstart="alert(\'XSS\')">',
    '"<script>alert("XSS")</script>',
    "'<script>alert('XSS')</script>"
  ];
  
  // 测试注册端点
  for (const payload of xssPayloads) {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const data = JSON.stringify({
      username: payload,
      email: `test${Math.random()}@example.com`,
      password: 'password123'
    });
    
    const result = await sendRequest(options, data);
    
    // 如果返回200状态码，说明可能成功注册了恶意内容
    if (result.statusCode === 200) {
      try {
        const response = JSON.parse(result.data);
        if (response.success) {
          recordResult('xss', 'XSS测试', false, `可能存在XSS漏洞: ${payload}`);
          continue;
        }
      } catch (e) {
        // 解析错误，继续测试
      }
    }
    
    // 如果返回400，说明可能正确处理了恶意输入
    if (result.statusCode === 400) {
      recordResult('xss', 'XSS测试', true, `正确处理恶意输入: ${payload}`);
    } else {
      recordResult('xss', 'XSS测试', false, `未正确处理恶意输入: ${payload}, 状态码: ${result.statusCode}`);
    }
  }
}

// CSRF测试
async function testCSRF() {
  console.log('\n===== CSRF测试 =====');
  
  // 检查是否有CSRF令牌
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'http://evil-site.com'
    }
  };
  
  const data = JSON.stringify({
    username: 'testuser',
    password: 'password'
  });
  
  const result = await sendRequest(options, data);
  
  // 检查是否有CSRF保护
  if (result.statusCode === 403 || result.statusCode === 401) {
    recordResult('csrf', 'CSRF测试', true, '可能存在CSRF保护');
  } else {
    recordResult('csrf', 'CSRF测试', false, '可能不存在CSRF保护');
  }
}

// 认证绕过测试
async function testAuthBypass() {
  console.log('\n===== 认证绕过测试 =====');
  
  // 测试无效token
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/users/profile',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid-token'
    }
  };
  
  const result = await sendRequest(options);
  
  if (result.statusCode === 401) {
    recordResult('authBypass', '无效Token测试', true, '正确拒绝无效Token');
  } else {
    recordResult('authBypass', '无效Token测试', false, `未正确拒绝无效Token, 状态码: ${result.statusCode}`);
  }
  
  // 测试无token
  const options2 = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/users/profile',
    method: 'GET'
  };
  
  const result2 = await sendRequest(options2);
  
  if (result2.statusCode === 401) {
    recordResult('authBypass', '无Token测试', true, '正确拒绝无Token请求');
  } else {
    recordResult('authBypass', '无Token测试', false, `未正确拒绝无Token请求, 状态码: ${result2.statusCode}`);
  }
}

// 限流测试
async function testRateLimiting() {
  console.log('\n===== 限流测试 =====');
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  let blockedCount = 0;
  const requestCount = 20;
  
  for (let i = 0; i < requestCount; i++) {
    const data = JSON.stringify({
      username: `testuser${i}`,
      password: 'wrongpassword'
    });
    
    const result = await sendRequest(options, data);
    
    if (result.statusCode === 429) {
      blockedCount++;
    }
  }
  
  if (blockedCount > 0) {
    recordResult('rateLimiting', '限流测试', true, `正确限流，${blockedCount}/${requestCount} 请求被阻止`);
  } else {
    recordResult('rateLimiting', '限流测试', false, '未正确限流');
  }
}

// 输入验证测试
async function testInputValidation() {
  console.log('\n===== 输入验证测试 =====');
  
  // 测试空用户名
  const options1 = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const data1 = JSON.stringify({
    username: '',
    password: 'password'
  });
  
  const result1 = await sendRequest(options1, data1);
  
  if (result1.statusCode === 400) {
    recordResult('inputValidation', '空用户名测试', true, '正确拒绝空用户名');
  } else {
    recordResult('inputValidation', '空用户名测试', false, `未正确拒绝空用户名, 状态码: ${result1.statusCode}`);
  }
  
  // 测试空密码
  const data2 = JSON.stringify({
    username: 'testuser',
    password: ''
  });
  
  const result2 = await sendRequest(options1, data2);
  
  if (result2.statusCode === 400) {
    recordResult('inputValidation', '空密码测试', true, '正确拒绝空密码');
  } else {
    recordResult('inputValidation', '空密码测试', false, `未正确拒绝空密码, 状态码: ${result2.statusCode}`);
  }
  
  // 测试无效邮箱
  const options3 = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const data3 = JSON.stringify({
    username: 'testuser',
    email: 'invalid-email',
    password: 'password123'
  });
  
  const result3 = await sendRequest(options3, data3);
  
  if (result3.statusCode === 400) {
    recordResult('inputValidation', '无效邮箱测试', true, '正确拒绝无效邮箱');
  } else {
    recordResult('inputValidation', '无效邮箱测试', false, `未正确拒绝无效邮箱, 状态码: ${result3.statusCode}`);
  }
}

// 敏感数据泄露测试
async function testSensitiveDataExposure() {
  console.log('\n===== 敏感数据泄露测试 =====');
  
  // 测试错误信息是否泄露敏感信息
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const data = JSON.stringify({
    username: 'nonexistentuser',
    password: 'wrongpassword'
  });
  
  const result = await sendRequest(options, data);
  
  if (result.statusCode === 401) {
    try {
      const response = JSON.parse(result.data);
      const errorMessage = response.message || '';
      
      // 检查错误信息是否泄露了用户是否存在的信息
      if (errorMessage.includes('用户名') || errorMessage.includes('邮箱') || errorMessage.includes('手机号')) {
        recordResult('sensitiveDataExposure', '错误信息泄露测试', false, '错误信息可能泄露用户存在信息');
      } else {
        recordResult('sensitiveDataExposure', '错误信息泄露测试', true, '错误信息未泄露敏感信息');
      }
    } catch (e) {
      recordResult('sensitiveDataExposure', '错误信息泄露测试', false, '无法解析响应数据');
    }
  } else {
    recordResult('sensitiveDataExposure', '错误信息泄露测试', false, `未正确处理错误请求, 状态码: ${result.statusCode}`);
  }
  
  // 测试响应头是否泄露敏感信息
  const options2 = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/health',
    method: 'GET'
  };
  
  const result2 = await sendRequest(options2);
  
  if (result2.headers) {
    const headers = result2.headers;
    let leakedInfo = false;
    
    // 检查常见的信息泄露
    if (headers.server) {
      recordResult('sensitiveDataExposure', '服务器信息泄露测试', false, `服务器信息泄露: ${headers.server}`);
      leakedInfo = true;
    }
    
    if (headers['x-powered-by']) {
      recordResult('sensitiveDataExposure', '技术栈信息泄露测试', false, `技术栈信息泄露: ${headers['x-powered-by']}`);
      leakedInfo = true;
    }
    
    if (!leakedInfo) {
      recordResult('sensitiveDataExposure', '响应头信息泄露测试', true, '响应头未泄露敏感信息');
    }
  }
}

// 生成测试报告
function generateReport() {
  console.log('\n===== 安全测试报告 =====');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const category in config.testResults) {
    const results = config.testResults[category];
    totalPassed += results.passed;
    totalFailed += results.failed;
    
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`通过: ${results.passed}, 失败: ${results.failed}`);
    
    // 显示失败的测试详情
    if (results.failed > 0) {
      console.log('失败的测试:');
      results.details.filter(detail => !detail.passed).forEach(detail => {
        console.log(`  - ${detail.test}: ${detail.details}`);
      });
    }
  }
  
  console.log(`\n总计: 通过 ${totalPassed}, 失败 ${totalFailed}`);
  console.log(`安全评分: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`);
  
  // 保存报告到文件
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPassed,
      totalFailed,
      score: Math.round((totalPassed / (totalPassed + totalFailed)) * 100)
    },
    results: config.testResults
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'security-test-report.json'),
    JSON.stringify(reportData, null, 2)
  );
  
  console.log('\n详细报告已保存到 security-test-report.json');
}

// 主测试函数
async function runSecurityTests() {
  console.log('开始安全测试...');
  console.log(`服务器地址: ${config.serverUrl}`);
  
  try {
    await testSQLInjection();
    await testXSS();
    await testCSRF();
    await testAuthBypass();
    await testInputValidation();
    await testSensitiveDataExposure();
    await testRateLimiting();
    
    generateReport();
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
runSecurityTests();