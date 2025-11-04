/**
 * 测试报告生成和通知系统
 * 用于生成综合测试报告和发送通知
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 配置参数
const config = {
  // 报告配置
  report: {
    outputDir: path.join(__dirname, 'reports'),
    templateDir: path.join(__dirname, 'templates'),
    summaryFileName: 'test-summary.json',
    dashboardFileName: 'dashboard.html'
  },
  // 通知配置
  notification: {
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
  }
};

/**
 * 报告生成器类
 */
class ReportGenerator {
  constructor() {
    this.ensureDirectories();
  }

  /**
   * 确保目录存在
   */
  ensureDirectories() {
    if (!fs.existsSync(config.report.outputDir)) {
      fs.mkdirSync(config.report.outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(config.report.templateDir)) {
      fs.mkdirSync(config.report.templateDir, { recursive: true });
    }
  }

  /**
   * 生成综合测试报告
   */
  async generateComprehensiveReport() {
    console.log('生成综合测试报告...');
    
    try {
      // 读取安全测试报告
      const securityReport = this.readLatestSecurityReport();
      
      // 读取性能测试报告
      const performanceReport = this.readLatestPerformanceReport();
      
      // 生成综合报告
      const comprehensiveReport = {
        timestamp: new Date().toISOString(),
        security: securityReport,
        performance: performanceReport,
        summary: this.generateSummary(securityReport, performanceReport),
        recommendations: this.generateComprehensiveRecommendations(securityReport, performanceReport),
        trend: this.analyzeTrends()
      };
      
      // 保存综合报告
      const reportPath = path.join(config.report.outputDir, `comprehensive-report-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));
      
      // 更新摘要报告
      this.updateSummaryReport(comprehensiveReport);
      
      // 生成仪表板HTML
      this.generateDashboard(comprehensiveReport);
      
      console.log(`综合测试报告已生成: ${reportPath}`);
      
      return comprehensiveReport;
    } catch (error) {
      console.error('生成综合测试报告失败:', error);
      throw error;
    }
  }

  /**
   * 读取最新的安全测试报告
   */
  readLatestSecurityReport() {
    const securityReportDir = path.join(__dirname, 'security-reports');
    
    if (!fs.existsSync(securityReportDir)) {
      return { error: '安全测试报告目录不存在' };
    }
    
    const files = fs.readdirSync(securityReportDir)
      .filter(file => file.startsWith('security-scan-') && file.endsWith('.json'))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(securityReportDir, a)).mtime;
        const bTime = fs.statSync(path.join(securityReportDir, b)).mtime;
        return bTime - aTime;
      });
    
    if (files.length === 0) {
      return { error: '没有找到安全测试报告' };
    }
    
    const latestReportPath = path.join(securityReportDir, files[0]);
    return JSON.parse(fs.readFileSync(latestReportPath, 'utf8'));
  }

  /**
   * 读取最新的性能测试报告
   */
  readLatestPerformanceReport() {
    const performanceReportDir = path.join(__dirname, 'performance-reports');
    
    if (!fs.existsSync(performanceReportDir)) {
      return { error: '性能测试报告目录不存在' };
    }
    
    const files = fs.readdirSync(performanceReportDir)
      .filter(file => file.startsWith('performance-test-') && file.endsWith('.json'))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(performanceReportDir, a)).mtime;
        const bTime = fs.statSync(path.join(performanceReportDir, b)).mtime;
        return bTime - aTime;
      });
    
    if (files.length === 0) {
      return { error: '没有找到性能测试报告' };
    }
    
    const latestReportPath = path.join(performanceReportDir, files[0]);
    return JSON.parse(fs.readFileSync(latestReportPath, 'utf8'));
  }

  /**
   * 生成摘要
   */
  generateSummary(securityReport, performanceReport) {
    const summary = {
      overallHealth: 'good', // good, warning, critical
      securityScore: 0,
      performanceRating: 'unknown',
      lastTestDate: new Date().toISOString(),
      issues: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
    
    // 处理安全报告
    if (!securityReport.error) {
      summary.securityScore = securityReport.securityScore || 0;
      
      // 统计安全问题
      if (securityReport.vulnerabilities) {
        for (const vuln of securityReport.vulnerabilities) {
          if (vuln.severity === 'high') {
            summary.issues.high++;
          } else if (vuln.severity === 'medium') {
            summary.issues.medium++;
          } else if (vuln.severity === 'low') {
            summary.issues.low++;
          }
        }
      }
    }
    
    // 处理性能报告
    if (!performanceReport.error) {
      summary.performanceRating = performanceReport.summary.performanceRating || 'unknown';
      
      // 将性能问题转换为安全问题
      if (performanceReport.summary.errorRate > 5) {
        summary.issues.critical++;
      } else if (performanceReport.summary.errorRate > 1) {
        summary.issues.high++;
      }
      
      if (performanceReport.summary.averageResponseTime > 2000) {
        summary.issues.high++;
      } else if (performanceReport.summary.averageResponseTime > 1000) {
        summary.issues.medium++;
      }
    }
    
    // 确定整体健康状态
    if (summary.issues.critical > 0 || summary.issues.high > 3) {
      summary.overallHealth = 'critical';
    } else if (summary.issues.high > 0 || summary.issues.medium > 5) {
      summary.overallHealth = 'warning';
    } else {
      summary.overallHealth = 'good';
    }
    
    return summary;
  }

  /**
   * 生成综合建议
   */
  generateComprehensiveRecommendations(securityReport, performanceReport) {
    const recommendations = [];
    
    // 处理安全建议
    if (!securityReport.error && securityReport.summary && securityReport.summary.recommendations) {
      for (const rec of securityReport.summary.recommendations) {
        recommendations.push({
          ...rec,
          category: 'security'
        });
      }
    }
    
    // 处理性能建议
    if (!performanceReport.error && performanceReport.summary && performanceReport.summary.recommendations) {
      for (const rec of performanceReport.summary.recommendations) {
        recommendations.push({
          ...rec,
          category: 'performance'
        });
      }
    }
    
    // 按优先级排序
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return recommendations;
  }

  /**
   * 分析趋势
   */
  analyzeTrends() {
    const trend = {
      security: {
        score: 0,
        vulnerabilities: {
          high: 0,
          medium: 0,
          low: 0
        }
      },
      performance: {
        responseTime: 0,
        errorRate: 0,
        requestsPerSecond: 0
      }
    };
    
    // 读取安全测试摘要
    const securitySummaryPath = path.join(__dirname, 'security-reports', 'security-scan-summary.json');
    if (fs.existsSync(securitySummaryPath)) {
      try {
        const securitySummary = JSON.parse(fs.readFileSync(securitySummaryPath, 'utf8'));
        
        if (securitySummary.history && securitySummary.history.length > 1) {
          const current = securitySummary.history[securitySummary.history.length - 1];
          const previous = securitySummary.history[securitySummary.history.length - 2];
          
          trend.security.score = current.securityScore - previous.securityScore;
          trend.security.vulnerabilities.high = current.vulnerabilitiesBySeverity.high - previous.vulnerabilitiesBySeverity.high;
          trend.security.vulnerabilities.medium = current.vulnerabilitiesBySeverity.medium - previous.vulnerabilitiesBySeverity.medium;
          trend.security.vulnerabilities.low = current.vulnerabilitiesBySeverity.low - previous.vulnerabilitiesBySeverity.low;
        }
      } catch (error) {
        console.error('分析安全趋势失败:', error);
      }
    }
    
    // 读取性能测试摘要
    const performanceSummaryPath = path.join(__dirname, 'performance-reports', 'performance-test-summary.json');
    if (fs.existsSync(performanceSummaryPath)) {
      try {
        const performanceSummary = JSON.parse(fs.readFileSync(performanceSummaryPath, 'utf8'));
        
        if (performanceSummary.history && performanceSummary.history.length > 1) {
          const current = performanceSummary.history[performanceSummary.history.length - 1];
          const previous = performanceSummary.history[performanceSummary.history.length - 2];
          
          trend.performance.responseTime = current.averageResponseTime - previous.averageResponseTime;
          trend.performance.errorRate = parseFloat(current.errorRate) - parseFloat(previous.errorRate);
          trend.performance.requestsPerSecond = current.requestsPerSecond - previous.requestsPerSecond;
        }
      } catch (error) {
        console.error('分析性能趋势失败:', error);
      }
    }
    
    return trend;
  }

  /**
   * 更新摘要报告
   */
  updateSummaryReport(comprehensiveReport) {
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
    
    // 添加新的综合报告结果
    summaryData.history.push({
      date: comprehensiveReport.timestamp,
      overallHealth: comprehensiveReport.summary.overallHealth,
      securityScore: comprehensiveReport.summary.securityScore,
      performanceRating: comprehensiveReport.summary.performanceRating,
      issues: comprehensiveReport.summary.issues
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
        securityScore: current.securityScore - previous.securityScore,
        criticalIssues: current.issues.critical - previous.issues.critical,
        highIssues: current.issues.high - previous.issues.high,
        mediumIssues: current.issues.medium - previous.issues.medium,
        lowIssues: current.issues.low - previous.issues.low
      };
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
    console.log(`综合测试摘要报告已更新: ${summaryPath}`);
  }

  /**
   * 生成仪表板HTML
   */
  generateDashboard(comprehensiveReport) {
    const dashboardPath = path.join(config.report.outputDir, config.report.dashboardFileName);
    
    const html = this.generateDashboardHTML(comprehensiveReport);
    
    fs.writeFileSync(dashboardPath, html);
    console.log(`测试仪表板已生成: ${dashboardPath}`);
    
    return dashboardPath;
  }

  /**
   * 生成仪表板HTML内容
   */
  generateDashboardHTML(comprehensiveReport) {
    const { summary, security, performance, trend, recommendations } = comprehensiveReport;
    
    // 确定健康状态颜色
    const healthColors = {
      good: '#28a745',
      warning: '#ffc107',
      critical: '#dc3545'
    };
    
    const healthColor = healthColors[summary.overallHealth] || '#6c757d';
    
    // 生成安全问题列表
    const securityIssuesHtml = security.vulnerabilities ? security.vulnerabilities.map(vuln => `
      <div class="issue-item">
        <div class="issue-severity ${vuln.severity}">${vuln.severity.toUpperCase()}</div>
        <div class="issue-details">
          <div class="issue-name">${vuln.testName}</div>
          <div class="issue-message">${vuln.message}</div>
        </div>
      </div>
    `).join('') : '<div class="no-issues">没有安全问题</div>';
    
    // 生成性能指标HTML
    const performanceMetricsHtml = !performance.error ? `
      <div class="metric">
        <div class="metric-label">平均响应时间</div>
        <div class="metric-value">${performance.summary.averageResponseTime.toFixed(2)}ms</div>
      </div>
      <div class="metric">
        <div class="metric-label">请求/秒</div>
        <div class="metric-value">${performance.summary.requestsPerSecond}</div>
      </div>
      <div class="metric">
        <div class="metric-label">错误率</div>
        <div class="metric-value">${performance.summary.errorRate}%</div>
      </div>
      <div class="metric">
        <div class="metric-label">性能评级</div>
        <div class="metric-value">${performance.summary.performanceRating}</div>
      </div>
    ` : '<div class="no-data">没有性能数据</div>';
    
    // 生成趋势指示器
    const trendIndicator = (value, label) => {
      if (value > 0) {
        return `<span class="trend-up">↑ ${value} ${label}</span>`;
      } else if (value < 0) {
        return `<span class="trend-down">↓ ${Math.abs(value)} ${label}</span>`;
      } else {
        return `<span class="trend-neutral">→ 无变化</span>`;
      }
    };
    
    // 生成建议列表
    const recommendationsHtml = recommendations.map(rec => `
      <div class="recommendation-item ${rec.priority}">
        <div class="recommendation-priority">${rec.priority.toUpperCase()}</div>
        <div class="recommendation-content">
          <div class="recommendation-issue">${rec.issue}</div>
          <div class="recommendation-text">${rec.recommendation}</div>
        </div>
      </div>
    `).join('');
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>系统测试仪表板</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        header {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header-title {
            margin: 0;
            font-size: 24px;
        }
        .health-status {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .health-indicator {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: ${healthColor};
        }
        .health-text {
            font-weight: bold;
            text-transform: uppercase;
        }
        .dashboard-content {
            padding: 20px;
        }
        .summary-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .summary-value {
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
        }
        .summary-label {
            color: #6c757d;
            font-size: 14px;
        }
        .trend {
            margin-top: 10px;
            font-size: 14px;
        }
        .trend-up {
            color: #dc3545;
        }
        .trend-down {
            color: #28a745;
        }
        .trend-neutral {
            color: #6c757d;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 20px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        .issues-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .issue-item, .recommendation-item {
            display: flex;
            gap: 15px;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            background-color: #f8f9fa;
        }
        .issue-severity, .recommendation-priority {
            min-width: 80px;
            text-align: center;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
        }
        .issue-severity.high, .recommendation-priority.high {
            background-color: #dc3545;
        }
        .issue-severity.medium, .recommendation-priority.medium {
            background-color: #ffc107;
        }
        .issue-severity.low, .recommendation-priority.low {
            background-color: #28a745;
        }
        .issue-details, .recommendation-content {
            flex: 1;
        }
        .issue-name, .recommendation-issue {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .issue-message, .recommendation-text {
            font-size: 14px;
            color: #6c757d;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .metric {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .metric-label {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 20px;
            font-weight: bold;
        }
        .no-issues, .no-data {
            text-align: center;
            padding: 20px;
            color: #6c757d;
            font-style: italic;
        }
        footer {
            background-color: #f8f9fa;
            padding: 15px 20px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .last-updated {
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1 class="header-title">系统测试仪表板</h1>
            <div class="health-status">
                <div class="health-indicator"></div>
                <div class="health-text">${summary.overallHealth}</div>
            </div>
        </header>
        
        <div class="dashboard-content">
            <div class="summary-section">
                <div class="summary-card">
                    <div class="summary-label">安全评分</div>
                    <div class="summary-value">${summary.securityScore}%</div>
                    <div class="trend">${trendIndicator(trend.security.score, '分')}</div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-label">性能评级</div>
                    <div class="summary-value">${summary.performanceRating}</div>
                    <div class="trend">${trendIndicator(trend.performance.responseTime, 'ms')}</div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-label">高危问题</div>
                    <div class="summary-value">${summary.issues.high}</div>
                    <div class="trend">${trendIndicator(trend.security.vulnerabilities.high, '个')}</div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-label">中危问题</div>
                    <div class="summary-value">${summary.issues.medium}</div>
                    <div class="trend">${trendIndicator(trend.security.vulnerabilities.medium, '个')}</div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">安全问题</h2>
                <div class="issues-container">
                    <div>
                        ${securityIssuesHtml}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">性能指标</h2>
                <div class="metrics-grid">
                    ${performanceMetricsHtml}
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">修复建议</h2>
                ${recommendationsHtml}
            </div>
        </div>
        
        <footer>
            <div class="last-updated">最后更新: ${new Date(comprehensiveReport.timestamp).toLocaleString('zh-CN')}</div>
            <div>自动化测试系统</div>
        </footer>
    </div>
</body>
</html>
    `;
  }
}

/**
 * 通知发送器类
 */
class NotificationSender {
  constructor() {
    this.config = config.notification;
  }

  /**
   * 发送综合报告通知
   */
  async sendComprehensiveReportNotification(comprehensiveReport) {
    try {
      // 发送邮件通知
      if (this.config.email.enabled) {
        await this.sendEmailNotification(comprehensiveReport);
      }
      
      // 发送webhook通知
      if (this.config.webhook.enabled) {
        await this.sendWebhookNotification(comprehensiveReport);
      }
      
      console.log('综合报告通知已发送');
    } catch (error) {
      console.error('发送综合报告通知失败:', error);
    }
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(comprehensiveReport) {
    // 这里需要实现邮件发送逻辑
    // 可以使用nodemailer库
    console.log('邮件通知已发送');
  }

  /**
   * 发送webhook通知
   */
  async sendWebhookNotification(comprehensiveReport) {
    const { summary } = comprehensiveReport;
    
    const message = {
      text: '系统测试报告已生成',
      attachments: [
        {
          color: summary.overallHealth === 'good' ? 'good' : 
                 summary.overallHealth === 'warning' ? 'warning' : 'danger',
          fields: [
            { title: '整体健康状态', value: summary.overallHealth, short: true },
            { title: '安全评分', value: `${summary.securityScore}%`, short: true },
            { title: '性能评级', value: summary.performanceRating, short: true },
            { title: '高危问题', value: summary.issues.high, short: true },
            { title: '中危问题', value: summary.issues.medium, short: true },
            { title: '低危问题', value: summary.issues.low, short: true }
          ],
          actions: [
            {
              type: 'button',
              text: '查看详细报告',
              url: 'file://' + path.join(config.report.outputDir, config.report.dashboardFileName)
            }
          ]
        }
      ]
    };
    
    await axios.post(this.config.webhook.url, message);
    console.log('Webhook通知已发送');
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('生成综合测试报告...');
    
    const reportGenerator = new ReportGenerator();
    const comprehensiveReport = await reportGenerator.generateComprehensiveReport();
    
    const notificationSender = new NotificationSender();
    await notificationSender.sendComprehensiveReportNotification(comprehensiveReport);
    
    console.log('综合测试报告和通知完成');
    process.exit(0);
  } catch (error) {
    console.error('生成综合测试报告和通知失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { ReportGenerator, NotificationSender, config };