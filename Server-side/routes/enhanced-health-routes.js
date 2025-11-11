const express = require('express');
const router = express.Router();
const enhancedHealthController = require('../controllers/enhanced-health-controller');

/**
 * 增强健康检查路由
 * 提供更详细的系统状态信息和健康检查功能
 */

// 基础健康检查端点
router.get('/health', enhancedHealthController.basicHealthCheck);

// 详细系统状态检查端点
router.get('/health/detailed', enhancedHealthController.detailedSystemStatus);

// 服务依赖健康检查端点
router.get('/health/dependencies', enhancedHealthController.serviceDependenciesCheck);

// 性能指标检查端点
router.get('/health/performance', enhancedHealthController.performanceMetricsCheck);

// 健康检查页面端点
router.get('/health-page', enhancedHealthController.healthCheckPage);

module.exports = router;