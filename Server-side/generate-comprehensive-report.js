const fs = require('fs');
const path = require('path');

// 读取安全测试报告和压力测试报告
const securityReportPath = path.join(__dirname, 'security-test-report.json');
const stressReportPath = path.join(__dirname, 'stress-test-report.json');

let securityReport, stressReport;

try {
  securityReport = JSON.parse(fs.readFileSync(securityReportPath, 'utf8'));
  console.log('安全测试报告读取成功');
} catch (error) {
  console.error('无法读取安全测试报告:', error.message);
  process.exit(1);
}

try {
  stressReport = JSON.parse(fs.readFileSync(stressReportPath, 'utf8'));
  console.log('压力测试报告读取成功');
} catch (error) {
  console.error('无法读取压力测试报告:', error.message);
  process.exit(1);
}

// 生成综合安全评估报告
function generateComprehensiveReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      securityScore: securityReport.summary.score,
      performanceScore: calculatePerformanceScore(stressReport.performance),
      overallScore: 0
    },
    securityFindings: analyzeSecurityFindings(securityReport.results),
    performanceFindings: analyzePerformanceFindings(stressReport),
    recommendations: generateRecommendations(securityReport.results, stressReport)
  };
  
  // 计算总体评分
  report.summary.overallScore = Math.round((report.summary.securityScore + report.summary.performanceScore) / 2);
  
  // 保存综合报告
  fs.writeFileSync(
    path.join(__dirname, 'comprehensive-security-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // 打印报告
  printReport(report);
  
  return report;
}

// 计算性能评分
function calculatePerformanceScore(performance) {
  let score = 0;
  
  // 成功率评分 (40%)
  if (performance.successRate >= 99) {
    score += 40;
  } else if (performance.successRate >= 95) {
    score += 30;
  } else if (performance.successRate >= 90) {
    score += 20;
  } else if (performance.successRate >= 80) {
    score += 10;
  }
  
  // 响应时间评分 (30%)
  if (performance.avgResponseTime <= 100) {
    score += 30;
  } else if (performance.avgResponseTime <= 300) {
    score += 20;
  } else if (performance.avgResponseTime <= 1000) {
    score += 10;
  }
  
  // 吞吐量评分 (30%)
  if (performance.rps >= 1000) {
    score += 30;
  } else if (performance.rps >= 500) {
    score += 20;
  } else if (performance.rps >= 100) {
    score += 10;
  }
  
  return score;
}

// 分析安全测试结果
function analyzeSecurityFindings(results) {
  const findings = {
    strengths: [],
    weaknesses: [],
    criticalIssues: []
  };
  
  // SQL注入防护
  if (results.sqlInjection.failed === 0) {
    findings.strengths.push('SQL注入防护: 系统正确处理了所有SQL注入测试用例');
  } else {
    findings.weaknesses.push(`SQL注入防护: ${results.sqlInjection.failed}个测试用例未通过`);
  }
  
  // XSS防护
  if (results.xss.failed === 0) {
    findings.strengths.push('XSS防护: 系统正确处理了所有XSS测试用例');
  } else {
    findings.weaknesses.push(`XSS防护: ${results.xss.failed}个测试用例未通过`);
  }
  
  // CSRF防护
  if (results.csrf.failed === 0) {
    findings.strengths.push('CSRF防护: 系统可能存在CSRF保护机制');
  } else {
    findings.weaknesses.push(`CSRF防护: ${results.csrf.failed}个测试用例未通过`);
  }
  
  // 认证绕过
  if (results.authBypass.failed === 0) {
    findings.strengths.push('认证机制: 系统正确处理了认证绕过测试');
  } else {
    findings.weaknesses.push(`认证机制: ${results.authBypass.failed}个测试用例未通过`);
    findings.criticalIssues.push('认证机制存在漏洞，可能被绕过');
  }
  
  // 限流机制
  if (results.rateLimiting.failed === 0) {
    findings.strengths.push('限流机制: 系统正确实现了请求限流');
  } else {
    findings.weaknesses.push(`限流机制: ${results.rateLimiting.failed}个测试用例未通过`);
  }
  
  // 输入验证
  if (results.inputValidation.failed === 0) {
    findings.strengths.push('输入验证: 系统正确验证了所有输入测试用例');
  } else {
    findings.weaknesses.push(`输入验证: ${results.inputValidation.failed}个测试用例未通过`);
  }
  
  // 敏感数据泄露
  if (results.sensitiveDataExposure.failed === 0) {
    findings.strengths.push('敏感数据保护: 系统未泄露敏感信息');
  } else {
    findings.weaknesses.push(`敏感数据保护: ${results.sensitiveDataExposure.failed}个测试用例未通过`);
    findings.criticalIssues.push('系统可能泄露敏感信息');
  }
  
  return findings;
}

// 分析性能测试结果
function analyzePerformanceFindings(stressReport) {
  const findings = {
    strengths: [],
    weaknesses: [],
    bottlenecks: []
  };
  
  // 吞吐量分析
  if (stressReport.performance.rps >= 1000) {
    findings.strengths.push(`高吞吐量: 系统处理了 ${stressReport.performance.rps.toFixed(2)} RPS`);
  } else {
    findings.weaknesses.push(`吞吐量不足: 系统仅处理了 ${stressReport.performance.rps.toFixed(2)} RPS`);
  }
  
  // 响应时间分析
  if (stressReport.performance.avgResponseTime <= 300) {
    findings.strengths.push(`响应时间良好: 平均响应时间 ${stressReport.performance.avgResponseTime.toFixed(2)}ms`);
  } else {
    findings.weaknesses.push(`响应时间较慢: 平均响应时间 ${stressReport.performance.avgResponseTime.toFixed(2)}ms`);
  }
  
  // 错误率分析
  const errorRate = (stressReport.stats.failedRequests / stressReport.stats.totalRequests) * 100;
  if (errorRate <= 5) {
    findings.strengths.push(`低错误率: 错误率仅 ${errorRate.toFixed(2)}%`);
  } else {
    findings.weaknesses.push(`高错误率: 错误率达到 ${errorRate.toFixed(2)}%`);
    findings.bottlenecks.push('系统在高负载下错误率过高，可能存在资源瓶颈');
  }
  
  // 状态码分析
  if (stressReport.stats.statusCodeCounts['429']) {
    const rateLimitRatio = (stressReport.stats.statusCodeCounts['429'] / stressReport.stats.totalRequests) * 100;
    if (rateLimitRatio > 40) {
      findings.bottlenecks.push(`限流过于严格: ${rateLimitRatio.toFixed(2)}% 的请求被限流`);
    }
  }
  
  if (stressReport.stats.statusCodeCounts['500']) {
    findings.bottlenecks.push(`服务器内部错误: ${stressReport.stats.statusCodeCounts['500']} 次请求返回500错误`);
  }
  
  return findings;
}

// 生成改进建议
function generateRecommendations(securityResults, stressReport) {
  const recommendations = {
    highPriority: [],
    mediumPriority: [],
    lowPriority: []
  };
  
  // 安全相关建议
  if (securityResults.authBypass.failed > 0) {
    recommendations.highPriority.push('修复认证绕过漏洞，确保无效token被正确拒绝');
  }
  
  if (securityResults.sensitiveDataExposure.failed > 0) {
    recommendations.highPriority.push('修复敏感信息泄露问题，移除响应头中的技术栈信息');
  }
  
  if (securityResults.inputValidation.failed > 0) {
    recommendations.mediumPriority.push('加强输入验证，确保空用户名和密码被正确拒绝');
  }
  
  if (securityResults.csrf.failed > 0) {
    recommendations.mediumPriority.push('实施CSRF保护机制，防止跨站请求伪造攻击');
  }
  
  // 性能相关建议
  if (stressReport.stats.statusCodeCounts['500'] > 0) {
    recommendations.highPriority.push('修复导致500错误的内部服务器问题');
  }
  
  if (stressReport.stats.statusCodeCounts['429'] / stressReport.stats.totalRequests > 0.4) {
    recommendations.mediumPriority.push('调整限流策略，平衡安全性和可用性');
  }
  
  if (stressReport.performance.avgResponseTime > 300) {
    recommendations.mediumPriority.push('优化系统性能，减少响应时间');
  }
  
  if (stressReport.performance.rps < 500) {
    recommendations.lowPriority.push('提高系统吞吐量，优化资源使用');
  }
  
  // 通用建议
  recommendations.lowPriority.push('实施日志记录和监控系统，及时发现异常');
  recommendations.lowPriority.push('定期进行安全测试和性能测试，确保系统持续稳定');
  recommendations.lowPriority.push('考虑实施自动化安全扫描，及时发现新漏洞');
  
  return recommendations;
}

// 打印报告
function printReport(report) {
  console.log('\n========================================');
  console.log('        综合安全与性能评估报告');
  console.log('========================================');
  
  console.log('\n报告生成时间:', new Date(report.timestamp).toLocaleString());
  
  console.log('\n----------------------------------------');
  console.log('总体评分:');
  console.log(`安全评分: ${report.summary.securityScore}/100`);
  console.log(`性能评分: ${report.summary.performanceScore}/100`);
  console.log(`总体评分: ${report.summary.overallScore}/100`);
  
  // 安全评估
  console.log('\n----------------------------------------');
  console.log('安全评估:');
  
  if (report.securityFindings.strengths.length > 0) {
    console.log('\n✅ 安全优势:');
    report.securityFindings.strengths.forEach(strength => {
      console.log(`  - ${strength}`);
    });
  }
  
  if (report.securityFindings.weaknesses.length > 0) {
    console.log('\n⚠️  安全弱点:');
    report.securityFindings.weaknesses.forEach(weakness => {
      console.log(`  - ${weakness}`);
    });
  }
  
  if (report.securityFindings.criticalIssues.length > 0) {
    console.log('\n🚨 关键安全问题:');
    report.securityFindings.criticalIssues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
  }
  
  // 性能评估
  console.log('\n----------------------------------------');
  console.log('性能评估:');
  
  if (report.performanceFindings.strengths.length > 0) {
    console.log('\n✅ 性能优势:');
    report.performanceFindings.strengths.forEach(strength => {
      console.log(`  - ${strength}`);
    });
  }
  
  if (report.performanceFindings.weaknesses.length > 0) {
    console.log('\n⚠️  性能弱点:');
    report.performanceFindings.weaknesses.forEach(weakness => {
      console.log(`  - ${weakness}`);
    });
  }
  
  if (report.performanceFindings.bottlenecks.length > 0) {
    console.log('\n🚧 性能瓶颈:');
    report.performanceFindings.bottlenecks.forEach(bottleneck => {
      console.log(`  - ${bottleneck}`);
    });
  }
  
  // 改进建议
  console.log('\n----------------------------------------');
  console.log('改进建议:');
  
  if (report.recommendations.highPriority.length > 0) {
    console.log('\n🔴 高优先级:');
    report.recommendations.highPriority.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }
  
  if (report.recommendations.mediumPriority.length > 0) {
    console.log('\n🟡 中优先级:');
    report.recommendations.mediumPriority.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }
  
  if (report.recommendations.lowPriority.length > 0) {
    console.log('\n🟢 低优先级:');
    report.recommendations.lowPriority.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }
  
  console.log('\n========================================');
  console.log('报告已保存到 comprehensive-security-report.json');
  console.log('========================================');
}

// 生成报告
generateComprehensiveReport();