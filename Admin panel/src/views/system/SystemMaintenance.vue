<template>
  <div class="system-maintenance">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>系统维护管理</h1>
          <p>管理系统维护任务、备份、监控和配置</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </el-header>
      
      <el-main class="maintenance-content">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <!-- 维护任务 -->
          <el-tab-pane label="维护任务" name="tasks">
            <el-card class="maintenance-card">
              <template #header>
                <div class="card-header">
                  <h3>系统维护任务</h3>
                  <div class="card-actions">
                    <el-button type="primary" @click="showCreateTaskDialog">
                      <el-icon><Plus /></el-icon>
                      创建任务
                    </el-button>
                  </div>
                </div>
              </template>
              
              <div class="task-filters">
                <el-form :inline="true" :model="taskFilters" class="filter-form">
                  <el-form-item label="状态">
                    <el-select v-model="taskFilters.status" placeholder="请选择状态" clearable @change="filterTasks">
                      <el-option label="待处理" value="pending" />
                      <el-option label="进行中" value="in_progress" />
                      <el-option label="已完成" value="completed" />
                      <el-option label="失败" value="failed" />
                      <el-option label="已取消" value="cancelled" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="优先级">
                    <el-select v-model="taskFilters.priority" placeholder="请选择优先级" clearable @change="filterTasks">
                      <el-option label="低" value="low" />
                      <el-option label="中" value="medium" />
                      <el-option label="高" value="high" />
                      <el-option label="紧急" value="critical" />
                    </el-select>
                  </el-form-item>
                </el-form>
              </div>
              
              <el-table
                v-loading="loading.tasks"
                :data="tasks"
                style="width: 100%"
                @selection-change="handleTaskSelectionChange"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="title" label="任务名称" min-width="150" />
                <el-table-column prop="task_type" label="任务类型" width="120">
                  <template #default="scope">
                    <el-tag :type="getTaskTypeTagType(scope.row.task_type)">
                      {{ getTaskTypeText(scope.row.task_type) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="priority" label="优先级" width="100">
                  <template #default="scope">
                    <el-tag :type="getPriorityTagType(scope.row.priority)">
                      {{ getPriorityText(scope.row.priority) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getTaskStatusTagType(scope.row.status)">
                      {{ getTaskStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="180">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.created_at) }}
                  </template>
                </el-table-column>
                <el-table-column prop="scheduled_at" label="计划时间" width="180">
                  <template #default="scope">
                    {{ scope.row.scheduled_at ? formatDateTime(scope.row.scheduled_at) : '-' }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200" fixed="right">
                  <template #default="scope">
                    <el-button
                      v-if="scope.row.status === 'pending'"
                      type="success"
                      size="small"
                      @click="executeTask(scope.row)"
                      :loading="executingTaskId === scope.row.id"
                    >
                      执行
                    </el-button>
                    <el-button
                      type="primary"
                      size="small"
                      @click="viewTaskDetails(scope.row)"
                    >
                      详情
                    </el-button>
                    <el-button
                      type="danger"
                      size="small"
                      @click="deleteTask(scope.row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="taskPagination.page"
                  v-model:page-size="taskPagination.limit"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="taskPagination.total"
                  @size-change="handleTaskSizeChange"
                  @current-change="handleTaskCurrentChange"
                />
              </div>
            </el-card>
          </el-tab-pane>
          
          <!-- 系统备份 -->
          <el-tab-pane label="系统备份" name="backups">
            <el-card class="maintenance-card">
              <template #header>
                <div class="card-header">
                  <h3>系统备份管理</h3>
                  <div class="card-actions">
                    <el-button type="primary" @click="createBackup">
                      <el-icon><Download /></el-icon>
                      创建备份
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-table
                v-loading="loading.backups"
                :data="backups"
                style="width: 100%"
              >
                <el-table-column prop="filename" label="备份文件" min-width="200" />
                <el-table-column prop="backup_type" label="备份类型" width="120">
                  <template #default="scope">
                    <el-tag :type="getBackupTypeTagType(scope.row.backup_type)">
                      {{ getBackupTypeText(scope.row.backup_type) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="size" label="文件大小" width="120">
                  <template #default="scope">
                    {{ formatBytes(scope.row.size) }}
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getBackupStatusTagType(scope.row.status)">
                      {{ getBackupStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="180">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.created_at) }}
                  </template>
                </el-table-column>
                <el-table-column prop="completed_at" label="完成时间" width="180">
                  <template #default="scope">
                    {{ scope.row.completed_at ? formatDateTime(scope.row.completed_at) : '-' }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200" fixed="right">
                  <template #default="scope">
                    <el-button
                      v-if="scope.row.status === 'completed'"
                      type="primary"
                      size="small"
                      @click="downloadBackup(scope.row)"
                    >
                      下载
                    </el-button>
                    <el-button
                      v-if="scope.row.status === 'completed'"
                      type="success"
                      size="small"
                      @click="restoreBackup(scope.row)"
                    >
                      恢复
                    </el-button>
                    <el-button
                      type="danger"
                      size="small"
                      @click="deleteBackup(scope.row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="backupPagination.page"
                  v-model:page-size="backupPagination.limit"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="backupPagination.total"
                  @size-change="handleBackupSizeChange"
                  @current-change="handleBackupCurrentChange"
                />
              </div>
            </el-card>
          </el-tab-pane>
          
          <!-- 系统监控 -->
          <el-tab-pane label="系统监控" name="monitoring">
            <el-card class="maintenance-card">
              <template #header>
                <div class="card-header">
                  <h3>系统监控状态</h3>
                  <div class="card-actions">
                    <el-button type="success" @click="checkSystemHealth">
                      <el-icon><Search /></el-icon>
                      系统检查
                    </el-button>
                  </div>
                </div>
              </template>
              
              <div class="health-status">
                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-card class="health-card">
                      <div class="health-item">
                        <div class="health-icon database">
                          <el-icon><DataLine /></el-icon>
                        </div>
                        <div class="health-info">
                          <div class="health-title">数据库</div>
                          <div class="health-value" :class="getHealthStatusClass(systemHealth.database?.status)">
                            {{ getHealthStatusText(systemHealth.database?.status) }}
                          </div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                  
                  <el-col :span="6">
                    <el-card class="health-card">
                      <div class="health-item">
                        <div class="health-icon redis">
                          <el-icon><Coin /></el-icon>
                        </div>
                        <div class="health-info">
                          <div class="health-title">Redis缓存</div>
                          <div class="health-value" :class="getHealthStatusClass(systemHealth.redis?.status)">
                            {{ getHealthStatusText(systemHealth.redis?.status) }}
                          </div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                  
                  <el-col :span="6">
                    <el-card class="health-card">
                      <div class="health-item">
                        <div class="health-icon disk">
                          <el-icon><Monitor /></el-icon>
                        </div>
                        <div class="health-info">
                          <div class="health-title">磁盘空间</div>
                          <div class="health-value" :class="getHealthStatusClass(systemHealth.disk?.status)">
                            {{ getHealthStatusText(systemHealth.disk?.status) }}
                          </div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                  
                  <el-col :span="6">
                    <el-card class="health-card">
                      <div class="health-item">
                        <div class="health-icon memory">
                          <el-icon><DataAnalysis /></el-icon>
                        </div>
                        <div class="health-info">
                          <div class="health-title">内存使用</div>
                          <div class="health-value" :class="getHealthStatusClass(systemHealth.memory?.status)">
                            {{ getHealthStatusText(systemHealth.memory?.status) }}
                          </div>
                        </div>
                      </div>
                    </el-card>
                  </el-col>
                </el-row>
              </div>
              
              <div class="system-info">
                <el-descriptions title="系统信息" :column="3" border>
                  <el-descriptions-item label="系统运行时间">{{ formatUptime(systemHealth.uptime) }}</el-descriptions-item>
                  <el-descriptions-item label="平台">{{ systemInfo.platform }}</el-descriptions-item>
                  <el-descriptions-item label="架构">{{ systemInfo.arch }}</el-descriptions-item>
                  <el-descriptions-item label="Node版本">{{ systemInfo.nodeVersion }}</el-descriptions-item>
                  <el-descriptions-item label="总内存">{{ formatBytes(systemInfo.totalmem) }}</el-descriptions-item>
                  <el-descriptions-item label="空闲内存">{{ formatBytes(systemInfo.freemem) }}</el-descriptions-item>
                </el-descriptions>
              </div>
            </el-card>
          </el-tab-pane>
          
          <!-- 维护日志 -->
          <el-tab-pane label="维护日志" name="logs">
            <el-card class="maintenance-card">
              <template #header>
                <div class="card-header">
                  <h3>系统维护日志</h3>
                  <div class="card-actions">
                    <el-button @click="clearLogs">
                      <el-icon><Delete /></el-icon>
                      清空日志
                    </el-button>
                  </div>
                </div>
              </template>
              
              <div class="log-filters">
                <el-form :inline="true" :model="logFilters" class="filter-form">
                  <el-form-item label="操作类型">
                    <el-select v-model="logFilters.action" placeholder="请选择操作类型" clearable @change="filterLogs">
                      <el-option label="创建备份" value="create_backup" />
                      <el-option label="恢复备份" value="restore_backup" />
                      <el-option label="执行任务" value="execute_task" />
                      <el-option label="系统重启" value="system_restart" />
                      <el-option label="缓存清理" value="clear_cache" />
                      <el-option label="临时文件清理" value="cleanup_temp" />
                      <el-option label="数据库优化" value="optimize_database" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="时间范围">
                    <el-date-picker
                      v-model="logFilters.dateRange"
                      type="daterange"
                      start-placeholder="开始日期"
                      end-placeholder="结束日期"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                      @change="filterLogs"
                    />
                  </el-form-item>
                </el-form>
              </div>
              
              <el-table
                v-loading="loading.logs"
                :data="logs"
                style="width: 100%"
              >
                <el-table-column prop="action" label="操作类型" width="150">
                  <template #default="scope">
                    <el-tag :type="getLogActionTagType(scope.row.action)">
                      {{ getLogActionText(scope.row.action) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="描述" min-width="250" />
                <el-table-column prop="result" label="结果" width="100">
                  <template #default="scope">
                    <el-tag :type="getLogResultTagType(scope.row.result)">
                      {{ getLogResultText(scope.row.result) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="created_by" label="操作人" width="120" />
                <el-table-column prop="created_at" label="操作时间" width="180">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.created_at) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                  <template #default="scope">
                    <el-button
                      type="primary"
                      size="small"
                      @click="viewLogDetails(scope.row)"
                    >
                      详情
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="logPagination.page"
                  v-model:page-size="logPagination.limit"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="logPagination.total"
                  @size-change="handleLogSizeChange"
                  @current-change="handleLogCurrentChange"
                />
              </div>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
    
    <!-- 创建任务对话框 -->
    <el-dialog
      v-model="createTaskDialog.visible"
      title="创建维护任务"
      width="500px"
    >
      <el-form
        ref="taskFormRef"
        :model="createTaskDialog.form"
        :rules="taskFormRules"
        label-width="100px"
      >
        <el-form-item label="任务名称" prop="title">
          <el-input v-model="createTaskDialog.form.title" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="createTaskDialog.form.description"
            type="textarea"
            rows="3"
            placeholder="请输入任务描述"
          />
        </el-form-item>
        <el-form-item label="任务类型" prop="task_type">
          <el-select v-model="createTaskDialog.form.task_type" placeholder="请选择任务类型">
            <el-option label="缓存清理" value="cache_clear" />
            <el-option label="临时文件清理" value="temp_cleanup" />
            <el-option label="数据库优化" value="db_optimize" />
            <el-option label="备份" value="backup" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="createTaskDialog.form.priority" placeholder="请选择优先级">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划时间" prop="scheduled_at">
          <el-date-picker
            v-model="createTaskDialog.form.scheduled_at"
            type="datetime"
            placeholder="选择计划执行时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createTaskDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          @click="createTask"
          :loading="createTaskDialog.loading"
        >
          创建
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 任务详情对话框 -->
    <el-dialog
      v-model="taskDetailDialog.visible"
      title="任务详情"
      width="600px"
    >
      <div v-if="taskDetailDialog.task" class="task-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">{{ taskDetailDialog.task.id }}</el-descriptions-item>
          <el-descriptions-item label="任务名称">{{ taskDetailDialog.task.title }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">
            <el-tag :type="getTaskTypeTagType(taskDetailDialog.task.task_type)">
              {{ getTaskTypeText(taskDetailDialog.task.task_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityTagType(taskDetailDialog.task.priority)">
              {{ getPriorityText(taskDetailDialog.task.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getTaskStatusTagType(taskDetailDialog.task.status)">
              {{ getTaskStatusText(taskDetailDialog.task.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">{{ taskDetailDialog.task.created_by }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(taskDetailDialog.task.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(taskDetailDialog.task.updated_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="taskDetailDialog.task.scheduled_at" label="计划时间">{{ formatDateTime(taskDetailDialog.task.scheduled_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="taskDetailDialog.task.started_at" label="开始时间">{{ formatDateTime(taskDetailDialog.task.started_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="taskDetailDialog.task.completed_at" label="完成时间">{{ formatDateTime(taskDetailDialog.task.completed_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="taskDetailDialog.task.description" label="描述" :span="2">{{ taskDetailDialog.task.description }}</el-descriptions-item>
          <el-descriptions-item v-if="taskDetailDialog.task.result" label="执行结果" :span="2">
            <pre>{{ JSON.stringify(taskDetailDialog.task.result, null, 2) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="taskDetailDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
    
    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="logDetailDialog.visible"
      title="日志详情"
      width="600px"
    >
      <div v-if="logDetailDialog.log" class="log-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="日志ID">{{ logDetailDialog.log.id }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag :type="getLogActionTagType(logDetailDialog.log.action)">
              {{ getLogActionText(logDetailDialog.log.action) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作人">{{ logDetailDialog.log.created_by }}</el-descriptions-item>
          <el-descriptions-item label="操作时间">{{ formatDateTime(logDetailDialog.log.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ logDetailDialog.log.description }}</el-descriptions-item>
          <el-descriptions-item label="结果">
            <el-tag :type="getLogResultTagType(logDetailDialog.log.result)">
              {{ getLogResultText(logDetailDialog.log.result) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="logDetailDialog.log.error" label="错误信息" :span="2">
            <pre>{{ logDetailDialog.log.error }}</pre>
          </el-descriptions-item>
          <el-descriptions-item v-if="logDetailDialog.log.metadata" label="元数据" :span="2">
            <pre>{{ JSON.stringify(logDetailDialog.log.metadata, null, 2) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="logDetailDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Download, Search, Delete, DataLine, Coin, Monitor, DataAnalysis } from '@element-plus/icons-vue'
import {
  getMaintenanceTasks,
  createMaintenanceTask,
  updateMaintenanceTask,
  deleteMaintenanceTask,
  executeMaintenanceTask,
  getBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  getSystemHealth,
  getSystemInfo,
  getMaintenanceLogs,
  getMaintenanceTaskById
} from '@/api/systemMaintenance'

export default {
  name: 'SystemMaintenance',
  components: {
    Refresh,
    Plus,
    Download,
    Search,
    Delete,
    DataLine,
    Coin,
    Monitor,
    DataAnalysis
  },
  setup() {
    // 响应式数据
    const activeTab = ref('tasks')
    const loading = reactive({
      tasks: false,
      backups: false,
      monitoring: false,
      logs: false
    })
    
    // 维护任务相关数据
    const tasks = ref([])
    const selectedTasks = ref([])
    const taskPagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })
    const taskFilters = reactive({
      status: '',
      priority: ''
    })
    
    // 系统备份相关数据
    const backups = ref([])
    const backupPagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })
    
    // 系统监控相关数据
    const systemHealth = reactive({
      status: 'unknown',
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      disk: { status: 'unknown' },
      memory: { status: 'unknown' },
      uptime: 0
    })
    const systemInfo = reactive({
      nodeVersion: '',
      platform: '',
      arch: '',
      totalmem: 0,
      freemem: 0
    })
    
    // 维护日志相关数据
    const logs = ref([])
    const logPagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })
    const logFilters = reactive({
      action: '',
      dateRange: []
    })
    
    // 创建任务对话框
    const createTaskDialog = reactive({
      visible: false,
      loading: false,
      form: {
        title: '',
        description: '',
        task_type: '',
        priority: 'medium',
        scheduled_at: null
      }
    })
    
    // 任务详情对话框
    const taskDetailDialog = reactive({
      visible: false,
      task: null
    })
    
    // 日志详情对话框
    const logDetailDialog = reactive({
      visible: false,
      log: null
    })
    
    // 正在执行的任务ID
    const executingTaskId = ref(null)
    
    // 表单验证规则
    const taskFormRules = {
      title: [
        { required: true, message: '请输入任务名称', trigger: 'blur' }
      ],
      task_type: [
        { required: true, message: '请选择任务类型', trigger: 'change' }
      ],
      priority: [
        { required: true, message: '请选择优先级', trigger: 'change' }
      ]
    }
    
    // 获取维护任务列表
    const fetchTasks = async () => {
      loading.tasks = true
      try {
        const params = {
          page: taskPagination.page,
          limit: taskPagination.limit,
          ...taskFilters
        }
        
        const response = await getMaintenanceTasks(params)
        if (response.success) {
          tasks.value = response.data.tasks || []
          taskPagination.total = response.data.pagination?.total || 0
        } else {
          ElMessage.error(response.message || '获取维护任务列表失败')
        }
      } catch (error) {
        console.error('获取维护任务列表失败:', error)
        ElMessage.error('获取维护任务列表失败')
      } finally {
        loading.tasks = false
      }
    }
    
    // 获取备份列表
    const fetchBackups = async () => {
      loading.backups = true
      try {
        const params = {
          page: backupPagination.page,
          limit: backupPagination.limit
        }
        
        const response = await getBackups(params)
        if (response.success) {
          backups.value = response.data.backups || []
          backupPagination.total = response.data.pagination?.total || 0
        } else {
          ElMessage.error(response.message || '获取备份列表失败')
        }
      } catch (error) {
        console.error('获取备份列表失败:', error)
        ElMessage.error('获取备份列表失败')
      } finally {
        loading.backups = false
      }
    }
    
    // 获取系统健康状态
    const fetchSystemHealth = async () => {
      loading.monitoring = true
      try {
        const response = await getSystemHealth()
        if (response.success) {
          Object.assign(systemHealth, response.data)
        } else {
          ElMessage.error(response.message || '获取系统健康状态失败')
        }
      } catch (error) {
        console.error('获取系统健康状态失败:', error)
        ElMessage.error('获取系统健康状态失败')
      } finally {
        loading.monitoring = false
      }
    }
    
    // 获取系统信息
    const fetchSystemInfo = async () => {
      try {
        const response = await getSystemInfo()
        if (response.success) {
          Object.assign(systemInfo, response.data)
        } else {
          ElMessage.error(response.message || '获取系统信息失败')
        }
      } catch (error) {
        console.error('获取系统信息失败:', error)
        ElMessage.error('获取系统信息失败')
      }
    }
    
    // 获取维护日志
    const fetchLogs = async () => {
      loading.logs = true
      try {
        const params = {
          page: logPagination.page,
          limit: logPagination.limit,
          action: logFilters.action,
          start_date: logFilters.dateRange?.[0],
          end_date: logFilters.dateRange?.[1]
        }
        
        const response = await getMaintenanceLogs(params)
        if (response.success) {
          logs.value = response.data.logs || []
          logPagination.total = response.data.pagination?.total || 0
        } else {
          ElMessage.error(response.message || '获取维护日志失败')
        }
      } catch (error) {
        console.error('获取维护日志失败:', error)
        ElMessage.error('获取维护日志失败')
      } finally {
        loading.logs = false
      }
    }
    
    // 刷新所有数据
    const refreshData = () => {
      switch (activeTab.value) {
        case 'tasks':
          fetchTasks()
          break
        case 'backups':
          fetchBackups()
          break
        case 'monitoring':
          fetchSystemHealth()
          fetchSystemInfo()
          break
        case 'logs':
          fetchLogs()
          break
      }
    }
    
    // 标签页切换
    const handleTabClick = () => {
      refreshData()
    }
    
    // 任务筛选
    const filterTasks = () => {
      taskPagination.page = 1
      fetchTasks()
    }
    
    // 日志筛选
    const filterLogs = () => {
      logPagination.page = 1
      fetchLogs()
    }
    
    // 显示创建任务对话框
    const showCreateTaskDialog = () => {
      createTaskDialog.form = {
        title: '',
        description: '',
        task_type: '',
        priority: 'medium',
        scheduled_at: null
      }
      createTaskDialog.visible = true
    }
    
    // 创建任务
    const createTask = async () => {
      createTaskDialog.loading = true
      try {
        const response = await createMaintenanceTask(createTaskDialog.form)
        if (response.success) {
          ElMessage.success('创建维护任务成功')
          createTaskDialog.visible = false
          fetchTasks()
        } else {
          ElMessage.error(response.message || '创建维护任务失败')
        }
      } catch (error) {
        console.error('创建维护任务失败:', error)
        ElMessage.error('创建维护任务失败')
      } finally {
        createTaskDialog.loading = false
      }
    }
    
    // 执行任务
    const executeTask = async (task) => {
      try {
        await ElMessageBox.confirm(`确定要执行任务 "${task.title}" 吗？`, '确认执行', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        executingTaskId.value = task.id
        const response = await executeMaintenanceTask(task.id)
        if (response.success) {
          ElMessage.success('执行维护任务成功')
          fetchTasks()
        } else {
          ElMessage.error(response.message || '执行维护任务失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('执行维护任务失败:', error)
          ElMessage.error('执行维护任务失败')
        }
      } finally {
        executingTaskId.value = null
      }
    }
    
    // 查看任务详情
    const viewTaskDetails = async (task) => {
      try {
        const response = await getMaintenanceTaskById(task.id)
        if (response.success) {
          taskDetailDialog.task = response.data
          taskDetailDialog.visible = true
        } else {
          ElMessage.error(response.message || '获取任务详情失败')
        }
      } catch (error) {
        console.error('获取任务详情失败:', error)
        ElMessage.error('获取任务详情失败')
      }
    }
    
    // 删除任务
    const deleteTask = async (task) => {
      try {
        await ElMessageBox.confirm(`确定要删除任务 "${task.title}" 吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const response = await deleteMaintenanceTask(task.id)
        if (response.success) {
          ElMessage.success('删除维护任务成功')
          fetchTasks()
        } else {
          ElMessage.error(response.message || '删除维护任务失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除维护任务失败:', error)
          ElMessage.error('删除维护任务失败')
        }
      }
    }
    
    // 创建备份
    const createBackup = async () => {
      try {
        const response = await createBackup({
          description: '手动创建的备份',
          backup_type: 'full'
        })
        if (response.success) {
          ElMessage.success('备份任务已创建')
          fetchBackups()
        } else {
          ElMessage.error(response.message || '创建备份失败')
        }
      } catch (error) {
        console.error('创建备份失败:', error)
        ElMessage.error('创建备份失败')
      }
    }
    
    // 恢复备份
    const restoreBackup = async (backup) => {
      try {
        await ElMessageBox.confirm(`确定要恢复备份 "${backup.filename}" 吗？这将覆盖当前数据。`, '确认恢复', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const response = await restoreBackup(backup.id)
        if (response.success) {
          ElMessage.success('备份恢复任务已启动')
        } else {
          ElMessage.error(response.message || '恢复备份失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('恢复备份失败:', error)
          ElMessage.error('恢复备份失败')
        }
      }
    }
    
    // 删除备份
    const deleteBackup = async (backup) => {
      try {
        await ElMessageBox.confirm(`确定要删除备份 "${backup.filename}" 吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const response = await deleteBackup(backup.id)
        if (response.success) {
          ElMessage.success('删除备份成功')
          fetchBackups()
        } else {
          ElMessage.error(response.message || '删除备份失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除备份失败:', error)
          ElMessage.error('删除备份失败')
        }
      }
    }
    
    // 检查系统健康状态
    const checkSystemHealth = async () => {
      try {
        loading.monitoring = true
        const response = await getSystemHealth()
        if (response.success) {
          Object.assign(systemHealth, response.data)
          ElMessage.success('系统检查完成')
        } else {
          ElMessage.error(response.message || '系统检查失败')
        }
      } catch (error) {
        console.error('系统检查失败:', error)
        ElMessage.error('系统检查失败')
      } finally {
        loading.monitoring = false
      }
    }
    
    // 清空日志
    const clearLogs = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有维护日志吗？', '确认清空', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        // 这里应该调用清空日志的API，暂时显示提示
        ElMessage.success('维护日志清空功能待实现')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清空维护日志失败:', error)
          ElMessage.error('清空维护日志失败')
        }
      }
    }
    
    // 查看日志详情
    const viewLogDetails = (log) => {
      logDetailDialog.log = log
      logDetailDialog.visible = true
    }
    
    // 任务选择变化
    const handleTaskSelectionChange = (selection) => {
      selectedTasks.value = selection
    }
    
    // 任务分页大小变化
    const handleTaskSizeChange = (size) => {
      taskPagination.limit = size
      taskPagination.page = 1
      fetchTasks()
    }
    
    // 任务当前页变化
    const handleTaskCurrentChange = (page) => {
      taskPagination.page = page
      fetchTasks()
    }
    
    // 备份分页大小变化
    const handleBackupSizeChange = (size) => {
      backupPagination.limit = size
      backupPagination.page = 1
      fetchBackups()
    }
    
    // 备份当前页变化
    const handleBackupCurrentChange = (page) => {
      backupPagination.page = page
      fetchBackups()
    }
    
    // 日志分页大小变化
    const handleLogSizeChange = (size) => {
      logPagination.limit = size
      logPagination.page = 1
      fetchLogs()
    }
    
    // 日志当前页变化
    const handleLogCurrentChange = (page) => {
      logPagination.page = page
      fetchLogs()
    }
    
    // 获取任务类型标签类型
    const getTaskTypeTagType = (type) => {
      const types = {
        cache_clear: 'primary',
        temp_cleanup: 'success',
        db_optimize: 'warning',
        backup: 'danger'
      }
      return types[type] || 'info'
    }
    
    // 获取任务类型文本
    const getTaskTypeText = (type) => {
      const texts = {
        cache_clear: '缓存清理',
        temp_cleanup: '临时文件清理',
        db_optimize: '数据库优化',
        backup: '备份'
      }
      return texts[type] || type
    }
    
    // 获取优先级标签类型
    const getPriorityTagType = (priority) => {
      const types = {
        low: 'info',
        medium: 'warning',
        high: 'danger',
        critical: 'danger'
      }
      return types[priority] || 'info'
    }
    
    // 获取优先级文本
    const getPriorityText = (priority) => {
      const texts = {
        low: '低',
        medium: '中',
        high: '高',
        critical: '紧急'
      }
      return texts[priority] || priority
    }
    
    // 获取任务状态标签类型
    const getTaskStatusTagType = (status) => {
      const types = {
        pending: 'info',
        in_progress: 'warning',
        completed: 'success',
        failed: 'danger',
        cancelled: 'info'
      }
      return types[status] || 'info'
    }
    
    // 获取任务状态文本
    const getTaskStatusText = (status) => {
      const texts = {
        pending: '待处理',
        in_progress: '进行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消'
      }
      return texts[status] || status
    }
    
    // 获取备份类型标签类型
    const getBackupTypeTagType = (type) => {
      const types = {
        full: 'primary',
        incremental: 'success',
        differential: 'warning'
      }
      return types[type] || 'info'
    }
    
    // 获取备份类型文本
    const getBackupTypeText = (type) => {
      const texts = {
        full: '完整备份',
        incremental: '增量备份',
        differential: '差异备份'
      }
      return texts[type] || type
    }
    
    // 获取备份状态标签类型
    const getBackupStatusTagType = (status) => {
      const types = {
        in_progress: 'warning',
        completed: 'success',
        failed: 'danger'
      }
      return types[status] || 'info'
    }
    
    // 获取备份状态文本
    const getBackupStatusText = (status) => {
      const texts = {
        in_progress: '进行中',
        completed: '已完成',
        failed: '失败'
      }
      return texts[status] || status
    }
    
    // 获取健康状态类名
    const getHealthStatusClass = (status) => {
      const classes = {
        healthy: 'healthy',
        warning: 'warning',
        critical: 'critical',
        unhealthy: 'unhealthy'
      }
      return classes[status] || 'unknown'
    }
    
    // 获取健康状态文本
    const getHealthStatusText = (status) => {
      const texts = {
        healthy: '健康',
        warning: '警告',
        critical: '严重',
        unhealthy: '不健康',
        unknown: '未知'
      }
      return texts[status] || status
    }
    
    // 获取日志操作标签类型
    const getLogActionTagType = (action) => {
      const types = {
        create_backup: 'primary',
        restore_backup: 'success',
        execute_task: 'warning',
        system_restart: 'danger',
        clear_cache: 'info',
        cleanup_temp: 'info',
        optimize_database: 'info'
      }
      return types[action] || 'info'
    }
    
    // 获取日志操作文本
    const getLogActionText = (action) => {
      const texts = {
        create_backup: '创建备份',
        restore_backup: '恢复备份',
        execute_task: '执行任务',
        system_restart: '系统重启',
        clear_cache: '缓存清理',
        cleanup_temp: '临时文件清理',
        optimize_database: '数据库优化'
      }
      return texts[action] || action
    }
    
    // 获取日志结果标签类型
    const getLogResultTagType = (result) => {
      const types = {
        success: 'success',
        failed: 'danger',
        partial: 'warning'
      }
      return types[result] || 'info'
    }
    
    // 获取日志结果文本
    const getLogResultText = (result) => {
      const texts = {
        success: '成功',
        failed: '失败',
        partial: '部分成功'
      }
      return texts[result] || result
    }
    
    // 格式化日期时间
    const formatDateTime = (dateTime) => {
      if (!dateTime) return ''
      return new Date(dateTime).toLocaleString()
    }
    
    // 格式化字节
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    // 格式化运行时间
    const formatUptime = (seconds) => {
      if (!seconds) return '0秒'
      
      const days = Math.floor(seconds / (24 * 3600))
      const hours = Math.floor((seconds % (24 * 3600)) / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      
      let result = ''
      if (days > 0) result += `${days}天 `
      if (hours > 0) result += `${hours}小时 `
      if (minutes > 0) result += `${minutes}分钟 `
      result += `${secs}秒`
      
      return result
    }
    
    // 组件挂载时获取数据
    onMounted(() => {
      fetchTasks()
    })
    
    return {
      activeTab,
      loading,
      tasks,
      selectedTasks,
      taskPagination,
      taskFilters,
      backups,
      backupPagination,
      systemHealth,
      systemInfo,
      logs,
      logPagination,
      logFilters,
      createTaskDialog,
      taskDetailDialog,
      logDetailDialog,
      executingTaskId,
      taskFormRules,
      
      // 方法
      refreshData,
      handleTabClick,
      filterTasks,
      filterLogs,
      showCreateTaskDialog,
      createTask,
      executeTask,
      viewTaskDetails,
      deleteTask,
      createBackup,
      restoreBackup,
      deleteBackup,
      checkSystemHealth,
      clearLogs,
      viewLogDetails,
      handleTaskSelectionChange,
      handleTaskSizeChange,
      handleTaskCurrentChange,
      handleBackupSizeChange,
      handleBackupCurrentChange,
      handleLogSizeChange,
      handleLogCurrentChange,
      getTaskTypeTagType,
      getTaskTypeText,
      getPriorityTagType,
      getPriorityText,
      getTaskStatusTagType,
      getTaskStatusText,
      getBackupTypeTagType,
      getBackupTypeText,
      getBackupStatusTagType,
      getBackupStatusText,
      getHealthStatusClass,
      getHealthStatusText,
      getLogActionTagType,
      getLogActionText,
      getLogResultTagType,
      getLogResultText,
      formatDateTime,
      formatBytes,
      formatUptime
    }
  }
}
</script>

<style scoped>
.system-maintenance {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
}

.header-content h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.header-content p {
  margin: 5px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.maintenance-content {
  padding: 20px;
}

.maintenance-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  gap: 10px;
}

.task-filters,
.log-filters {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.health-status {
  margin-bottom: 20px;
}

.health-card {
  height: 120px;
}

.health-item {
  display: flex;
  align-items: center;
  height: 100%;
}

.health-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.health-icon.database {
  background-color: #409eff;
}

.health-icon.redis {
  background-color: #67c23a;
}

.health-icon.disk {
  background-color: #e6a23c;
}

.health-icon.memory {
  background-color: #f56c6c;
}

.health-info {
  flex: 1;
}

.health-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.health-value {
  font-size: 18px;
  font-weight: bold;
}

.health-value.healthy {
  color: #67c23a;
}

.health-value.warning {
  color: #e6a23c;
}

.health-value.critical {
  color: #f56c6c;
}

.health-value.unhealthy {
  color: #909399;
}

.system-info {
  margin-top: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.task-details pre,
.log-details pre {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
}
</style>
</file_content>