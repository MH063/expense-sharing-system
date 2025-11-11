import { defineStore } from 'pinia'
import { leaveRecordsApi } from '@/api/leaveRecords'

/**
 * 请假记录管理Store
 */
export const useLeaveRecordsStore = defineStore('leaveRecords', {
  state: () => ({
    // 成员请假记录 {memberId: [records]}
    memberLeaveRecords: {},
    // 房间成员请假记录 {roomId: {memberId: [records]}}
    roomMembersLeaveRecords: {},
    // 请假记录详情 {recordId: record}
    leaveRecordDetails: {},
    // 请假类型列表
    leaveTypes: [],
    // 加载状态
    loading: false,
    // 错误信息
    error: null
  }),

  getters: {
    // 获取成员在指定时间段内的请假记录
    getMemberLeaveRecordsInRange: (state) => {
      return (memberId, startDate, endDate) => {
        if (!state.memberLeaveRecords[memberId]) return []
        
        const records = state.memberLeaveRecords[memberId]
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        return records.filter(record => {
          const recordStart = new Date(record.startDate)
          const recordEnd = new Date(record.endDate)
          
          // 检查记录是否与指定时间段有重叠
          return recordStart <= end && recordEnd >= start
        })
      }
    },
    
    // 获取房间成员在指定时间段内的请假记录
    getRoomMembersLeaveRecordsInRange: (state) => {
      return (roomId, startDate, endDate) => {
        if (!state.roomMembersLeaveRecords[roomId]) return {}
        
        const roomRecords = state.roomMembersLeaveRecords[roomId]
        const result = {}
        
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        // 遍历每个成员
        Object.keys(roomRecords).forEach(memberId => {
          const records = roomRecords[memberId]
          
          // 过滤与指定时间段有重叠的记录
          result[memberId] = records.filter(record => {
            const recordStart = new Date(record.startDate)
            const recordEnd = new Date(record.endDate)
            
            return recordStart <= end && recordEnd >= start
          })
        })
        
        return result
      }
    },
    
    // 获取请假记录详情
    getLeaveRecordDetail: (state) => {
      return (recordId) => {
        return state.leaveRecordDetails[recordId] || null
      }
    }
  },

  actions: {
    // 获取成员的请假记录
    async fetchMemberLeaveRecords(memberId, startDate, endDate) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.getMemberLeaveRecords(memberId, startDate, endDate)
        
        if (response.success) {
          // 初始化成员记录（如果不存在）
          if (!this.memberLeaveRecords[memberId]) {
            this.memberLeaveRecords[memberId] = []
          }
          
          // 更新请假记录
          this.memberLeaveRecords[memberId] = response.data
          
          // 更新记录详情
          response.data.forEach(record => {
            this.leaveRecordDetails[record.id] = record
          })
        } else {
          this.error = response.message || '获取成员请假记录失败'
        }
      } catch (error) {
        this.error = error.message || '获取成员请假记录时发生错误'
        console.error('获取成员请假记录失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 获取房间所有成员的请假记录
    async fetchRoomMembersLeaveRecords(roomId, startDate, endDate) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.getRoomMembersLeaveRecords(roomId, startDate, endDate)
        
        if (response.success) {
          // 初始化房间记录（如果不存在）
          if (!this.roomMembersLeaveRecords[roomId]) {
            this.roomMembersLeaveRecords[roomId] = {}
          }
          
          // 更新房间成员请假记录
          this.roomMembersLeaveRecords[roomId] = response.data
          
          // 同时更新单个成员的记录
          Object.keys(response.data).forEach(memberId => {
            if (!this.memberLeaveRecords[memberId]) {
              this.memberLeaveRecords[memberId] = []
            }
            
            this.memberLeaveRecords[memberId] = response.data[memberId]
            
            // 更新记录详情
            response.data[memberId].forEach(record => {
              this.leaveRecordDetails[record.id] = record
            })
          })
        } else {
          this.error = response.message || '获取房间成员请假记录失败'
        }
      } catch (error) {
        this.error = error.message || '获取房间成员请假记录时发生错误'
        console.error('获取房间成员请假记录失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 获取请假记录详情
    async fetchLeaveRecordDetail(recordId) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.getLeaveRecordDetail(recordId)
        
        if (response.success) {
          const record = response.data
          this.leaveRecordDetails[recordId] = record
          return record
        } else {
          this.error = response.message || '获取请假记录详情失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '获取请假记录详情时发生错误'
        console.error('获取请假记录详情失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 创建请假记录
    async createLeaveRecord(data) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.createLeaveRecord(data)
        
        if (response.success) {
          const record = response.data
          const { memberId, roomId } = record
          
          // 更新成员记录
          if (!this.memberLeaveRecords[memberId]) {
            this.memberLeaveRecords[memberId] = []
          }
          this.memberLeaveRecords[memberId].push(record)
          
          // 更新房间记录
          if (roomId) {
            if (!this.roomMembersLeaveRecords[roomId]) {
              this.roomMembersLeaveRecords[roomId] = {}
            }
            if (!this.roomMembersLeaveRecords[roomId][memberId]) {
              this.roomMembersLeaveRecords[roomId][memberId] = []
            }
            this.roomMembersLeaveRecords[roomId][memberId].push(record)
          }
          
          // 更新记录详情
          this.leaveRecordDetails[record.id] = record
          
          return record
        } else {
          this.error = response.message || '创建请假记录失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '创建请假记录时发生错误'
        console.error('创建请假记录失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 更新请假记录
    async updateLeaveRecord(recordId, data) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.updateLeaveRecord(recordId, data)
        
        if (response.success) {
          const updatedRecord = response.data
          const { memberId, roomId } = updatedRecord
          
          // 更新成员记录
          if (this.memberLeaveRecords[memberId]) {
            const index = this.memberLeaveRecords[memberId].findIndex(r => r.id === recordId)
            if (index !== -1) {
              this.memberLeaveRecords[memberId][index] = updatedRecord
            }
          }
          
          // 更新房间记录
          if (roomId && this.roomMembersLeaveRecords[roomId] && this.roomMembersLeaveRecords[roomId][memberId]) {
            const index = this.roomMembersLeaveRecords[roomId][memberId].findIndex(r => r.id === recordId)
            if (index !== -1) {
              this.roomMembersLeaveRecords[roomId][memberId][index] = updatedRecord
            }
          }
          
          // 更新记录详情
          this.leaveRecordDetails[recordId] = updatedRecord
          
          return updatedRecord
        } else {
          this.error = response.message || '更新请假记录失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '更新请假记录时发生错误'
        console.error('更新请假记录失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 删除请假记录
    async deleteLeaveRecord(recordId) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.deleteLeaveRecord(recordId)
        
        if (response.success) {
          const record = this.leaveRecordDetails[recordId]
          if (record) {
            const { memberId, roomId } = record
            
            // 从成员记录中删除
            if (this.memberLeaveRecords[memberId]) {
              this.memberLeaveRecords[memberId] = this.memberLeaveRecords[memberId].filter(r => r.id !== recordId)
            }
            
            // 从房间记录中删除
            if (roomId && this.roomMembersLeaveRecords[roomId] && this.roomMembersLeaveRecords[roomId][memberId]) {
              this.roomMembersLeaveRecords[roomId][memberId] = this.roomMembersLeaveRecords[roomId][memberId].filter(r => r.id !== recordId)
            }
            
            // 删除记录详情
            delete this.leaveRecordDetails[recordId]
          }
          
          return true
        } else {
          this.error = response.message || '删除请假记录失败'
          return false
        }
      } catch (error) {
        this.error = error.message || '删除请假记录时发生错误'
        console.error('删除请假记录失败:', error)
        return false
      } finally {
        this.loading = false
      }
    },
    
    // 获取请假类型列表
    async fetchLeaveTypes() {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.getLeaveTypes()
        
        if (response.success) {
          this.leaveTypes = response.data
          return response.data
        } else {
          this.error = response.message || '获取请假类型列表失败'
          return []
        }
      } catch (error) {
        this.error = error.message || '获取请假类型列表时发生错误'
        console.error('获取请假类型列表失败:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    // 获取请假统计
    async fetchLeaveStats(params) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.getLeaveStats(params)
        
        if (response.success) {
          return response.data
        } else {
          this.error = response.message || '获取请假统计失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '获取请假统计时发生错误'
        console.error('获取请假统计失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 批量计算请假期间的离寝天数
    async calculateLeaveDays(data) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.calculateLeaveDays(data)
        
        if (response.success) {
          return response.data
        } else {
          this.error = response.message || '计算请假期间的离寝天数失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '计算请假期间的离寝天数时发生错误'
        console.error('计算请假期间的离寝天数失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 根据请假记录自动更新在寝天数
    async autoUpdateStayDaysByLeaveRecords(roomId, startDate, endDate) {
      this.loading = true
      this.error = null
      
      try {
        const response = await leaveRecordsApi.autoUpdateStayDaysByLeaveRecords(roomId, startDate, endDate)
        
        if (response.success) {
          return response.data
        } else {
          this.error = response.message || '根据请假记录自动更新在寝天数失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '根据请假记录自动更新在寝天数时发生错误'
        console.error('根据请假记录自动更新在寝天数失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 清除错误信息
    clearError() {
      this.error = null
    }
  }
})