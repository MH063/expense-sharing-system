/**
 * 批量操作优化服务
 * 提高大数据量处理的效率
 */

const { getRedisClient } = require('../config/redis');
const { logger } = require('../config/logger');
const { pool } = require('../config/db');

/**
 * 批量操作优化服务类
 */
class BatchOperationService {
  constructor() {
    // 批量操作配置
    this.batchConfig = {
      // 默认批量大小
      defaultBatchSize: 100,
      
      // 最大批量大小
      maxBatchSize: 1000,
      
      // 批量操作超时时间（毫秒）
      batchTimeout: 30000,
      
      // 并发批量操作数量
      concurrentBatches: 5,
      
      // 批量操作重试次数
      maxRetries: 3,
      
      // 批量操作重试间隔（毫秒）
      retryInterval: 1000
    };
    
    // 批量操作状态
    this.batchOperations = new Map();
  }

  /**
   * 批量创建账单
   * @param {Array<Object>} bills - 账单数组
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 操作结果
   */
  async batchCreateBills(bills, options = {}) {
    const config = {
      batchSize: options.batchSize || this.batchConfig.defaultBatchSize,
      concurrentBatches: options.concurrentBatches || this.batchConfig.concurrentBatches,
      ...options
    };
    
    const operationId = this.generateOperationId('batch_create_bills');
    const startTime = Date.now();
    
    try {
      logger.info(`开始批量创建账单操作: ${operationId}, 账单数量: ${bills.length}`);
      
      // 验证账单数据
      const validationResults = await this.validateBills(bills);
      if (validationResults.errors.length > 0) {
        return {
          success: false,
          operationId,
          error: '账单数据验证失败',
          validationErrors: validationResults.errors,
          processedCount: 0,
          totalCount: bills.length
        };
      }
      
      // 分批处理
      const batches = this.createBatches(validationResults.validBills, config.batchSize);
      const results = await this.processBatchesConcurrently(
        batches,
        this.processCreateBillsBatch.bind(this),
        config.concurrentBatches
      );
      
      // 汇总结果
      const successCount = results.reduce((sum, result) => sum + result.successCount, 0);
      const errorCount = results.reduce((sum, result) => sum + result.errorCount, 0);
      const errors = results.flatMap(result => result.errors);
      
      const duration = Date.now() - startTime;
      
      logger.info(`批量创建账单操作完成: ${operationId}, 成功: ${successCount}, 失败: ${errorCount}, 耗时: ${duration}ms`);
      
      return {
        success: errorCount === 0,
        operationId,
        processedCount: successCount,
        errorCount,
        totalCount: bills.length,
        errors,
        duration
      };
    } catch (error) {
      logger.error(`批量创建账单操作失败: ${operationId}`, error);
      return {
        success: false,
        operationId,
        error: error.message,
        processedCount: 0,
        totalCount: bills.length
      };
    }
  }

  /**
   * 批量更新账单
   * @param {Array<Object>} updates - 更新数组，每项包含id和更新数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 操作结果
   */
  async batchUpdateBills(updates, options = {}) {
    const config = {
      batchSize: options.batchSize || this.batchConfig.defaultBatchSize,
      concurrentBatches: options.concurrentBatches || this.batchConfig.concurrentBatches,
      ...options
    };
    
    const operationId = this.generateOperationId('batch_update_bills');
    const startTime = Date.now();
    
    try {
      logger.info(`开始批量更新账单操作: ${operationId}, 更新数量: ${updates.length}`);
      
      // 分批处理
      const batches = this.createBatches(updates, config.batchSize);
      const results = await this.processBatchesConcurrently(
        batches,
        this.processUpdateBillsBatch.bind(this),
        config.concurrentBatches
      );
      
      // 汇总结果
      const successCount = results.reduce((sum, result) => sum + result.successCount, 0);
      const errorCount = results.reduce((sum, result) => sum + result.errorCount, 0);
      const errors = results.flatMap(result => result.errors);
      
      // 清除相关缓存
      const roomIds = [...new Set(updates.map(update => update.roomId).filter(id => id))];
      for (const roomId of roomIds) {
        await this.clearRoomCache(roomId);
      }
      
      const duration = Date.now() - startTime;
      
      logger.info(`批量更新账单操作完成: ${operationId}, 成功: ${successCount}, 失败: ${errorCount}, 耗时: ${duration}ms`);
      
      return {
        success: errorCount === 0,
        operationId,
        processedCount: successCount,
        errorCount,
        totalCount: updates.length,
        errors,
        duration
      };
    } catch (error) {
      logger.error(`批量更新账单操作失败: ${operationId}`, error);
      return {
        success: false,
        operationId,
        error: error.message,
        processedCount: 0,
        totalCount: updates.length
      };
    }
  }

