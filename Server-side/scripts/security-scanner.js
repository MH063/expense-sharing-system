/**
 * 自动化安全扫描脚本
 * 定期检测系统安全漏洞，生成安全报告
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const crypto = require('crypto');

// 配置参数
const config = {
  // 扫描目标配置
  target: {
    baseUrl: 'http://localhost:4000',
    apiEndpoints: [
      '/api/users/login',
      '/api/users/register',
      '/api/transactions',
      '/api/categories',
      '/api/accounts'
    ]
  },
  // 扫描选项
  scanOptions: {
    enableSqlInjection: true,
    enableXss: true,
    enableCsrf: true,
    enableAuthBypass: true,
    enableRateLimitTest: true,
    enableInputValidation: true,
    enableDataExposure: true,
    enableSecurityHeaders: true
  },
  // 报告配置
  report: {
    outputDir: path.join(__dirname, 'security-reports'),
    fileName: `security-scan-${new Date().toISOString().split('T')[0]}.json`,
    summaryFileName: 'security-scan-summary.json'
  }
};

/**
 * 安全扫描器类
 */
class SecurityScanner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      scanDuration: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      vulnerabilities: [],
      testResults: []
    };
    this.startTime = Date.now();
  }

  /**
   * 执行完整安全扫描
   */
  async runFullScan() {
    console.log('开始执行自动化安全扫描...');
    
    try {
      // 确保报告目录存在
      this.ensureReportDirectory();
      
      // 执行各项安全测试
      if (config.scanOptions.enableSqlInjection) {
        await this.testSqlInjection();
      }
      
      if (config.scanOptions.enableXss) {
        await this.testXss();
      }
      
      if (config.scanOptions.enableCsrf) {
        await this.testCsrf();
      }
      
      if (config.scanOptions.enableAuthBypass) {
        await this.testAuthenticationBypass();
      }
      
      if (config.scanOptions.enableRateLimitTest) {
        await this.testRateLimit();
      }
      
      if (config.scanOptions.enableInputValidation) {
        await this.testInputValidation();
      }
      
      if (config.scanOptions.enableDataExposure) {
        await this.testSensitiveDataExposure();
      }
      
      if (config.scanOptions.enableSecurityHeaders) {
        await this.testSecurityHeaders();
      }
      
      // 计算扫描持续时间
      this.results.scanDuration = Date.now() - this.startTime;
      
      // 计算安全评分
      this.calculateSecurityScore();
      
      // 生成报告
      await this.generateReport();
      
      // 更新摘要报告
      await this.updateSummaryReport();
      
      console.log(`安全扫描完成！总测试: ${this.results.totalTests}, 通过: ${this.results.passedTests}, 失败: ${this.results.failedTests}`);
      console.log(`安全评分: ${this.results.securityScore}%`);
      
      return this.results;
    } catch (error) {
      console.error('安全扫描过程中发生错误:', error);
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
   * SQL注入测试
   */
  async testSqlInjection() {
    console.log('执行SQL注入测试...');
    
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --"
    ];
    
    for (const endpoint of config.target.apiEndpoints) {
      for (const payload of sqlInjectionPayloads) {
        const testResult = await this.executeTest(
          'SQL注入测试',
          async () => {
            try {
              const response = await axios.post(`${config.target.baseUrl}${endpoint}`, {
                username: payload,
                password: 'test'
              }, { timeout: 5000 });
              
              // 检查响应中是否包含数据库错误信息
              const containsDbError = response.data && 
                (typeof response.data === 'string' && 
                 (response.data.includes('SQL') || 
                  response.data.includes('mysql') || 
                  response.data.includes('syntax error')));
              
              return {
                passed: !containsDbError,
                status: response.status,
                message: containsDbError ? '可能存在SQL注入漏洞' : '未检测到SQL注入漏洞'
              };
            } catch (error) {
              // 4xx或5xx错误是预期的，不是漏洞
              if (error.response && (error.response.status >= 400 && error.response.status < 500)) {
                return {
                  passed: true,
                  status: error.response.status,
                  message: '正确处理了恶意输入'
                };
              }
              
              // 其他错误可能是服务器问题
              return {
                passed: false,
                status: error.response ? error.response.status : 0,
                message: `测试过程中发生错误: ${error.message}`
              };
            }
          },
          { endpoint, payload }
        );
        
        this.results.testResults.push(testResult);
      }
    }
  }

  /**
   * XSS测试
   */
  async testXss() {
    console.log('执行XSS测试...');
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>'
    ];
    
    for (const endpoint of config.target.apiEndpoints) {
      for (const payload of xssPayloads) {
        const testResult = await this.executeTest(
          'XSS测试',
          async () => {
            try {
              const response = await axios.post(`${config.target.baseUrl}${endpoint}`, {
                username: payload,
                password: 'test'
              }, { timeout: 5000 });
              
              // 检查响应中是否包含未转义的脚本标签
              const containsUnescapedScript = response.data && 
                typeof response.data === 'string' && 
                (response.data.includes('<script>') || 
                 response.data.includes('javascript:') || 
                 response.data.includes('onerror='));
              
              return {
                passed: !containsUnescapedScript,
                status: response.status,
                message: containsUnescapedScript ? '可能存在XSS漏洞' : '未检测到XSS漏洞'
              };
            } catch (error) {
              // 4xx错误是预期的
              if (error.response && error.response.status >= 400 && error.response.status < 500) {
                return {
                  passed: true,
                  status: error.response.status,
                  message: '正确处理了恶意输入'
                };
              }
              
              return {
                passed: false,
                status: error.response ? error.response.status : 0,
                message: `测试过程中发生错误: ${error.message}`
              };
            }
          },
          { endpoint, payload }
        );
        
        this.results.testResults.push(testResult);
      }
    }
  }

  /**
   * CSRF测试
   */
  async testCsrf() {
    console.log('执行CSRF测试...');
    
    // 检查是否有CSRF保护机制
    const testResult = await this.executeTest(
      'CSRF保护测试',
      async () => {
        try {
          // 首先获取登录页面，检查是否有CSRF令牌
          const loginResponse = await axios.get(`${config.target.baseUrl}/login`, { timeout: 5000 });
          
          // 检查响应头或响应体中是否有CSRF令牌
          const hasCsrfToken = loginResponse.headers['x-csrf-token'] || 
            (loginResponse.data && 
             (typeof loginResponse.data === 'string' && 
              (loginResponse.data.includes('csrf') || 
               loginResponse.data.includes('token'))));
          
          return {
            passed: hasCsrfToken,
            status: loginResponse.status,
            message: hasCsrfToken ? '检测到CSRF保护机制' : '未检测到CSRF保护机制'
          };
        } catch (error) {
          // 如果登录页面不存在，检查API是否有CSRF保护
          try {
            const response = await axios.post(`${config.target.baseUrl}/api/users/login`, {
              username: 'test',
              password: 'test'
            }, { timeout: 5000 });
            
            return {
              passed: false,
              status: response.status,
              message: '未检测到CSRF保护机制'
            };
          } catch (loginError) {
            // 即使登录失败，也检查是否有CSRF相关错误
            const hasCsrfError = loginError.response && 
              loginError.response.data && 
              typeof loginError.response.data === 'string' && 
              loginError.response.data.includes('csrf');
            
            return {
              passed: hasCsrfError,
              status: loginError.response ? loginError.response.status : 0,
              message: hasCsrfError ? '检测到CSRF保护机制' : '未检测到CSRF保护机制'
            };
          }
        }
      }
    );
    
    this.results.testResults.push(testResult);
  }

  /**
   * 认证绕过测试
   */
  async testAuthenticationBypass() {
    console.log('执行认证绕过测试...');
    
    // 测试未认证访问受保护的端点
    const protectedEndpoints = [
      '/api/transactions',
      '/api/categories',
      '/api/accounts'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const testResult = await this.executeTest(
        '认证绕过测试',
        async () => {
          try {
            const response = await axios.get(`${config.target.baseUrl}${endpoint}`, { timeout: 5000 });
            
            // 如果没有认证就能访问，则存在认证绕过漏洞
            return {
              passed: false,
              status: response.status,
              message: '可能存在认证绕过漏洞'
            };
          } catch (error) {
            // 401或403错误是预期的，表示认证机制正常工作
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
              return {
                passed: true,
                status: error.response.status,
                message: '认证机制正常工作'
              };
            }
            
            // 其他错误可能是服务器问题
            return {
              passed: false,
              status: error.response ? error.response.status : 0,
              message: `测试过程中发生错误: ${error.message}`
            };
          }
        },
        { endpoint }
      );
      
      this.results.testResults.push(testResult);
    }
  }

  /**
   * 限流测试
   */
  async testRateLimit() {
    console.log('执行限流测试...');
    
    const testResult = await this.executeTest(
      '限流测试',
      async () => {
        try {
          // 快速发送多个登录请求
          const requests = [];
          for (let i = 0; i < 30; i++) {
            requests.push(
              axios.post(`${config.target.baseUrl}/api/users/login`, {
                username: `test${i}`,
                password: 'test'
              }, { timeout: 5000 })
            );
          }
          
          const responses = await Promise.allSettled(requests);
          
          // 检查是否有429状态码响应
          const hasRateLimitResponse = responses.some(response => 
            response.status === 'fulfilled' && 
            response.value.status === 429
          );
          
          return {
            passed: hasRateLimitResponse,
            message: hasRateLimitResponse ? '检测到限流机制' : '未检测到限流机制'
          };
        } catch (error) {
          return {
            passed: false,
            message: `测试过程中发生错误: ${error.message}`
          };
        }
      }
    );
    
    this.results.testResults.push(testResult);
  }

  /**
   * 输入验证测试
   */
  async testInputValidation() {
    console.log('执行输入验证测试...');
    
    const invalidInputs = [
      { username: '', password: 'test', expectedStatus: 400 },
      { username: 'test', password: '', expectedStatus: 400 },
      { username: 'a', password: 'test', expectedStatus: 400 }, // 用户名太短
      { username: 'test', password: '123', expectedStatus: 400 }, // 密码太短
      { username: 'test@test.com', password: 'test', expectedStatus: 400 } // 无效邮箱格式（如果要求用户名而非邮箱）
    ];
    
    for (const input of invalidInputs) {
      const testResult = await this.executeTest(
        '输入验证测试',
        async () => {
          try {
            const response = await axios.post(`${config.target.baseUrl}/api/users/login`, input, { timeout: 5000 });
            
            // 如果没有返回400状态码，则输入验证可能有问题
            return {
              passed: response.status === input.expectedStatus,
              status: response.status,
              message: response.status === input.expectedStatus ? 
                '正确验证了输入' : 
                '输入验证可能存在问题'
            };
          } catch (error) {
            // 400错误是预期的
            if (error.response && error.response.status === input.expectedStatus) {
              return {
                passed: true,
                status: error.response.status,
                message: '正确验证了输入'
              };
            }
            
            return {
              passed: false,
              status: error.response ? error.response.status : 0,
              message: `输入验证可能存在问题: ${error.message}`
            };
          }
        },
        { input }
      );
      
      this.results.testResults.push(testResult);
    }
  }

  /**
   * 敏感数据泄露测试
   */
  async testSensitiveDataExposure() {
    console.log('执行敏感数据泄露测试...');
    
    // 测试错误信息是否泄露敏感信息
    const testResult = await this.executeTest(
      '敏感数据泄露测试',
      async () => {
        try {
          // 使用不存在的用户登录
          const response = await axios.post(`${config.target.baseUrl}/api/users/login`, {
            username: 'nonexistentuser',
            password: 'wrongpassword'
          }, { timeout: 5000 });
          
          // 检查响应中是否包含敏感信息
          const responseText = JSON.stringify(response.data);
          const containsSensitiveInfo = responseText.includes('用户名') || 
            responseText.includes('邮箱') || 
            responseText.includes('手机号') || 
            responseText.includes('不存在');
          
          return {
            passed: !containsSensitiveInfo,
            status: response.status,
            message: containsSensitiveInfo ? 
              '错误信息可能泄露敏感信息' : 
              '错误信息未泄露敏感信息'
          };
        } catch (error) {
          // 检查错误响应中是否包含敏感信息
          if (error.response && error.response.data) {
            const responseText = JSON.stringify(error.response.data);
            const containsSensitiveInfo = responseText.includes('用户名') || 
              responseText.includes('邮箱') || 
              responseText.includes('手机号') || 
              responseText.includes('不存在');
            
            return {
              passed: !containsSensitiveInfo,
              status: error.response.status,
              message: containsSensitiveInfo ? 
                '错误信息可能泄露敏感信息' : 
                '错误信息未泄露敏感信息'
            };
          }
          
          return {
            passed: true,
            status: error.response ? error.response.status : 0,
            message: '无法确定敏感数据泄露情况'
          };
        }
      }
    );
    
    this.results.testResults.push(testResult);
  }

  /**
   * 安全头测试
   */
  async testSecurityHeaders() {
    console.log('执行安全头测试...');
    
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy'
    ];
    
    for (const endpoint of config.target.apiEndpoints) {
      const testResult = await this.executeTest(
        '安全头测试',
        async () => {
          try {
            const response = await axios.get(`${config.target.baseUrl}${endpoint}`, { timeout: 5000 });
            
            // 检查响应头中是否包含安全头
            const headers = response.headers;
            const presentHeaders = securityHeaders.filter(header => headers[header]);
            
            return {
              passed: presentHeaders.length > 0,
              status: response.status,
              message: `检测到 ${presentHeaders.length}/${securityHeaders.length} 个安全头: ${presentHeaders.join(', ')}`
            };
          } catch (error) {
            return {
              passed: false,
              status: error.response ? error.response.status : 0,
              message: `测试过程中发生错误: ${error.message}`
            };
          }
        },
        { endpoint }
      );
      
      this.results.testResults.push(testResult);
    }
  }

  /**
   * 执行单个测试
   */
  async executeTest(testName, testFunction, details = {}) {
    this.results.totalTests++;
    
    try {
      const result = await testFunction();
      
      if (result.passed) {
        this.results.passedTests++;
      } else {
        this.results.failedTests++;
        this.results.vulnerabilities.push({
          testName,
          details,
          message: result.message,
          severity: this.determineSeverity(testName),
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        testName,
        details,
        ...result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.results.failedTests++;
      this.results.vulnerabilities.push({
        testName,
        details,
        message: `测试执行失败: ${error.message}`,
        severity: 'high',
        timestamp: new Date().toISOString()
      });
      
      return {
        testName,
        details,
        passed: false,
        message: `测试执行失败: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 确定漏洞严重程度
   */
  determineSeverity(testName) {
    const highSeverityTests = [
      'SQL注入测试',
      'XSS测试',
      '认证绕过测试'
    ];
    
    const mediumSeverityTests = [
      'CSRF保护测试',
      '敏感数据泄露测试'
    ];
    
    if (highSeverityTests.includes(testName)) {
      return 'high';
    } else if (mediumSeverityTests.includes(testName)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore() {
    if (this.results.totalTests === 0) {
      this.results.securityScore = 0;
      return;
    }
    
    const baseScore = Math.round((this.results.passedTests / this.results.totalTests) * 100);
    
    // 根据漏洞严重程度调整评分
    let penalty = 0;
    for (const vuln of this.results.vulnerabilities) {
      if (vuln.severity === 'high') {
        penalty += 10;
      } else if (vuln.severity === 'medium') {
        penalty += 5;
      } else {
        penalty += 2;
      }
    }
    
    this.results.securityScore = Math.max(0, baseScore - penalty);
  }

  /**
   * 生成报告
   */
  async generateReport() {
    const reportPath = path.join(config.report.outputDir, config.report.fileName);
    
    const report = {
      ...this.results,
      summary: {
        scanDate: new Date().toISOString(),
        totalTests: this.results.totalTests,
        passedTests: this.results.passedTests,
        failedTests: this.results.failedTests,
        securityScore: this.results.securityScore,
        vulnerabilitiesBySeverity: this.groupVulnerabilitiesBySeverity(),
        recommendations: this.generateRecommendations()
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`安全扫描报告已生成: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * 按严重程度分组漏洞
   */
  groupVulnerabilitiesBySeverity() {
    const grouped = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    for (const vuln of this.results.vulnerabilities) {
      grouped[vuln.severity]++;
    }
    
    return grouped;
  }

  /**
   * 生成修复建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    // 检查是否有SQL注入漏洞
    const hasSqlInjection = this.results.vulnerabilities.some(v => 
      v.testName === 'SQL注入测试' && v.severity === 'high'
    );
    
    if (hasSqlInjection) {
      recommendations.push({
        priority: 'high',
        issue: 'SQL注入漏洞',
        recommendation: '使用参数化查询或ORM来防止SQL注入攻击',
        resources: [
          'https://owasp.org/www-community/attacks/SQL_Injection',
          'https://nodejs.org/en/knowledge/errors/sql-injection/'
        ]
      });
    }
    
    // 检查是否有XSS漏洞
    const hasXss = this.results.vulnerabilities.some(v => 
      v.testName === 'XSS测试' && v.severity === 'high'
    );
    
    if (hasXss) {
      recommendations.push({
        priority: 'high',
        issue: 'XSS漏洞',
        recommendation: '对所有用户输入进行适当的转义和验证，使用内容安全策略(CSP)',
        resources: [
          'https://owasp.org/www-community/attacks/xss/',
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'
        ]
      });
    }
    
    // 检查是否有认证绕过漏洞
    const hasAuthBypass = this.results.vulnerabilities.some(v => 
      v.testName === '认证绕过测试' && v.severity === 'high'
    );
    
    if (hasAuthBypass) {
      recommendations.push({
        priority: 'high',
        issue: '认证绕过漏洞',
        recommendation: '确保所有受保护的端点都有适当的身份验证和授权检查',
        resources: [
          'https://owasp.org/www-project-top-ten/2017/A2_2017-Broken_Authentication',
          'https://expressjs.com/en/advanced/best-practice-security.html'
        ]
      });
    }
    
    // 检查是否有CSRF漏洞
    const hasCsrf = this.results.vulnerabilities.some(v => 
      v.testName === 'CSRF保护测试' && v.severity === 'medium'
    );
    
    if (hasCsrf) {
      recommendations.push({
        priority: 'medium',
        issue: 'CSRF漏洞',
        recommendation: '实施CSRF令牌验证机制，使用SameSite cookie属性',
        resources: [
          'https://owasp.org/www-community/attacks/csrf',
          'https://github.com/expressjs/csurf'
        ]
      });
    }
    
    // 检查是否有敏感数据泄露
    const hasDataExposure = this.results.vulnerabilities.some(v => 
      v.testName === '敏感数据泄露测试' && v.severity === 'medium'
    );
    
    if (hasDataExposure) {
      recommendations.push({
        priority: 'medium',
        issue: '敏感数据泄露',
        recommendation: '确保错误消息不泄露敏感信息，实施适当的错误处理机制',
        resources: [
          'https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure',
          'https://expressjs.com/en/guide/error-handling.html'
        ]
      });
    }
    
    // 检查是否有输入验证问题
    const hasInputValidation = this.results.vulnerabilities.some(v => 
      v.testName === '输入验证测试'
    );
    
    if (hasInputValidation) {
      recommendations.push({
        priority: 'medium',
        issue: '输入验证不足',
        recommendation: '实施严格的输入验证机制，使用验证库如Joi或express-validator',
        resources: [
          'https://owasp.org/www-project-top-ten/2017/A1_2017-Injection',
          'https://github.com/express-validator/express-validator'
        ]
      });
    }
    
    // 检查是否有安全头缺失
    const hasSecurityHeaders = this.results.vulnerabilities.some(v => 
      v.testName === '安全头测试'
    );
    
    if (hasSecurityHeaders) {
      recommendations.push({
        priority: 'low',
        issue: '安全头缺失',
        recommendation: '添加必要的安全响应头，如X-Content-Type-Options、X-Frame-Options等',
        resources: [
          'https://owasp.org/www-project-secure-headers/',
          'https://github.com/helmetjs/helmet'
        ]
      });
    }
    
    // 检查是否有限流问题
    const hasRateLimit = this.results.vulnerabilities.some(v => 
      v.testName === '限流测试'
    );
    
    if (hasRateLimit) {
      recommendations.push({
        priority: 'medium',
        issue: '限流机制缺失',
        recommendation: '实施API限流机制，防止暴力破解和DDoS攻击',
        resources: [
          'https://github.com/express-rate-limit/express-rate-limit',
          'https://owasp.org/www-project-top-ten/2017/A7_2017-Identification_and_Authentication_Failures'
        ]
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
    
    // 添加新的扫描结果
    summaryData.history.push({
      date: new Date().toISOString(),
      totalTests: this.results.totalTests,
      passedTests: this.results.passedTests,
      failedTests: this.results.failedTests,
      securityScore: this.results.securityScore,
      vulnerabilitiesBySeverity: this.groupVulnerabilitiesBySeverity()
    });
    
    // 只保留最近30次扫描的历史记录
    if (summaryData.history.length > 30) {
      summaryData.history = summaryData.history.slice(-30);
    }
    
    // 计算趋势
    if (summaryData.history.length > 1) {
      const current = summaryData.history[summaryData.history.length - 1];
      const previous = summaryData.history[summaryData.history.length - 2];
      
      summaryData.trend = {
        securityScore: current.securityScore - previous.securityScore,
        vulnerabilities: {
          high: current.vulnerabilitiesBySeverity.high - previous.vulnerabilitiesBySeverity.high,
          medium: current.vulnerabilitiesBySeverity.medium - previous.vulnerabilitiesBySeverity.medium,
          low: current.vulnerabilitiesBySeverity.low - previous.vulnerabilitiesBySeverity.low
        }
      };
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
    console.log(`安全扫描摘要报告已更新: ${summaryPath}`);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const scanner = new SecurityScanner();
    await scanner.runFullScan();
    process.exit(0);
  } catch (error) {
    console.error('安全扫描失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { SecurityScanner, config };