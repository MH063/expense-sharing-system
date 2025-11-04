# 自动化测试系统

这是一个集成的自动化测试系统，用于定期进行安全测试和性能测试，确保系统持续稳定运行。

## 系统组件

### 1. 安全扫描器 (security-scanner.js)
- 自动执行安全测试套件
- 检测常见安全漏洞
- 生成安全测试报告

### 2. 性能测试器 (performance-tester.js)
- 执行负载测试
- 监控系统性能指标
- 生成性能测试报告

### 3. 测试调度器 (scheduler.js)
- 使用node-cron实现定时任务
- 默认配置：
  - 每天凌晨2点执行安全测试
  - 每周日凌晨3点执行性能测试
- 包含重试机制和错误处理

### 4. 报告生成器 (report-generator.js)
- 生成综合测试报告
- 创建可视化仪表板
- 支持通知功能（邮件、Webhook）

### 5. 自动化启动器 (automation-runner.js)
- 整合所有测试组件
- 提供命令行接口
- 支持一次性运行和调度器模式

## 安装依赖

```bash
cd "c:\Users\MH\Desktop\记账系统\Server-side"
npm install node-cron --save
```

## 使用方法

### 1. 运行完整测试套件（一次性）
```bash
cd "c:\Users\MH\Desktop\记账系统\Server-side\scripts"
node automation-runner.js
```

### 2. 运行测试但不生成报告
```bash
node automation-runner.js --no-report
```

### 3. 启动调度器（持续运行）
```bash
node automation-runner.js --scheduler
```

### 4. 单独运行安全测试
```bash
node security-scanner.js
```

### 5. 单独运行性能测试
```bash
node performance-tester.js
```

### 6. 单独生成报告
```bash
node report-generator.js
```

## 报告查看

### 1. 安全测试报告
- 位置：`scripts/security-reports/security-scan-YYYY-MM-DD.json`
- 包含安全评分、漏洞详情和修复建议

### 2. 性能测试报告
- 位置：`scripts/performance-reports/performance-test-YYYY-MM-DD.json`
- 包含响应时间、吞吐量和错误率等指标

### 3. 综合测试仪表板
- 位置：`scripts/reports/dashboard.html`
- 可视化展示安全评分、性能指标和修复建议
- 可在浏览器中打开查看

### 4. 测试日志
- 位置：`scripts/logs/`
- 包含每次测试的详细日志

## 配置说明

### 1. 安全扫描器配置
在`security-scanner.js`中修改以下配置：
```javascript
const config = {
  targetUrl: 'http://localhost:3000',  // 目标URL
  maxConcurrent: 10,                   // 最大并发数
  timeout: 5000,                       // 请求超时时间
  testEndpoints: [                     // 测试端点
    '/api/users/login',
    '/api/transactions',
    // 添加更多端点...
  ]
};
```

### 2. 性能测试器配置
在`performance-tester.js`中修改以下配置：
```javascript
const config = {
  targetUrl: 'http://localhost:3000',  // 目标URL
  loadTest: {
    duration: 60,                      // 测试持续时间（秒）
    concurrency: 10,                    // 并发用户数
    rampUp: 10                         // 启动时间（秒）
  },
  endpoints: [                         // 测试端点
    { path: '/api/users/login', method: 'POST', weight: 3 },
    { path: '/api/transactions', method: 'GET', weight: 2 },
    // 添加更多端点...
  ]
};
```

### 3. 调度器配置
在`scheduler.js`中修改以下配置：
```javascript
const config = {
  schedules: {
    securityTest: '0 2 * * *',         // 每天凌晨2点
    performanceTest: '0 3 * * 0'       // 每周日凌晨3点
  },
  retries: 3,                          // 重试次数
  retryDelay: 60000                    // 重试延迟（毫秒）
};
```

### 4. 通知配置
在`report-generator.js`中修改以下配置：
```javascript
const config = {
  notification: {
    email: {
      enabled: false,                  // 启用邮件通知
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
      enabled: false,                  // 启用Webhook通知
      url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    }
  }
};
```

## 最佳实践

1. **定期检查报告**：每天查看综合测试仪表板，了解系统状态
2. **及时修复问题**：根据报告中的建议，优先修复高危问题
3. **调整测试参数**：根据系统变化，适时调整测试参数
4. **监控调度器状态**：确保调度器持续运行，不错过定时测试
5. **备份测试数据**：定期备份测试报告和日志，用于长期趋势分析

## 故障排除

### 1. 测试失败
- 检查目标服务是否正常运行
- 查看测试日志了解具体错误
- 确认测试端点是否可访问

### 2. 调度器停止
- 检查系统日志
- 重启调度器：`node automation-runner.js --scheduler`
- 考虑使用进程管理器（如PM2）保持调度器运行

### 3. 报告生成失败
- 检查原始测试报告是否存在
- 确认报告目录权限
- 查看报告生成日志

## 扩展功能

1. **添加新的安全测试**：在`security-scanner.js`中添加新的测试方法
2. **添加新的性能测试**：在`performance-tester.js`中添加新的测试场景
3. **集成更多通知渠道**：在`report-generator.js`中添加新的通知方法
4. **自定义报告模板**：修改`report-generator.js`中的HTML模板

## 技术支持

如有问题，请查看日志文件或联系系统管理员。