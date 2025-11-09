/**
 * 分摊计算工具类
 * 用于处理各种费用分摊计算逻辑
 */
export class SplitCalculator {
  /**
   * 基于在寝天数的费用分摊计算
   * @param {Object} params - 计算参数
   * @param {Array} params.members - 成员列表，包含id和stayDays属性
   * @param {number} params.totalAmount - 总金额
   * @param {string} params.expenseType - 费用类型
   * @param {Object} params.customSettings - 自定义设置
   * @returns {Object} 分摊结果
   */
  static calculateByStayDays({ members, totalAmount, expenseType, customSettings = {} }) {
    if (!members || members.length === 0) {
      return { success: false, message: '成员列表不能为空' }
    }
    
    if (totalAmount <= 0) {
      return { success: false, message: '总金额必须大于0' }
    }
    
    // 计算总在寝天数
    const totalStayDays = members.reduce((sum, member) => sum + (member.stayDays || 0), 0)
    
    if (totalStayDays <= 0) {
      return { success: false, message: '总在寝天数必须大于0' }
    }
    
    // 根据费用类型应用特定计算规则
    let calculationResult = this.applyExpenseTypeRules({
      members,
      totalAmount,
      totalStayDays,
      expenseType,
      customSettings
    })
    
    if (!calculationResult.success) {
      return calculationResult
    }
    
    // 应用舍入规则和差额分配
    const { splitAmounts, roundingRule = 'ceil' } = calculationResult
    
    return this.applyRoundingAndRemainder({
      members,
      splitAmounts,
      totalAmount,
      roundingRule
    })
  }
  
  /**
   * 根据费用类型应用特定计算规则
   * @param {Object} params - 计算参数
   * @returns {Object} 计算结果
   */
  static applyExpenseTypeRules({ members, totalAmount, totalStayDays, expenseType, customSettings }) {
    const splitAmounts = {}
    
    switch (expenseType) {
      case 'lighting':
        // 照明费用：完全基于在寝天数分摊
        members.forEach(member => {
          const ratio = member.stayDays / totalStayDays
          splitAmounts[member.id] = totalAmount * ratio
        })
        return { success: true, splitAmounts, roundingRule: 'ceil' }
        
      case 'host':
        // 主机费用：基于在寝天数和主机使用比例
        if (!customSettings.hostUsageRatio) {
          return { success: false, message: '主机费用需要提供主机使用比例' }
        }
        
        members.forEach(member => {
          const stayDaysRatio = member.stayDays / totalStayDays
          const hostUsageRatio = customSettings.hostUsageRatio[member.id] || 0
          const combinedRatio = stayDaysRatio * 0.7 + hostUsageRatio * 0.3 // 70%在寝天数，30%主机使用
          splitAmounts[member.id] = totalAmount * combinedRatio
        })
        return { success: true, splitAmounts, roundingRule: 'ceil' }
        
      case 'air_conditioner':
        // 空调费用：基于在寝天数，但考虑最低使用天数
        const minUsageDays = customSettings.minUsageDays || 15 // 默认最低使用15天
        
        members.forEach(member => {
          // 即使在寝天数少，也按最低使用天数计算
          const effectiveDays = Math.max(member.stayDays, minUsageDays)
          const ratio = effectiveDays / members.reduce((sum, m) => sum + Math.max(m.stayDays, minUsageDays), 0)
          splitAmounts[member.id] = totalAmount * ratio
        })
        return { success: true, splitAmounts, roundingRule: 'ceil' }
        
      case 'water':
        // 水费：基于在寝天数，但考虑基础用量
        const baseUsage = customSettings.baseUsage || 10 // 默认基础用量10吨
        const actualUsage = customSettings.actualUsage || 20 // 默认实际用量20吨
        
        // 基础费用按人均分摊，超出部分按在寝天数分摊
        const baseAmount = (baseUsage / actualUsage) * totalAmount
        const extraAmount = totalAmount - baseAmount
        
        members.forEach(member => {
          const baseShare = baseAmount / members.length
          const stayDaysRatio = member.stayDays / totalStayDays
          const extraShare = extraAmount * stayDaysRatio
          splitAmounts[member.id] = baseShare + extraShare
        })
        return { success: true, splitAmounts, roundingRule: 'ceil' }
        
      case 'electricity':
        // 电费：基于在寝天数，但考虑基础用电量
        const baseElectricity = customSettings.baseElectricity || 50 // 默认基础用电50度
        const actualElectricity = customSettings.actualElectricity || 150 // 默认实际用电150度
        
        // 基础费用按人均分摊，超出部分按在寝天数分摊
        const baseElectricityAmount = (baseElectricity / actualElectricity) * totalAmount
        const extraElectricityAmount = totalAmount - baseElectricityAmount
        
        members.forEach(member => {
          const baseShare = baseElectricityAmount / members.length
          const stayDaysRatio = member.stayDays / totalStayDays
          const extraShare = extraElectricityAmount * stayDaysRatio
          splitAmounts[member.id] = baseShare + extraShare
        })
        return { success: true, splitAmounts, roundingRule: 'ceil' }
        
      case 'internet':
        // 网费：固定费用，按人均分摊
        members.forEach(member => {
          splitAmounts[member.id] = totalAmount / members.length
        })
        return { success: true, splitAmounts, roundingRule: 'ceil' }
        
      case 'custom':
        // 自定义费用：根据自定义规则计算
        return this.applyCustomRules({ members, totalAmount, totalStayDays, customSettings })
        
      default:
        // 默认：完全基于在寝天数分摊
        members.forEach(member => {
          const ratio = member.stayDays / totalStayDays
          splitAmounts[member.id] = totalAmount * ratio
        })
        return { success: true, splitAmounts, roundingRule: 'ceil' }
    }
  }
  