  /**
   * 批量删除账单
   * @param {Array<number>} billIds - 账单ID数组
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 操作结果
   */
  async batchDeleteBills(billIds, options = {}) {
    const config = {
      batchSize: options.batchSize || this.batchConfig.defaultBatchSize,
      concurrentBatches: options.concurrentBatches || this.batchConfig.concurrentBatches,
      ...options
    };
    
    const operationId = this.generateOperationId('batch_delete_bills');
    const startTime = Date.now();
    
    try {
      logger.info(`开始批量删除账单操作: ${operationId}, 删除数量: ${billIds.length}`);
      
      // 先获取账单信息，用于清除缓存
      const billsInfo = await this.getBillsInfo(billIds);
      const roomIds = [...new Set(billsInfo.map(bill => bill.roomId).filter(id => id))];
      
      // 分批处理
      const batches = this.createBatches(billIds, config.batchSize);
      const results = await this.processBatchesConcurrently(
        batches,
        this.processDeleteBillsBatch.bind(this),
        config.concurrentBatches
      );
      
      // 汇总结果
      const successCount = results.reduce((sum, result) => sum + result.successCount, 0);
      const errorCount = results.reduce((sum, result) => sum + result.errorCount, 0);
      const errors = results.flatMap(result => result.errors);
      
      // 清除相关缓存
      for (const roomId of roomIds) {
        await this.clearRoomCache(roomId);
      }
      
      const duration = Date.now() - startTime;
      
      logger.info(`批量删除账单操作完成: ${operationId}, 成功: ${successCount}, 失败: ${errorCount}, 耗时: ${duration}ms`);
      
      return {
        success: errorCount === 0,
        operationId,
        processedCount: successCount,
        errorCount,
        totalCount: billIds.length,
        errors,
        duration
      };
    } catch (error) {
      logger.error(`批量删除账单操作失败: ${operationId}`, error);
      return {
        success: false,
        operationId,
        error: error.message,
        processedCount: 0,
        totalCount: billIds.length
      };
    }
  }

  /**
   * 验证账单数据
   * @param {Array<Object>} bills - 账单数组
   * @returns {Promise<Object>} 验证结果
   */
  async validateBills(bills) {
    const validBills = [];
    const errors = [];
    
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      const billErrors = [];
      
      // 基本字段验证
      if (!bill.title || bill.title.trim() === '') {
        billErrors.push('账单标题不能为空');
      }
      
      if (!bill.amount || isNaN(parseFloat(bill.amount)) || parseFloat(bill.amount) <= 0) {
        billErrors.push('账单金额必须是大于0的数字');
      }
      
      if (!bill.roomId || isNaN(parseInt(bill.roomId))) {
        billErrors.push('房间ID必须是有效数字');
      }
      
      if (!bill.payerId || isNaN(parseInt(bill.payerId))) {
        billErrors.push('付款人ID必须是有效数字');
      }
      
      // 验证日期格式
      if (bill.date && isNaN(Date.parse(bill.date))) {
        billErrors.push('账单日期格式无效');
      }
      
      // 验证分账信息
      if (bill.splits && Array.isArray(bill.splits)) {
        if (bill.splits.length === 0) {
          billErrors.push('分账信息不能为空');
        } else {
          const totalSplitAmount = bill.splits.reduce((sum, split) => {
            return sum + (parseFloat(split.amount) || 0);
          }, 0);
          
          const billAmount = parseFloat(bill.amount);
          if (Math.abs(totalSplitAmount - billAmount) > 0.01) {
            billErrors.push('分账金额总和与账单金额不匹配');
          }
        }
      }
      
      if (billErrors.length > 0) {
        errors.push({
          index: i,
          bill,
          errors: billErrors
        });
      } else {
        validBills.push(bill);
      }
    }
    
