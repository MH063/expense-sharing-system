<template>
  <div class="activities-list">
    <div class="page-header">
      <h1>活动列表</h1>
      <div class="header-actions">
        <el-button type="primary" @click="refreshActivities" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" inline>
        <el-form-item label="活动类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable>
            <el-option label="全部" value=""></el-option>
            <el-option label="费用相关" value="expense"></el-option>
            <el-option label="支付相关" value="payment"></el-option>
            <el-option label="房间相关" value="room"></el-option>
            <el-option label="用户相关" value="user"></el-option>
            <el-option label="争议相关" value="dispute"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="applyFilter">筛选</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 活动列表 -->
    <el-card class="activities-card" shadow="never">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      <div v-else-if="activities.length === 0" class="empty-container">
        <el-empty description="暂无活动记录" />
      </div>
      <div v-else>
        <el-timeline>
          <el-timeline-item
            v-for="(activity, index) in activities"
            :key="index"
            :timestamp="formatDate(activity.timestamp)"
            :type="getActivityType(activity.type)"
            placement="top"
          >
            <el-card class="activity-card" shadow="hover">
              <div class="activity-header">
                <div class="activity-type">
                  <el-tag :type="getActivityTagType(activity.type)">
                    {{ getActivityTypeName(activity.type) }}
                  </el-tag>
                </div>
                <div class="activity-time">
                  {{ formatTime(activity.timestamp) }}
                </div>
              </div>
              <div class="activity-content">
                <h3 class="activity-title">{{ activity.title }}</h3>
                <p class="activity-description">{{ activity.description }}</p>
                <div v-if="activity.details" class="activity-details">
                  <el-collapse>
                    <el-collapse-item title="查看详情" name="details">
                      <pre>{{ JSON.stringify(activity.details, null, 2) }}</pre>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { analyticsApi } from '@/api/analytics'

// 状态
const loading = ref(false)
const activities = ref([])

// 筛选表单
const filterForm = reactive({
  type: '',
  dateRange: []
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

/**
 * 加载活动列表
 */
const loadActivities = async () => {
  loading.value = true
  try {
    console.log('加载活动列表，参数:', {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      type: filterForm.type,
      startDate: filterForm.dateRange?.[0],
      endDate: filterForm.dateRange?.[1]
    })
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 模拟返回数据
    const mockActivities = [
      {
        id: 1,
        type: 'expense',
        title: '张三创建了新的费用',
        description: '10月份电费，金额：150.00元',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        details: {
          amount: 150.00,
          category: '电费',
          period: '2023-10',
          participants: ['张三', '李四', '王五']
        }
      },
      {
        id: 2,
        type: 'payment',
        title: '李四完成了支付',
        description: '支付了10月份水费，金额：80.00元',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        details: {
          amount: 80.00,
          category: '水费',
          period: '2023-10',
          paymentMethod: '支付宝'
        }
      },
      {
        id: 3,
        type: 'room',
        title: '王五加入了房间',
        description: '加入了"101宿舍"房间',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        details: {
          roomName: '101宿舍',
          roomCode: 'ROOM101',
          invitedBy: '赵六'
        }
      },
      {
        id: 4,
        type: 'user',
        title: '新用户注册',
        description: '用户赵六注册了账号',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        details: {
          username: '赵六',
          email: 'zhaoliu@example.com',
          registrationIP: '192.168.1.100'
        }
      },
      {
        id: 5,
        type: 'dispute',
        title: '争议已解决',
        description: '关于网费分摊的争议已解决',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        details: {
          disputeId: 'DISPUTE001',
          category: '网费分摊',
          resolution: '按使用时长分摊',
          resolvedBy: '管理员'
        }
      },
      {
        id: 6,
        type: 'expense',
        title: '钱七创建了新的费用',
        description: '11月份网费，金额：100.00元',
        timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        details: {
          amount: 100.00,
          category: '网费',
          period: '2023-11',
          participants: ['钱七', '孙八', '周九']
        }
      },
      {
        id: 7,
        type: 'payment',
        title: '孙八完成了支付',
        description: '支付了11月份物业费，金额：120.00元',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        details: {
          amount: 120.00,
          category: '物业费',
          period: '2023-11',
          paymentMethod: '微信支付'
        }
      },
      {
        id: 8,
        type: 'room',
        title: '周九创建了新房间',
        description: '创建了"201宿舍"房间',
        timestamp: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(),
        details: {
          roomName: '201宿舍',
          roomCode: 'ROOM201',
          maxMembers: 4
        }
      }
    ]
    
    // 应用筛选
    let filteredActivities = mockActivities
    if (filterForm.type) {
      filteredActivities = filteredActivities.filter(activity => activity.type === filterForm.type)
    }
    
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      const startDate = new Date(filterForm.dateRange[0])
      const endDate = new Date(filterForm.dateRange[1])
      endDate.setHours(23, 59, 59, 999) // 包含整天
      
      filteredActivities = filteredActivities.filter(activity => {
        const activityDate = new Date(activity.timestamp)
        return activityDate >= startDate && activityDate <= endDate
      })
    }
    
    // 更新分页信息
    pagination.total = filteredActivities.length
    
    // 应用分页
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    activities.value = filteredActivities.slice(startIndex, endIndex)
    
    console.log('获取活动列表成功:', activities.value.length)
  } catch (error) {
    console.error('加载活动列表失败:', error)
    ElMessage.error('加载活动列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 刷新活动列表
 */
const refreshActivities = () => {
  pagination.currentPage = 1
  loadActivities()
}

/**
 * 应用筛选
 */
const applyFilter = () => {
  pagination.currentPage = 1
  loadActivities()
}

/**
 * 重置筛选
 */
const resetFilter = () => {
  filterForm.type = ''
  filterForm.dateRange = []
  pagination.currentPage = 1
  loadActivities()
}

/**
 * 处理页码变化
 */
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadActivities()
}

/**
 * 处理每页条数变化
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  loadActivities()
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

/**
 * 格式化时间
 */
const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60 * 1000) {
    return '刚刚'
  } else if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  } else if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

/**
 * 获取活动类型
 */
const getActivityType = (type) => {
  const typeMap = {
    expense: 'primary',
    payment: 'success',
    room: 'warning',
    user: 'info',
    dispute: 'danger'
  }
  return typeMap[type] || 'primary'
}

/**
 * 获取活动标签类型
 */
const getActivityTagType = (type) => {
  const typeMap = {
    expense: '',
    payment: 'success',
    room: 'warning',
    user: 'info',
    dispute: 'danger'
  }
  return typeMap[type] || ''
}

/**
 * 获取活动类型名称
 */
const getActivityTypeName = (type) => {
  const typeMap = {
    expense: '费用相关',
    payment: '支付相关',
    room: '房间相关',
    user: '用户相关',
    dispute: '争议相关'
  }
  return typeMap[type] || '其他'
}

// 页面加载时获取活动列表
onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.activities-list {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.filter-card {
  margin-bottom: 20px;
}

.activities-card {
  min-height: 400px;
}

.loading-container,
.empty-container {
  padding: 40px 0;
}

.activity-card {
  margin-bottom: 10px;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.activity-time {
  color: #909399;
  font-size: 14px;
}

.activity-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 500;
}

.activity-description {
  margin: 0 0 10px 0;
  color: #606266;
}

.activity-details {
  margin-top: 10px;
}

.activity-details pre {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>