  /**
   * 应用自定义规则
   * @param {Object} params - 计算参数
   * @returns {Object} 计算结果
   */
  static applyCustomRules({ members, totalAmount, totalStayDays, customSettings }) {
    if (!customSettings.customRule) {
      return { success: false, message: '自定义费用需要提供自定义规则' }
    }
    
    const splitAmounts = {}
    
    switch (customSettings.customRule) {
      case 'stay_days_only':
        // 仅基于在寝天数
        members.forEach(member => {
          const ratio = member.stayDays / totalStayDays
          splitAmounts[member.id] = totalAmount * ratio
        })
        return { success: true, splitAmounts, roundingRule: customSettings.roundingRule || 'ceil' }
        
      case 'equal_share':
        // 均等分摊
        members.forEach(member => {
          splitAmounts[member.id] = totalAmount / members.length
        })
        return { success: true, splitAmounts, roundingRule: customSettings.roundingRule || 'ceil' }
        
      case 'custom_ratio':
        // 自定义比例
        if (!customSettings.customRatio) {
          return { success: false, message: '自定义比例分摊需要提供比例设置' }
        }
        
        const totalRatio = Object.values(customSettings.customRatio).reduce((sum, ratio) => sum + ratio, 0)
        
        members.forEach(member => {
          const ratio = (customSettings.customRatio[member.id] || 0) / totalRatio
          splitAmounts[member.id] = totalAmount * ratio
        })
        return { success: true, splitAmounts, roundingRule: customSettings.roundingRule || 'ceil' }
        
      default:
        return { success: false, message: `不支持的自定义规则: ${customSettings.customRule}` }
    }
  }
  