    return { validBills, errors };
  }

  /**
   * 创建批次
   * @param {Array} items - 项目数组
   * @param {number} batchSize - 批次大小
   * @returns {Array<Array>} 批次数组
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 并发处理批次
   * @param {Array<Array>} batches - 批次数组
   * @param {Function} processor - 批次处理函数
   * @param {number} concurrency - 并发数量
   * @returns {Promise<Array>} 处理结果数组
   */
  async processBatchesConcurrently(batches, processor, concurrency) {
    const results = [];
    
    // 控制并发数量
    for (let i = 0; i < batches.length; i += concurrency) {
      const concurrentBatches = batches.slice(i, i + concurrency);
      const batchPromises = concurrentBatches.map(batch => processor(batch));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * 处理创建账单批次
   * @param {Array<Object>} batch - 账单批次
   * @returns {Promise<Object>} 处理结果
   */
  async processCreateBillsBatch(batch) {
    const result = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };
    
    let retries = 0;
    while (retries <= this.batchConfig.maxRetries) {
      try {
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          
          for (const bill of batch) {
            try {
              // 插入账单
              const billQuery = `
                INSERT INTO bills (title, description, amount, date, category, room_id, payer_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                RETURNING id
              `;
              const billValues = [
                bill.title,
                bill.description || '',
                bill.amount,
                bill.date || new Date().toISOString().split('T')[0],
                bill.category || '其他',
                bill.roomId,
                bill.payerId
              ];
              
              const billResult = await client.query(billQuery, billValues);
              const billId = billResult.rows[0].id;
              
              // 插入分账记录
              if (bill.splits && Array.isArray(bill.splits)) {
                for (const split of bill.splits) {
                  const splitQuery = `
                    INSERT INTO splits (bill_id, user_id, amount, percentage, created_at)
                    VALUES ($1, $2, $3, $4, NOW())
                  `;
                  const splitValues = [
                    billId,
                    split.userId,
                    split.amount,
                    split.percentage || 0
                  ];
                  
                  await client.query(splitQuery, splitValues);
                }
              }
              
              result.successCount++;
            } catch (error) {
              result.errorCount++;
              result.errors.push({
                bill,
                error: error.message
              });
              logger.error(`创建账单失败`, { bill, error: error.message });
            }
          }
          
          await client.query('COMMIT');
          break; // 成功，退出重试循环
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        retries++;
        if (retries > this.batchConfig.maxRetries) {
          logger.error(`处理创建账单批次失败，已达到最大重试次数`, error);
          throw error;
        } else {
          logger.warn(`处理创建账单批次失败，正在重试 (${retries}/${this.batchConfig.maxRetries})`, error);
          await new Promise(resolve => setTimeout(resolve, this.batchConfig.retryInterval));
        }
      }
    }
    
    return result;
  }

  /**
   * 处理更新账单批次
   * @param {Array<Object>} batch - 更新批次
   * @returns {Promise<Object>} 处理结果
   */
  async processUpdateBillsBatch(batch) {
    const result = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };
    
    let retries = 0;
    while (retries <= this.batchConfig.maxRetries) {
      try {
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          
          for (const update of batch) {
            try {
              const { id, ...updateData } = update;
              
              // 构建更新字段
              const updateFields = [];
              const updateValues = [];
              let paramIndex = 1;
              
              if (updateData.title !== undefined) {
                updateFields.push(`title = $${paramIndex++}`);
                updateValues.push(updateData.title);
              }
              
              if (updateData.description !== undefined) {
                updateFields.push(`description = $${paramIndex++}`);
                updateValues.push(updateData.description);
              }
              
              if (updateData.amount !== undefined) {
                updateFields.push(`amount = $${paramIndex++}`);
                updateValues.push(updateData.amount);
              }
              
              if (updateData.date !== undefined) {
                updateFields.push(`date = $${paramIndex++}`);
                updateValues.push(updateData.date);
              }
              
              if (updateData.category !== undefined) {
                updateFields.push(`category = $${paramIndex++}`);
                updateValues.push(updateData.category);
              }
              
              if (updateData.status !== undefined) {
                updateFields.push(`status = $${paramIndex++}`);
                updateValues.push(updateData.status);
              }
              
              // 添加更新时间
              updateFields.push(`updated_at = NOW()`);
              
              // 添加ID条件
              updateValues.push(id);
              
              // 更新账单
              const updateQuery = `
                UPDATE bills
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
              `;
              
              await client.query(updateQuery, updateValues);
              
              // 更新分账记录（如果提供）
              if (updateData.splits && Array.isArray(updateData.splits)) {
                // 先删除原有分账记录
                await client.query('DELETE FROM splits WHERE bill_id = $1', [id]);
                
                // 插入新的分账记录
                for (const split of updateData.splits) {
                  const splitQuery = `
                    INSERT INTO splits (bill_id, user_id, amount, percentage, created_at)
                    VALUES ($1, $2, $3, $4, NOW())
                  `;
                  const splitValues = [
                    id,
                    split.userId,
                    split.amount,
                    split.percentage || 0
                  ];
                  
                  await client.query(splitQuery, splitValues);
                }
              }
              
              result.successCount++;
            } catch (error) {
              result.errorCount++;
              result.errors.push({
                update,
                error: error.message
              });
              logger.error(`更新账单失败`, { update, error: error.message });
            }
          }
          
          await client.query('COMMIT');
          break; // 成功，退出重试循环
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        retries++;
        if (retries > this.batchConfig.maxRetries) {
          logger.error(`处理更新账单批次失败，已达到最大重试次数`, error);
          throw error;
        } else {
          logger.warn(`处理更新账单批次失败，正在重试 (${retries}/${this.batchConfig.maxRetries})`, error);
          await new Promise(resolve => setTimeout(resolve, this.batchConfig.retryInterval));
        }
      }
    }
    
    return result;
  }

  /**
   * 处理删除账单批次
   * @param {Array<number>} batch - 账单ID批次
   * @returns {Promise<Object>} 处理结果
   */
  async processDeleteBillsBatch(batch) {
    const result = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };
    
    let retries = 0;
    while (retries <= this.batchConfig.maxRetries) {
      try {
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          
          for (const billId of batch) {
            try {
              // 先删除分账记录
              await client.query('DELETE FROM splits WHERE bill_id = $1', [billId]);
              
              // 删除账单
              await client.query('DELETE FROM bills WHERE id = $1', [billId]);
              
              result.successCount++;
            } catch (error) {
              result.errorCount++;
              result.errors.push({
                billId,
                error: error.message
              });
              logger.error(`删除账单失败`, { billId, error: error.message });
            }
          }
          
          await client.query('COMMIT');
          break; // 成功，退出重试循环
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        retries++;
        if (retries > this.batchConfig.maxRetries) {
          logger.error(`处理删除账单批次失败，已达到最大重试次数`, error);
          throw error;
        } else {
          logger.warn(`处理删除账单批次失败，正在重试 (${retries}/${this.batchConfig.maxRetries})`, error);
          await new Promise(resolve => setTimeout(resolve, this.batchConfig.retryInterval));
        }
      }
    }
    
    return result;
  }

  /**
   * 获取账单信息
   * @param {Array<number>} billIds - 账单ID数组
   * @returns {Promise<Array>} 账单信息数组
   */
  async getBillsInfo(billIds) {
    if (billIds.length === 0) return [];
    
    const query = `
      SELECT id, room_id
      FROM bills
      WHERE id = ANY($1)
    `;
    
    try {
      const result = await pool.query(query, [billIds]);
      return result.rows;
    } catch (error) {
      logger.error('获取账单信息失败', error);
      return [];
    }
  }

  /**
   * 清除房间相关缓存
   * @param {number} roomId - 房间ID
   */
  async clearRoomCache(roomId) {
    try {
      const smartCacheMiddleware = require('./smart-cache-middleware');
      await smartCacheMiddleware.clearRoomCache(roomId);
    } catch (error) {
      logger.error(`清除房间缓存失败: ${roomId}`, error);
    }
  }

  /**
   * 生成操作ID
   * @param {string} operation - 操作类型
   * @returns {string} 操作ID
   */
  generateOperationId(operation) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${operation}_${timestamp}_${random}`;
  }

  /**
   * 获取批量操作状态
   * @param {string} operationId - 操作ID
   * @returns {Object|null} 操作状态
   */
  getOperationStatus(operationId) {
    return this.batchOperations.get(operationId) || null;
  }
}

// 创建单例实例
const batchOperationService = new BatchOperationService();

module.exports = batchOperationService;