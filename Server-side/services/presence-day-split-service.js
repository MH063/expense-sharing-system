/**
 * 按在寝天数分摊服务
 * 处理基于在寝天数的费用分摊计算
 */

const logger = require('../config/logger');
const { query } = require('../config/db');
const { PrecisionCalculator } = require('./precision-calculator');

class PresenceDaySplitService {
  /**
   * 计算指定时间段内每个成员的在寝天数
   * @param {number} roomId - 寝室ID
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Promise<Array>} - 包含每个成员在寝天数的数组
   */
  static async calculatePresenceDays(roomId, startDate, endDate) {
    try {
      logger.info(`计算寝室 ${roomId} 在 ${startDate} 到 ${endDate} 期间各成员的在寝天数`);
      
      // 获取寝室所有成员
      const membersQuery = `
        SELECT rm.user_id, u.username
        FROM room_members rm
        JOIN users u ON rm.user_id = u.id
        WHERE rm.room_id = $1 AND rm.status = 'active'
      `;
      const membersResult = await query(membersQuery, [roomId]);
      
      if (membersResult.rows.length === 0) {
        throw new Error('寝室中没有找到活跃成员');
      }
      
      const members = membersResult.rows;
      const presenceDays = [];
      
      // 计算总天数
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      // 为每个成员计算在寝天数
      for (const member of members) {
        // 查询该成员在指定时间段内的离寝记录
        const leaveRecordsQuery = `
          SELECT leave_start_date, leave_end_date, leave_type
          FROM leave_records
          WHERE user_id = $1 AND room_id = $2 AND status = 'approved'
          AND (
            (leave_start_date <= $3 AND leave_end_date >= $3) OR
            (leave_start_date <= $4 AND leave_end_date >= $4) OR
            (leave_start_date >= $3 AND leave_end_date <= $4)
          )
          ORDER BY leave_start_date
        `;
        
        const leaveRecordsResult = await query(leaveRecordsQuery, [
          member.user_id, roomId, startDate, endDate
        ]);
        
        // 计算离寝总天数
        let leaveDays = 0;
        for (const record of leaveRecordsResult.rows) {
          const recordStart = new Date(record.leave_start_date);
          const recordEnd = new Date(record.leave_end_date);
          
          // 计算与费用周期重叠的天数
          const overlapStart = recordStart < start ? start : recordStart;
          const overlapEnd = recordEnd > end ? end : recordEnd;
          
          if (overlapStart <= overlapEnd) {
            const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
            leaveDays += overlapDays;
          }
        }
        
        // 计算在寝天数
        const presentDays = Math.max(0, totalDays - leaveDays);
        
        presenceDays.push({
          user_id: member.user_id,
          username: member.username,
          total_days: totalDays,
          leave_days: leaveDays,
          present_days: presentDays
        });
      }
      
      return presenceDays;
    } catch (error) {
      logger.error('计算在寝天数失败:', error);
      throw error;
    }
  }

  /**
   * 基于在寝天数计算费用分摊
   * @param {number} totalAmount - 总费用金额
   * @param {Array} presenceDays - 包含每个成员在寝天数的数组
   * @param {number} precision - 精度位数，默认为2
   * @returns {Promise<Array>} - 包含每个成员分摊金额的数组
   */
  static async calculateSplitByPresenceDays(totalAmount, presenceDays, precision = 2) {
    try {
      logger.info(`基于在寝天数计算费用分摊，总金额: ${totalAmount}`);
      
      // 计算总在寝天数
      const totalPresentDays = presenceDays.reduce((sum, member) => sum + member.present_days, 0);
      
      if (totalPresentDays === 0) {
        throw new Error('所有成员在寝天数都为0，无法进行分摊');
      }
      
      // 使用高精度计算每在寝一天的费用
      const costPerDay = PrecisionCalculator.divide(totalAmount, totalPresentDays);
      
      // 计算每个成员的分摊金额
      const splits = [];
      let allocatedAmount = 0;
      
      for (let i = 0; i < presenceDays.length; i++) {
        const member = presenceDays[i];
        let splitAmount;
        
        // 最后一个成员使用尾差处理，确保总和等于总金额
        if (i === presenceDays.length - 1) {
          splitAmount = PrecisionCalculator.subtract(totalAmount, allocatedAmount);
        } else {
          splitAmount = PrecisionCalculator.multiply(member.present_days, costPerDay);
          allocatedAmount = PrecisionCalculator.add(allocatedAmount, splitAmount);
        }
        
        splits.push({
          user_id: member.user_id,
          username: member.username,
          present_days: member.present_days,
          split_ratio: PrecisionCalculator.divide(member.present_days, totalPresentDays),
          split_amount: PrecisionCalculator.round(splitAmount, precision)
        });
      }
      
      return splits;
    } catch (error) {
      logger.error('基于在寝天数计算费用分摊失败:', error);
      throw error;
    }
  }

