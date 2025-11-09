/**
 * 系统性能预测工具
 * 提供系统负载预测功能
 */

/**
 * 预测系统负载
 * @param {Array} historicalData - 历史性能数据
 * @param {String} predictionType - 预测类型 ('cpu', 'memory', 'disk')
 * @param {Number} timeHorizon - 预测时间范围（小时）
 * @returns {Object} 预测结果
 */
function predictSystemLoad(historicalData, predictionType = 'cpu', timeHorizon = 1) {
  try {
    // 如果没有历史数据，返回默认预测
    if (!historicalData || historicalData.length === 0) {
      return {
        predictedValue: 50,
        confidence: 0.5,
        trend: 'stable',
        recommendations: ['收集更多历史数据以提高预测准确性']
      };
    }
    
    // 使用简单移动平均法进行预测
    const recentData = historicalData.slice(-10); // 取最近10个数据点
    const values = recentData.map(data => {
      switch (predictionType) {
        case 'cpu':
          return data.cpuUsage || 0;
        case 'memory':
          return data.memoryUsage || 0;
        case 'disk':
          return data.diskUsage || 0;
        default:
          return data.cpuUsage || 0;
      }
    });
    
    // 计算移动平均值
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    
    // 计算趋势
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstHalfAvg = firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length;
    
    let trend = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'decreasing';
    }
    
    // 计算置信度（基于数据的稳定性）
    const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(1, 1 - (stdDev / 100)));
    
    // 生成建议
    const recommendations = [];
    if (average > 80) {
      recommendations.push('系统负载较高，建议检查资源使用情况');
    } else if (average < 20) {
      recommendations.push('系统负载较低，可以考虑优化资源配置');
    }
    
    if (trend === 'increasing') {
      recommendations.push('系统负载呈上升趋势，建议监控资源使用情况');
    } else if (trend === 'decreasing') {
      recommendations.push('系统负载呈下降趋势，可以考虑优化资源配置');
    }
    
    return {
      predictedValue: Math.round(average),
      confidence: Math.round(confidence * 100) / 100,
      trend,
      recommendations
    };
  } catch (error) {
    throw new Error(`系统负载预测失败: ${error.message}`);
  }
}

/**
 * 预测系统性能瓶颈
 * @param {Array} cpuData - CPU使用率数据
 * @param {Array} memoryData - 内存使用率数据
 * @param {Array} diskData - 磁盘使用率数据
 * @returns {Array} 性能瓶颈预测
 */
function predictPerformanceBottlenecks(cpuData, memoryData, diskData) {
  try {
    const bottlenecks = [];
    
    // 预测CPU瓶颈
    const cpuPrediction = predictSystemLoad(cpuData, 'cpu');
    if (cpuPrediction.predictedValue > 85) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        predictedValue: cpuPrediction.predictedValue,
        message: '预测CPU使用率将超过85%，可能存在性能瓶颈'
      });
    } else if (cpuPrediction.predictedValue > 70) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'medium',
        predictedValue: cpuPrediction.predictedValue,
        message: '预测CPU使用率将超过70%，建议监控'
      });
    }
    
    // 预测内存瓶颈
    const memoryPrediction = predictSystemLoad(memoryData, 'memory');
    if (memoryPrediction.predictedValue > 85) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        predictedValue: memoryPrediction.predictedValue,
        message: '预测内存使用率将超过85%，可能存在性能瓶颈'
      });
    } else if (memoryPrediction.predictedValue > 70) {
      bottlenecks.push({
        type: 'memory',
        severity: 'medium',
        predictedValue: memoryPrediction.predictedValue,
        message: '预测内存使用率将超过70%，建议监控'
      });
    }
    
    // 预测磁盘瓶颈
    const diskPrediction = predictSystemLoad(diskData, 'disk');
    if (diskPrediction.predictedValue > 85) {
      bottlenecks.push({
        type: 'disk',
        severity: 'high',
        predictedValue: diskPrediction.predictedValue,
        message: '预测磁盘使用率将超过85%，可能存在性能瓶颈'
      });
    } else if (diskPrediction.predictedValue > 70) {
      bottlenecks.push({
        type: 'disk',
        severity: 'medium',
        predictedValue: diskPrediction.predictedValue,
        message: '预测磁盘使用率将超过70%，建议监控'
      });
    }
    
    return bottlenecks;
  } catch (error) {
    throw new Error(`性能瓶颈预测失败: ${error.message}`);
  }
}

/**
 * 预测系统容量需求
 * @param {Array} historicalData - 历史性能数据
 * @param {String} resourceType - 资源类型 ('cpu', 'memory', 'disk')
 * @param {Number} growthRate - 预期增长率（百分比）
 * @param {Number} timePeriod - 预测时间周期（天）
 * @returns {Object} 容量需求预测
 */
function predictCapacityRequirements(historicalData, resourceType, growthRate = 10, timePeriod = 30) {
  try {
    // 如果没有历史数据，返回默认预测
    if (!historicalData || historicalData.length === 0) {
      return {
        currentUsage: 50,
        predictedUsage: 55,
        requiredCapacity: 100,
        recommendations: ['收集更多历史数据以提高预测准确性']
      };
    }
    
    // 获取当前使用率
    const currentData = historicalData[historicalData.length - 1];
    let currentUsage = 0;
    switch (resourceType) {
      case 'cpu':
        currentUsage = currentData.cpuUsage || 0;
        break;
      case 'memory':
        currentUsage = currentData.memoryUsage || 0;
        break;
      case 'disk':
        currentUsage = currentData.diskUsage || 0;
        break;
      default:
        currentUsage = currentData.cpuUsage || 0;
    }
    
    // 计算预测使用率
    const predictedUsage = currentUsage * (1 + growthRate / 100);
    const requiredCapacity = Math.ceil(predictedUsage * 1.2); // 预留20%缓冲
    
    // 生成建议
    const recommendations = [];
    if (requiredCapacity > 90) {
      recommendations.push('预测资源使用率将超过90%，建议扩容');
    } else if (requiredCapacity > 75) {
      recommendations.push('预测资源使用率将超过75%，建议监控');
    }
    
    return {
      currentUsage: Math.round(currentUsage),
      predictedUsage: Math.round(predictedUsage),
      requiredCapacity: Math.min(100, requiredCapacity), // 最大不超过100%
      recommendations
    };
  } catch (error) {
    throw new Error(`容量需求预测失败: ${error.message}`);
  }
}

module.exports = {
  predictSystemLoad,
  predictPerformanceBottlenecks,
  predictCapacityRequirements
};