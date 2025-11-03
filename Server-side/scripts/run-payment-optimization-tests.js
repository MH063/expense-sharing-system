/**
 * 支付流程优化测试运行脚本
 * 
 * 本脚本用于运行支付流程优化功能的所有测试
 * 包括单元测试、集成测试和测试覆盖率报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
  unitTests: [
    'tests/unit/offline-payment-service.test.js',
    'tests/unit/payment-reminder-service.test.js',
    'tests/unit/payment-query-service.test.js',
    'tests/unit/notification-service.test.js',
    'tests/unit/scheduler.test.js',
    'tests/unit/payment-optimization-controller.test.js'
  ],
  integrationTests: [
    'tests/integration/payment-optimization.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

// 颜色输出函数
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

// 日志输出函数
const log = {
  info: (message) => console.log(colors.blue(`[INFO] ${message}`)),
  success: (message) => console.log(colors.green(`[SUCCESS] ${message}`)),
  warning: (message) => console.log(colors.yellow(`[WARNING] ${message}`)),
  error: (message) => console.log(colors.red(`[ERROR] ${message}`))
};

// 运行命令并输出结果
function runCommand(command, description) {
  try {
    log.info(`正在${description}...`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log.success(`${description}完成`);
    return { success: true, output };
  } catch (error) {
    log.error(`${description}失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 检查测试文件是否存在
function checkTestFiles() {
  const missingFiles = [];
  
  [...TEST_CONFIG.unitTests, ...TEST_CONFIG.integrationTests].forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(filePath);
    }
  });
  
  if (missingFiles.length > 0) {
    log.warning('以下测试文件不存在:');
    missingFiles.forEach(file => console.log(`  - ${file}`));
    return false;
  }
  
  return true;
}

// 运行单元测试
function runUnitTests() {
  log.info('开始运行单元测试...');
  const testFiles = TEST_CONFIG.unitTests.map(file => path.join(__dirname, '..', file)).join(' ');
  const command = `npx jest ${testFiles} --verbose --coverage --coverageReporters=text --coverageReporters=html`;
  
  const result = runCommand(command, '单元测试');
  
  if (result.success) {
    log.success('单元测试全部通过');
    return true;
  } else {
    log.error('单元测试失败');
    console.log(result.error);
    return false;
  }
}

// 运行集成测试
function runIntegrationTests() {
  log.info('开始运行集成测试...');
  const testFiles = TEST_CONFIG.integrationTests.map(file => path.join(__dirname, '..', file)).join(' ');
  const command = `npx jest ${testFiles} --verbose --coverage --coverageReporters=text --coverageReporters=html`;
  
  const result = runCommand(command, '集成测试');
  
  if (result.success) {
    log.success('集成测试全部通过');
    return true;
  } else {
    log.error('集成测试失败');
    console.log(result.error);
    return false;
  }
}

// 生成测试覆盖率报告
function generateCoverageReport() {
  log.info('生成测试覆盖率报告...');
  const command = `npx jest --coverage --coverageReporters=html --coverageReporters=text --coverageReporters=json`;
  
  const result = runCommand(command, '生成测试覆盖率报告');
  
  if (result.success) {
    log.success('测试覆盖率报告已生成');
    
    // 读取覆盖率数据
    try {
      const coverageData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage', 'coverage-final.json'), 'utf8'));
      
      // 计算总体覆盖率
      let totalStatements = 0;
      let coveredStatements = 0;
      let totalBranches = 0;
      let coveredBranches = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      let totalLines = 0;
      let coveredLines = 0;
      
      Object.values(coverageData).forEach(fileData => {
        if (fileData.s) {
          Object.values(fileData.s).forEach(count => {
            totalStatements += count > 0 ? 1 : 0;
            coveredStatements += count > 0 ? 1 : 0;
          });
        }
        
        if (fileData.b) {
          Object.values(fileData.b).forEach(branchData => {
            totalBranches += branchData.length;
            coveredBranches += branchData.filter(count => count > 0).length;
          });
        }
        
        if (fileData.f) {
          Object.values(fileData.f).forEach(count => {
            totalFunctions += count > 0 ? 1 : 0;
            coveredFunctions += count > 0 ? 1 : 0;
          });
        }
        
        if (fileData.l) {
          Object.values(fileData.l).forEach(count => {
            totalLines += count > 0 ? 1 : 0;
            coveredLines += count > 0 ? 1 : 0;
          });
        }
      });
      
      const statementCoverage = totalStatements > 0 ? (coveredStatements / totalStatements * 100).toFixed(2) : 0;
      const branchCoverage = totalBranches > 0 ? (coveredBranches / totalBranches * 100).toFixed(2) : 0;
      const functionCoverage = totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100).toFixed(2) : 0;
      const lineCoverage = totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(2) : 0;
      
      console.log('\n测试覆盖率统计:');
      console.log(`  语句覆盖率: ${statementCoverage}%`);
      console.log(`  分支覆盖率: ${branchCoverage}%`);
      console.log(`  函数覆盖率: ${functionCoverage}%`);
      console.log(`  行覆盖率: ${lineCoverage}%`);
      
      // 检查是否达到阈值
      const threshold = TEST_CONFIG.coverageThreshold.global;
      let meetsThreshold = true;
      
      if (parseFloat(statementCoverage) < threshold.statements) {
        log.warning(`语句覆盖率 ${statementCoverage}% 低于阈值 ${threshold.statements}%`);
        meetsThreshold = false;
      }
      
      if (parseFloat(branchCoverage) < threshold.branches) {
        log.warning(`分支覆盖率 ${branchCoverage}% 低于阈值 ${threshold.branches}%`);
        meetsThreshold = false;
      }
      
      if (parseFloat(functionCoverage) < threshold.functions) {
        log.warning(`函数覆盖率 ${functionCoverage}% 低于阈值 ${threshold.functions}%`);
        meetsThreshold = false;
      }
      
      if (parseFloat(lineCoverage) < threshold.lines) {
        log.warning(`行覆盖率 ${lineCoverage}% 低于阈值 ${threshold.lines}%`);
        meetsThreshold = false;
      }
      
      if (meetsThreshold) {
        log.success('测试覆盖率达到阈值要求');
      } else {
        log.warning('测试覆盖率未达到阈值要求');
      }
      
      return meetsThreshold;
    } catch (error) {
      log.warning(`无法读取覆盖率数据: ${error.message}`);
      return false;
    }
  } else {
    log.error('生成测试覆盖率报告失败');
    return false;
  }
}

// 主函数
function main() {
  console.log(colors.cyan('====================================='));
  console.log(colors.cyan('支付流程优化测试套件'));
  console.log(colors.cyan('====================================='));
  
  // 检查测试文件
  if (!checkTestFiles()) {
    log.error('测试文件检查失败，终止测试');
    process.exit(1);
  }
  
  // 运行单元测试
  const unitTestsPassed = runUnitTests();
  
  // 运行集成测试
  const integrationTestsPassed = runIntegrationTests();
  
  // 生成测试覆盖率报告
  const coverageMeetsThreshold = generateCoverageReport();
  
  // 输出测试结果
  console.log('\n=====================================');
  console.log('测试结果总结:');
  console.log(`  单元测试: ${unitTestsPassed ? '通过' : '失败'}`);
  console.log(`  集成测试: ${integrationTestsPassed ? '通过' : '失败'}`);
  console.log(`  覆盖率达标: ${coverageMeetsThreshold ? '是' : '否'}`);
  console.log('=====================================');
  
  // 根据测试结果设置退出码
  if (unitTestsPassed && integrationTestsPassed && coverageMeetsThreshold) {
    log.success('所有测试通过，测试套件执行成功');
    process.exit(0);
  } else {
    log.error('测试未完全通过，测试套件执行失败');
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runUnitTests,
  runIntegrationTests,
  generateCoverageReport,
  checkTestFiles
};