  /**
   * 应用舍入规则和差额分配
   * @param {Object} params - 计算参数
   * @returns {Object} 分摊结果
   */
  static applyRoundingAndRemainder({ members, splitAmounts, totalAmount, roundingRule }) {
    const roundedAmounts = {}
    let totalRounded = 0
    const remainders = {}
    
    // 第一步：应用舍入规则
    members.forEach(member => {
      const amount = splitAmounts[member.id]
      let roundedAmount
      
      switch (roundingRule) {
        case 'ceil':
          roundedAmount = Math.ceil(amount)
          break
        case 'floor':
          roundedAmount = Math.floor(amount)
          break
        case 'round':
          roundedAmount = Math.round(amount)
          break
        default:
          roundedAmount = Math.ceil(amount)
      }
      
      roundedAmounts[member.id] = roundedAmount
      totalRounded += roundedAmount
      
      // 记录余数（正数表示向上舍入，负数表示向下舍入）
      remainders[member.id] = amount - roundedAmount
    })
    
    // 第二步：分配差额
    const difference = totalAmount - totalRounded
    
    if (difference !== 0) {
      // 按余数大小排序，优先分配给舍入误差最大的成员
      const sortedMembers = members.sort((a, b) => {
        return remainders[a.id] - remainders[b.id]
      })
      
      // 如果总金额大于舍入后的总和，需要增加一些成员的金额
      if (difference > 0) {
        for (let i = 0; i < difference && i < sortedMembers.length; i++) {
          roundedAmounts[sortedMembers[i].id] += 1
        }
      }
      // 如果总金额小于舍入后的总和，需要减少一些成员的金额
      else if (difference < 0) {
        for (let i = 0; i < Math.abs(difference) && i < sortedMembers.length; i++) {
          roundedAmounts[sortedMembers[i].id] -= 1
        }
      }
    }
    
    // 验证最终结果
    const finalTotal = Object.values(roundedAmounts).reduce((sum, amount) => sum + amount, 0)
    
    if (finalTotal !== totalAmount) {
      console.error('分摊计算结果验证失败', { totalAmount, finalTotal, roundedAmounts })
      return { success: false, message: '分摊计算结果验证失败' }
    }
    
    return {
      success: true,
      splitAmounts: roundedAmounts,
      originalAmounts: splitAmounts,
      roundingRule,
      totalAmount
    }
  }
  
  /**
   * 计算请假期间的离寝天数
   * @param {Object} params - 计算参数
   * @param {string} params.startDate - 请假开始日期
   * @param {string} params.endDate - 请假结束日期
   * @param {string} params.type - 请假类型
   * @returns {number} 离寝天数
   */
  static calculateLeaveDays({ startDate, endDate, type }) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // 计算总天数
    const timeDiff = end.getTime() - start.getTime()
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1 // 包含开始和结束日期
    
    let leaveDays = totalDays
    
    // 根据请假类型调整离寝天数
    switch (type) {
      case 'personal':
        // 个人事务：全额离寝天数
        leaveDays = totalDays
        break
      case 'home':
        // 回家：如果超过3天，按80%计算
        if (totalDays > 3) {
          leaveDays = Math.ceil(totalDays * 0.8)
        }
        break
      case 'other':
        // 其他：按实际情况计算，这里默认全额
        leaveDays = totalDays
        break
    }
    
    return leaveDays
  }
  
  /**
   * 根据请假记录更新在寝天数
   * @param {Object} params - 计算参数
   * @param {Object} params.stayDays - 原始在寝天数记录 {memberId: {date: days}}
   * @param {Array} params.leaveRecords - 请假记录列表
   * @param {string} params.startDate - 计算周期开始日期
   * @param {string} params.endDate - 计算周期结束日期
   * @returns {Object} 更新后的在寝天数记录
   */
  static updateStayDaysByLeaveRecords({ stayDays, leaveRecords, startDate, endDate }) {
    const updatedStayDays = JSON.parse(JSON.stringify(stayDays)) // 深拷贝
    
    // 遍历每个请假记录
    leaveRecords.forEach(record => {
      const { memberId, startDate: leaveStart, endDate: leaveEnd, type } = record
      
      // 初始化成员记录（如果不存在）
      if (!updatedStayDays[memberId]) {
        updatedStayDays[memberId] = {}
      }
      
      // 计算离寝天数
      const leaveDays = this.calculateLeaveDays({
        startDate: leaveStart,
        endDate: leaveEnd,
        type
      })
      
      // 计算请假期间的平均每日离寝天数
      const start = new Date(leaveStart)
      const end = new Date(leaveEnd)
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1
      const dailyLeaveDays = leaveDays / totalDays
      
      // 更新请假期间每天的在寝天数
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        
        // 确保日期在计算周期内
        if (dateStr >= startDate && dateStr <= endDate) {
          // 减少在寝天数，但不小于0
          updatedStayDays[memberId][dateStr] = Math.max(
            0,
            (updatedStayDays[memberId][dateStr] || 1) - dailyLeaveDays
          )
        }
      }
    })
    
    return updatedStayDays
  }
}