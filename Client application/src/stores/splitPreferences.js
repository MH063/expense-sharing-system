import { defineStore } from 'pinia'
import { splitPreferencesApi } from '@/api/splitPreferences'

/**
 * 分摊偏好设置状态管理
 */
export const useSplitPreferencesStore = defineStore('splitPreferences', {
  state: () => ({
    // 用户分摊偏好设置
    userPreferences: {
      defaultSplitType: 'equal', // 默认分摊方式: equal, amount, percentage
      autoSelectAll: true, // 是否自动选择所有成员
      showPreview: true, // 是否显示预览
      enableNotifications: true, // 是否启用通知
      currency: 'CNY', // 默认货币
      roundingRule: 'round', // 舍入规则: round, ceil, floor
      lastUsedSettings: {} // 最近使用的设置
    },
    // 历史分摊模式
    splitHistory: [],
    // 加载状态
    loading: false,
    // 错误信息
    error: null
  }),

  getters: {
    /**
     * 获取默认分摊方式
     */
    defaultSplitType: (state) => state.userPreferences.defaultSplitType,
    
    /**
     * 获取是否自动选择所有成员
     */
    autoSelectAll: (state) => state.userPreferences.autoSelectAll,
    
    /**
     * 获取是否显示预览
     */
    showPreview: (state) => state.userPreferences.showPreview,
    
    /**
     * 获取最近使用的设置
     */
    lastUsedSettings: (state) => state.userPreferences.lastUsedSettings,
    
    /**
     * 获取最常用的分摊模式
     */
    mostUsedSplitPattern: (state) => {
      if (!state.splitHistory.length) return null
      
      // 统计每种分摊模式的使用次数
      const patternCounts = {}
      state.splitHistory.forEach(item => {
        const key = `${item.splitType}_${item.selectedMemberIds.length}`
        patternCounts[key] = (patternCounts[key] || 0) + 1
      })
      
      // 找出使用次数最多的模式
      let maxCount = 0
      let mostUsedPattern = null
      
      Object.entries(patternCounts).forEach(([key, count]) => {
        if (count > maxCount) {
          maxCount = count
          mostUsedPattern = state.splitHistory.find(
            item => `${item.splitType}_${item.selectedMemberIds.length}` === key
          )
        }
      })
      
      return mostUsedPattern
    },
    
    /**
     * 获取最近使用的分摊模式
     */
    recentSplitPatterns: (state) => {
      return state.splitHistory.slice(0, 5) // 返回最近5条记录
    }
  },

  actions: {
    /**
     * 加载用户分摊偏好设置
     * @param {string} userId - 用户ID
     */
    async loadUserPreferences(userId) {
      this.loading = true
      this.error = null
      
      try {
        const response = await splitPreferencesApi.getUserPreferences(userId)
        if (response.data.success) {
          this.userPreferences = {
            ...this.userPreferences,
            ...response.data.data
          }
        }
      } catch (error) {
        console.error('加载用户分摊偏好设置失败:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 保存用户分摊偏好设置
     * @param {string} userId - 用户ID
     * @param {Object} preferences - 偏好设置
     */
    async saveUserPreferences(userId, preferences) {
      this.loading = true
      this.error = null
      
      try {
        const data = {
          userId,
          ...preferences
        }
        
        let response
        if (this.userPreferences.id) {
          // 更新现有设置
          response = await splitPreferencesApi.updateUserPreferences(
            this.userPreferences.id,
            data
          )
        } else {
          // 创建新设置
          response = await splitPreferencesApi.saveUserPreferences(data)
        }
        
        if (response.data.success) {
          this.userPreferences = {
            ...this.userPreferences,
            ...preferences,
            id: response.data.data.id
          }
        }
        
        return response.data
      } catch (error) {
        console.error('保存用户分摊偏好设置失败:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 加载用户历史分摊模式
     * @param {string} userId - 用户ID
     * @param {Object} params - 查询参数
     */
    async loadUserSplitHistory(userId, params = {}) {
      this.loading = true
      this.error = null
      
      try {
        const response = await splitPreferencesApi.getUserSplitHistory(userId, params)
        if (response.data.success) {
          this.splitHistory = response.data.data
        }
      } catch (error) {
        console.error('加载用户历史分摊模式失败:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 保存分摊模式到历史记录
     * @param {string} userId - 用户ID
     * @param {Object} splitData - 分摊数据
     */
    async saveSplitToHistory(userId, splitData) {
      this.loading = true
      this.error = null
      
      try {
        const data = {
          userId,
          ...splitData,
          createdAt: new Date().toISOString()
        }
        
        const response = await splitPreferencesApi.saveSplitToHistory(data)
        
        if (response.data.success) {
          // 添加到历史记录的开头
          this.splitHistory.unshift({
            ...data,
            id: response.data.data.id
          })
          
          // 限制历史记录数量，保留最近50条
          if (this.splitHistory.length > 50) {
            this.splitHistory = this.splitHistory.slice(0, 50)
          }
        }
        
        return response.data
      } catch (error) {
        console.error('保存分摊模式到历史记录失败:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 更新最近使用的设置
     * @param {Object} settings - 设置数据
     */
    updateLastUsedSettings(settings) {
      this.userPreferences.lastUsedSettings = {
        ...this.userPreferences.lastUsedSettings,
        ...settings,
        updatedAt: new Date().toISOString()
      }
    },

    /**
     * 重置用户偏好设置为默认值
     */
    resetToDefaults() {
      this.userPreferences = {
        defaultSplitType: 'equal',
        autoSelectAll: true,
        showPreview: true,
        enableNotifications: true,
        currency: 'CNY',
        roundingRule: 'round',
        lastUsedSettings: {}
      }
    }
  }
})