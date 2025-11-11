/**
 * 批量操作路由
 * 处理批量创建、更新、删除账单等请求
 */

const express = require('express');
const router = express.Router();
const batchOperationService = require('../services/batch-operation-service');
const { authenticateToken } = require('../middleware/auth-middleware');
const { logger } = require('../config/logger');

// 批量创建账单
router.post('/bills', authenticateToken, async (req, res) => {
  try {
    const { bills } = req.body;
    
    // 验证请求参数
    if (!bills || !Array.isArray(bills) || bills.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的账单数组'
      });
    }
    
    // 限制批量大小
    const maxBatchSize = 1000;
    if (bills.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        message: `批量大小不能超过${maxBatchSize}条记录`
      });
    }
    
    // 执行批量创建
    const result = await batchOperationService.batchCreateBills(bills);
    
    // 返回结果
    res.status(result.success ? 201 : 400).json({
      success: result.success,
      message: result.success ? '批量创建账单成功' : '批量创建账单部分失败',
      data: {
        operationId: result.operationId,
        processedCount: result.processedCount,
        totalCount: result.totalCount,
        errorCount: result.errorCount,
        duration: result.duration,
        errors: result.errors
      }
    });
  } catch (error) {
    logger.error('批量创建账单路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 批量更新账单
router.put('/bills', authenticateToken, async (req, res) => {
  try {
    const { updates } = req.body;
    
    // 验证请求参数
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的更新数组'
      });
    }
    
    // 验证每个更新项是否包含ID
    for (const update of updates) {
      if (!update.id) {
        return res.status(400).json({
          success: false,
          message: '每个更新项必须包含ID'
        });
      }
    }
    
    // 限制批量大小
    const maxBatchSize = 1000;
    if (updates.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        message: `批量大小不能超过${maxBatchSize}条记录`
      });
    }
    
    // 执行批量更新
    const result = await batchOperationService.batchUpdateBills(updates);
    
    // 返回结果
    res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.success ? '批量更新账单成功' : '批量更新账单部分失败',
      data: {
        operationId: result.operationId,
        processedCount: result.processedCount,
        totalCount: result.totalCount,
        errorCount: result.errorCount,
        duration: result.duration,
        errors: result.errors
      }
    });
  } catch (error) {
    logger.error('批量更新账单路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 批量删除账单
router.delete('/bills', authenticateToken, async (req, res) => {
  try {
    const { billIds } = req.body;
    
    // 验证请求参数
    if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的账单ID数组'
      });
    }
    
    // 验证每个ID是否为数字
    for (const billId of billIds) {
      if (isNaN(parseInt(billId))) {
        return res.status(400).json({
          success: false,
          message: '账单ID必须是有效数字'
        });
      }
    }
    
    // 限制批量大小
    const maxBatchSize = 1000;
    if (billIds.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        message: `批量大小不能超过${maxBatchSize}条记录`
      });
    }
    
    // 执行批量删除
    const result = await batchOperationService.batchDeleteBills(billIds);
    
    // 返回结果
    res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.success ? '批量删除账单成功' : '批量删除账单部分失败',
      data: {
        operationId: result.operationId,
        processedCount: result.processedCount,
        totalCount: result.totalCount,
        errorCount: result.errorCount,
        duration: result.duration,
        errors: result.errors
      }
    });
  } catch (error) {
    logger.error('批量删除账单路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取批量操作状态
router.get('/operations/:operationId', authenticateToken, async (req, res) => {
  try {
    const { operationId } = req.params;
    
    // 获取操作状态
    const status = batchOperationService.getOperationStatus(operationId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: '操作不存在'
      });
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('获取批量操作状态路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;