  /**
   * 计算按在寝天数分摊
   * @param {number} roomId - 寝室ID
   * @param {number} totalAmount - 总金额
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Promise<Array>} - 包含每个成员分摊金额的数组
   */
  static async calculateSplit(roomId, totalAmount, startDate, endDate) {
    try {
      // 计算每个成员的在寝天数
      const presenceDays = await this.calculatePresenceDays(roomId, startDate, endDate);
      
      // 基于在寝天数计算费用分摊
      const splits = await this.calculateSplitByPresenceDays(totalAmount, presenceDays);
      
      // 获取用户详细信息
      const userIds = splits.map(split => split.user_id);
      const usersQuery = `
        SELECT id, username, name 
        FROM users 
        WHERE id = ANY($1)
      `;
      const usersResult = await query(usersQuery, [userIds]);
      const usersMap = new Map();
      usersResult.rows.forEach(user => {
        usersMap.set(user.id, user);
      });
      
      // 组合返回结果
      const result = splits.map(split => {
        const user = usersMap.get(split.user_id);
        const presenceDayInfo = presenceDays.find(p => p.user_id === split.user_id);
        return {
          user_id: split.user_id,
          username: user ? user.username : '',
          name: user ? user.name : '',
          amount: split.split_amount,
          presence_days: presenceDayInfo ? presenceDayInfo.present_days : 0,
          total_days: presenceDayInfo ? presenceDayInfo.total_days : 0,
          split_ratio: split.split_ratio
        };
      });
      
      return result;
    } catch (error) {
      logger.error('计算按在寝天数分摊失败:', error);
      throw error;
    }
  }

  /**
   * 创建离寝记录
   * @param {number} userId - 用户ID
   * @param {number} roomId - 寝室ID
   * @param {string} startDate - 离寝开始日期
   * @param {string} endDate - 离寝结束日期
   * @param {string} leaveType - 离寝类型
   * @param {string} reason - 离寝原因
   * @returns {Promise<Object>} - 创建的离寝记录
   */
  static async createLeaveRecord(userId, roomId, startDate, endDate, leaveType, reason) {
    try {
      logger.info(`创建离寝记录: 用户${userId}, 寝室${roomId}, ${startDate}到${endDate}`);
      
      const insertQuery = `
        INSERT INTO leave_records (
          user_id, room_id, leave_start_date, leave_end_date, 
          leave_type, reason, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        userId, roomId, startDate, endDate, leaveType, reason
      ]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('创建离寝记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户离寝记录
   * @param {number} userId - 用户ID
   * @param {number} roomId - 寝室ID
   * @returns {Promise<Array>} - 离寝记录数组
   */
  static async getLeaveRecords(userId, roomId) {
    try {
      logger.info(`获取用户${userId}在寝室${roomId}的离寝记录`);
      
      const selectQuery = `
        SELECT * FROM leave_records
        WHERE user_id = $1 AND room_id = $2
        ORDER BY leave_start_date DESC
      `;
      
      const result = await query(selectQuery, [userId, roomId]);
      return result.rows;
    } catch (error) {
      logger.error('获取离寝记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新离寝记录状态
   * @param {number} recordId - 记录ID
   * @param {string} status - 新状态
   * @param {number} reviewerId - 审核人ID
   * @returns {Promise<Object>} - 更新后的记录
   */
  static async updateLeaveRecordStatus(recordId, status, reviewerId) {
    try {
      logger.info(`更新离寝记录${recordId}状态为${status}`);
      
      const updateQuery = `
        UPDATE leave_records
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      
      const result = await query(updateQuery, [status, reviewerId, recordId]);
      return result.rows[0];
    } catch (error) {
      logger.error('更新离寝记录状态失败:', error);
      throw error;
    }
  }
}

module.exports = PresenceDaySplitService;