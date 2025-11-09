<template>
  <div class="brute-force-monitor">
    <h2>暴力破解防护监控</h2>
    
    <!-- 统计信息 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>实时统计</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="6">
          <el-statistic title="总尝试次数" :value="stats.totalAttempts || 0" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="被阻止次数" :value="stats.blockedAttempts || 0" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="当前被封IP数" :value="stats.blockedIps || 0" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="当前被封用户数" :value="stats.blockedUsers || 0" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 图表展示 -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>登录尝试趋势</span>
            </div>
          </template>
          <div ref="attemptsChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>阻止尝试趋势</span>
            </div>
          </template>
          <div ref="blockedChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 封禁列表 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>当前封禁列表</span>
          <el-button type="primary" @click="fetchBlockedData" size="small">刷新</el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="IP封禁" name="ip">
          <el-table :data="blockedIps" style="width: 100%" border>
            <el-table-column prop="ip" label="IP地址" width="180" />
            <el-table-column prop="attempts" label="尝试次数" width="120" />
            <el-table-column prop="blockedAt" label="封禁时间">
              <template #default="scope">
                {{ formatDate(scope.row.blockedAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="封禁原因" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="danger" size="small" @click="unblockIp(scope.row.ip)">解除封禁</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="用户封禁" name="user">
          <el-table :data="blockedUsers" style="width: 100%" border>
            <el-table-column prop="username" label="用户名" width="180" />
            <el-table-column prop="attempts" label="尝试次数" width="120" />
            <el-table-column prop="blockedAt" label="封禁时间">
              <template #default="scope">
                {{ formatDate(scope.row.blockedAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="封禁原因" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="danger" size="small" @click="unblockUser(scope.row.username)">解除封禁</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 日志查看 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>防护日志</span>
          <el-button type="primary" @click="fetchLogs" size="small">刷新</el-button>
        </div>
      </template>
      
      <el-table :data="logs" style="width: 100%" border stripe>
        <el-table-column prop="timestamp" label="时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="event" label="事件类型" width="150" />
        <el-table-column prop="ip" label="IP地址" width="150" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="details" label="详情" />
      </el-table>
      
      <el-pagination
        @current-change="handleLogPageChange"
        :current-page="logPagination.currentPage"
        :page-size="logPagination.pageSize"
        :total="logPagination.total"
        layout="prev, pager, next"
        class="mt-3 justify-content-center"
      />
    </el-card>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, reactive } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/request'

export default defineComponent({
  name: 'BruteForceMonitor',
  setup() {
    // 统计数据
    const stats = ref({})
    
    // 图表引用
    const attemptsChartRef = ref(null)
    const blockedChartRef = ref(null)
    let attemptsChart = null
    let blockedChart = null
    
    // 封禁数据
    const activeTab = ref('ip')
    const blockedIps = ref([])
    const blockedUsers = ref([])
    
    // 日志数据
    const logs = ref([])
    const logPagination = reactive({
      currentPage: 1,
      pageSize: 10,
      total: 0
    })
    
    // 格式化日期
    const formatDate = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN')
    }
    
    // 获取统计数据
    const fetchStats = async () => {
      try {
        const response = await request.get('/api/brute-force-monitor/stats')
        if (response.data.success) {
          stats.value = response.data.data
          updateCharts()
        } else {
          ElMessage.error(response.data.message || '获取统计数据失败')
        }
      } catch (error) {
        console.error('获取统计数据失败:', error)
        ElMessage.error('获取统计数据失败: ' + error.message)
      }
    }
    
    // 更新图表
    const updateCharts = () => {
      // 登录尝试趋势图
      if (attemptsChartRef.value) {
        if (!attemptsChart) {
          attemptsChart = echarts.init(attemptsChartRef.value)
        }
        
        const option = {
          tooltip: {
            trigger: 'axis'
          },
          xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            data: [120, 200, 150, 80, 70, 110, 130],
            type: 'line',
            smooth: true
          }]
        }
        
        attemptsChart.setOption(option)
      }
      
      // 阻止尝试趋势图
      if (blockedChartRef.value) {
        if (!blockedChart) {
          blockedChart = echarts.init(blockedChartRef.value)
        }
        
        const option = {
          tooltip: {
            trigger: 'axis'
          },
          xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            data: [12, 20, 15, 8, 7, 11, 13],
            type: 'bar'
          }]
        }
        
        blockedChart.setOption(option)
      }
    }
    
    // 获取封禁数据
    const fetchBlockedData = async () => {
      try {
        // 获取IP封禁列表
        const ipResponse = await request.get('/api/brute-force-monitor/blocked/ips')
        if (ipResponse.data.success) {
          blockedIps.value = ipResponse.data.data.map(item => ({
            ip: item.ip,
            attempts: item.attemptCount,
            blockedAt: item.blockedAt,
            reason: '超过最大尝试次数'
          }))
        } else {
          ElMessage.error(ipResponse.data.message || '获取IP封禁列表失败')
        }
        
        // 获取用户封禁列表
        const userResponse = await request.get('/api/brute-force-monitor/blocked/users')
        if (userResponse.data.success) {
          blockedUsers.value = userResponse.data.data.map(item => ({
            username: item.username,
            attempts: item.attemptCount,
            blockedAt: item.blockedAt,
            reason: '超过最大尝试次数'
          }))
        } else {
          ElMessage.error(userResponse.data.message || '获取用户封禁列表失败')
        }
      } catch (error) {
        console.error('获取封禁数据失败:', error)
        ElMessage.error('获取封禁数据失败: ' + error.message)
      }
    }
    
    // 获取日志数据
    const fetchLogs = async () => {
      try {
        const response = await request.get(`/api/brute-force-monitor/logs?page=${logPagination.currentPage}&limit=${logPagination.pageSize}`)
        if (response.data.success) {
          logs.value = response.data.data.logs
          logPagination.total = response.data.data.total
        } else {
          ElMessage.error(response.data.message || '获取日志数据失败')
        }
      } catch (error) {
        console.error('获取日志数据失败:', error)
        ElMessage.error('获取日志数据失败: ' + error.message)
      }
    }
    
    // 处理日志分页变化
    const handleLogPageChange = (page) => {
      logPagination.currentPage = page
      fetchLogs()
    }
    
    // 解除IP封禁
    const unblockIp = async (ip) => {
      try {
        await ElMessageBox.confirm(`确定要解除IP ${ip} 的封禁吗？`, '确认解除封禁', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const response = await request.post(`/api/brute-force-monitor/unblock/ip/${ip}`)
        if (response.data.success) {
          ElMessage.success('解除封禁成功')
          fetchBlockedData()
          fetchStats()
        } else {
          ElMessage.error(response.data.message || '解除封禁失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('解除IP封禁失败:', error)
          ElMessage.error('解除IP封禁失败: ' + error.message)
        }
      }
    }
    
    // 解除用户封禁
    const unblockUser = async (username) => {
      try {
        await ElMessageBox.confirm(`确定要解除用户 ${username} 的封禁吗？`, '确认解除封禁', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const response = await request.post(`/api/brute-force-monitor/unblock/user/${username}`)
        if (response.data.success) {
          ElMessage.success('解除封禁成功')
          fetchBlockedData()
          fetchStats()
        } else {
          ElMessage.error(response.data.message || '解除封禁失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('解除用户封禁失败:', error)
          ElMessage.error('解除用户封禁失败: ' + error.message)
        }
      }
    }
    
    // 初始化数据
    onMounted(() => {
      fetchStats()
      fetchBlockedData()
      fetchLogs()
      
      // 监听窗口大小变化，重新渲染图表
      window.addEventListener('resize', () => {
        if (attemptsChart) {
          attemptsChart.resize()
        }
        if (blockedChart) {
          blockedChart.resize()
        }
      })
    })
    
    return {
      stats,
      attemptsChartRef,
      blockedChartRef,
      activeTab,
      blockedIps,
      blockedUsers,
      logs,
      logPagination,
      formatDate,
      fetchBlockedData,
      fetchLogs,
      handleLogPageChange,
      unblockIp,
      unblockUser
    }
  }
})
</script>

<style scoped>
.brute-force-monitor {
  padding: 20px;
}

.mb-4 {
  margin-bottom: 20px;
}

.mt-3 {
  margin-top: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.justify-content-center {
  display: flex;
  justify-content: center;
}
</style>