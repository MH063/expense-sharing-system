import { defineStore } from 'pinia'
import { stayDaysApi } from '@/api/stayDays'

/**
 * 在寝天数管理Store
 */
export const useStayDaysStore = defineStore('stayDays', {
  state: () => ({
    // 成员在寝天数记录 {memberId: {date: days}}
    memberStayDays: {},
    // 房间成员在寝天数汇总 {roomId: {memberId: days}}
    roomMembersStayDays: {},
    // 基于在寝天数的分摊结果
    stayDaysSplitResult: null,
    // 费用类型默认分摊方式
    expenseTypeDefaultSplit: {},
    // 加载状态
    loading: false,
    // 错误信息
    error: null
  }),

  getters: {
    // 获取成员在指定时间段内的总在寝天数
    getMemberTotalStayDays: (state) => {
      return (memberId, startDate, endDate) => {
        if (!state.memberStayDays[memberId]) return 0
        
        const memberDays = state.memberStayDays[memberId]
        let totalDays = 0
        
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        // 遍历日期范围内的每一天
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          totalDays += memberDays[dateStr] || 0
        }
        
        return totalDays
      }
    },
    
    // 获取房间成员在指定时间段内的在寝天数
    getRoomMembersStayDaysInRange: (state) => {
      return (roomId, startDate, endDate) => {
        if (!state.roomMembersStayDays[roomId]) return {}
        
        const roomDays = state.roomMembersStayDays[roomId]
        const result = {}
        
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        // 遍历每个成员
        Object.keys(roomDays).forEach(memberId => {
          let totalDays = 0
          const memberDays = roomDays[memberId]
          
          // 遍历日期范围内的每一天
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0]
            totalDays += memberDays[dateStr] || 0
          }
          
          result[memberId] = totalDays
        })
        
        return result
      }
    },
    
    // 获取费用类型的默认分摊方式
    getDefaultSplitForExpenseType: (state) => {
      return (expenseType) => {
        return state.expenseTypeDefaultSplit[expenseType] || 'average'
      }
    }
  },

  actions: {
    // 获取成员在指定时间段内的在寝天数
    async fetchMemberStayDays(memberId, startDate, endDate) {
      this.loading = true
      this.error = null
      
      try {
        const response = await stayDaysApi.getMemberStayDays(memberId, startDate, endDate)
        
        if (response.success) {
          // 初始化成员记录（如果不存在）
          if (!this.memberStayDays[memberId]) {
            this.memberStayDays[memberId] = {}
          }
          
          // 更新在寝天数记录
          Object.assign(this.memberStayDays[memberId], response.data)
        } else {
          this.error = response.message || '获取成员在寝天数失败'
        }
      } catch (error) {
        this.error = error.message || '获取成员在寝天数时发生错误'
        console.error('获取成员在寝天数失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 获取房间所有成员在指定时间段内的在寝天数
    async fetchRoomMembersStayDays(roomId, startDate, endDate) {
      this.loading = true
      this.error = null
      
      try {
        const response = await stayDaysApi.getRoomMembersStayDays(roomId, startDate, endDate)
        
        if (response.success) {
          // 初始化房间记录（如果不存在）
          if (!this.roomMembersStayDays[roomId]) {
            this.roomMembersStayDays[roomId] = {}
          }
          
          // 更新房间成员在寝天数记录
          Object.assign(this.roomMembersStayDays[roomId], response.data)
          
          // 同时更新单个成员的记录
          Object.keys(response.data).forEach(memberId => {
            if (!this.memberStayDays[memberId]) {
              this.memberStayDays[memberId] = {}
            }
            Object.assign(this.memberStayDays[memberId], response.data[memberId])
          })
        } else {
          this.error = response.message || '获取房间成员在寝天数失败'
        }
      } catch (error) {
        this.error = error.message || '获取房间成员在寝天数时发生错误'
        console.error('获取房间成员在寝天数失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 计算基于在寝天数的费用分摊
    async calculateStayDaysSplit(data) {
      this.loading = true
      this.error = null
      
      try {
        const response = await stayDaysApi.calculateStayDaysSplit(data)
        
        if (response.success) {
          this.stayDaysSplitResult = response.data
          return response.data
        } else {
          this.error = response.message || '计算基于在寝天数的费用分摊失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '计算基于在寝天数的费用分摊时发生错误'
        console.error('计算基于在寝天数的费用分摊失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 获取费用类型的默认分摊方式
    async fetchExpenseTypeDefaultSplit(expenseType) {
      this.loading = true
      this.error = null
      
      try {
        const response = await stayDaysApi.getExpenseTypeDefaultSplit(expenseType)
        
        if (response.success) {
          this.expenseTypeDefaultSplit[expenseType] = response.data.defaultSplitType
          return response.data.defaultSplitType
        } else {
          this.error = response.message || '获取费用类型默认分摊方式失败'
          return 'average' // 默认返回平均分摊
        }
      } catch (error) {
        this.error = error.message || '获取费用类型默认分摊方式时发生错误'
        console.error('获取费用类型默认分摊方式失败:', error)
        return 'average' // 默认返回平均分摊
      } finally {
        this.loading = false
      }
    },
    
    // 批量更新成员在寝天数
    async batchUpdateStayDays(data) {
      this.loading = true
      this.error = null
      
      try {
        const response = await stayDaysApi.batchUpdateStayDays(data)
        
        if (response.success) {
          // 更新本地状态
          data.forEach(item => {
            const { memberId, date, days } = item
            
            if (!this.memberStayDays[memberId]) {
              this.memberStayDays[memberId] = {}
            }
            
            this.memberStayDays[memberId][date] = days
            
            // 如果知道房间ID，也更新房间记录
            // 这里需要根据实际情况处理
          })
          
          return true
        } else {
          this.error = response.message || '批量更新成员在寝天数失败'
          return false
        }
      } catch (error) {
        this.error = error.message || '批量更新成员在寝天数时发生错误'
        console.error('批量更新成员在寝天数失败:', error)
        return false
      } finally {
        this.loading = false
      }
    },
    
    // 清除错误信息
    clearError() {
      this.error = null
    },
    
    // 重置分摊结果
    resetSplitResult() {
      this.stayDaysSplitResult = null
    }
  }
})