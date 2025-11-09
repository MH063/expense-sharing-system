const { logger } = require('../config/logger');
const os = require('os');
const process = require('process');

/**
 * 收集系统性能指标
 * @returns {Object} 系统性能指标对象
 */
function collectSystemMetrics() {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 获取系统负载
    const loadAvg = os.loadavg();
    
    // 获取系统内存信息
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // 获取系统运行时间
    const uptime = os.uptime();
    
    // 获取进程信息
    const processUptime = process.uptime();
    
    // 计算内存使用百分比
    const memUsagePercent = (usedMem / totalMem * 100).toFixed(2);
    
    // 计算进程内存使用百分比
    const processMemUsagePercent = (memUsage.rss / totalMem * 100).toFixed(2);
    
    // 获取CPU核心数
    const cpuCount = os.cpus().length;
    
    // 获取网络接口信息
    const networkInterfaces = os.networkInterfaces();
    
    // 获取系统平台信息
    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();
    
    // 获取当前用户信息
    const userInfo = os.userInfo();
    
    // 获取系统目录信息
    const tmpDir = os.tmpdir();
    const homeDir = os.homedir();
    
    // 获取主机名
    const hostname = os.hostname();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: parseFloat(memUsagePercent),
        process: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          usagePercent: parseFloat(processMemUsagePercent)
        }
      },
      cpu: {
        count: cpuCount,
        loadAverage: loadAvg,
        usage: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      system: {
        uptime: uptime,
        platform: platform,
        arch: arch,
        release: release,
        hostname: hostname,
        userInfo: {
          username: userInfo.username,
          uid: userInfo.uid,
          gid: userInfo.gid,
          shell: userInfo.shell,
          homedir: userInfo.homedir
        },
        directories: {
          tmpdir: tmpDir,
          homedir: homeDir
        }
      },
      process: {
        uptime: processUptime,
        pid: process.pid,
        version: process.version,
        title: process.title,
        execPath: process.execPath,
        execArgv: process.execArgv,
        argv: process.argv
      },
      network: networkInterfaces
    };
    
    logger.debug('系统性能指标收集完成', { timestamp: metrics.timestamp });
    return metrics;
  } catch (error) {
    logger.error('收集系统性能指标失败:', error);
    throw error;
  }
}

/**
 * 获取系统健康状态
 * @returns {Object} 系统健康状态对象
 */
function getSystemHealthStatus() {
  try {
    const metrics = collectSystemMetrics();
    
    // 定义健康状态阈值
    const thresholds = {
      memoryUsageWarning: 80, // 内存使用率超过80%为警告
      memoryUsageCritical: 95, // 内存使用率超过95%为严重
      loadAverageWarning: os.cpus().length * 0.8, // 负载平均值超过CPU核心数的80%为警告
      loadAverageCritical: os.cpus().length, // 负载平均值超过CPU核心数为严重
      diskSpaceWarning: 90, // 磁盘使用率超过90%为警告
      diskSpaceCritical: 95 // 磁盘使用率超过95%为严重
    };
    
    // 评估健康状态
    let healthStatus = 'healthy'; // healthy, warning, critical
    let issues = [];
    
    // 检查内存使用率
    if (metrics.memory.usagePercent > thresholds.memoryUsageCritical) {
      healthStatus = 'critical';
      issues.push({
        type: 'memory',
        severity: 'critical',
        message: `系统内存使用率过高: ${metrics.memory.usagePercent}%`,
        threshold: thresholds.memoryUsageCritical
      });
    } else if (metrics.memory.usagePercent > thresholds.memoryUsageWarning) {
      if (healthStatus === 'healthy') healthStatus = 'warning';
      issues.push({
        type: 'memory',
        severity: 'warning',
        message: `系统内存使用率较高: ${metrics.memory.usagePercent}%`,
        threshold: thresholds.memoryUsageWarning
      });
    }
    
    // 检查负载平均值
    if (metrics.cpu.loadAverage[0] > thresholds.loadAverageCritical) {
      healthStatus = 'critical';
      issues.push({
        type: 'cpu',
        severity: 'critical',
        message: `系统负载过高: ${metrics.cpu.loadAverage[0].toFixed(2)}`,
        threshold: thresholds.loadAverageCritical
      });
    } else if (metrics.cpu.loadAverage[0] > thresholds.loadAverageWarning) {
      if (healthStatus === 'healthy') healthStatus = 'warning';
      issues.push({
        type: 'cpu',
        severity: 'warning',
        message: `系统负载较高: ${metrics.cpu.loadAverage[0].toFixed(2)}`,
        threshold: thresholds.loadAverageWarning
      });
    }
    
    const healthStatusObj = {
      timestamp: new Date().toISOString(),
      status: healthStatus,
      issues: issues,
      metrics: metrics,
      thresholds: thresholds
    };
    
    logger.info('系统健康状态评估完成', { 
      status: healthStatus, 
      issuesCount: issues.length,
      timestamp: healthStatusObj.timestamp
    });
    
    return healthStatusObj;
  } catch (error) {
    logger.error('获取系统健康状态失败:', error);
    throw error;
  }
}

/**
 * 格式化字节数为人类可读格式
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间为人类可读格式
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的字符串
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);
  
  let uptime = '';
  if (days > 0) uptime += `${days}天 `;
  if (hours > 0) uptime += `${hours}小时 `;
  if (minutes > 0) uptime += `${minutes}分钟 `;
  if (secs > 0 || uptime === '') uptime += `${secs}秒`;
  
  return uptime.trim();
}

module.exports = {
  collectSystemMetrics,
  getSystemHealthStatus,
  formatBytes,
  formatUptime
};