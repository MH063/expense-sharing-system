<template>
  <div class="version-control">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>文档版本控制</h1>
          <p>管理文档版本历史、变更记录和版本对比</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="createVersion">创建新版本</el-button>
          <el-button @click="exportHistory">导出历史</el-button>
        </div>
      </el-header>
      
      <el-main>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card class="version-list-card">
              <template #header>
                <div class="card-header">
                  <span>版本列表</span>
                  <el-select v-model="selectedDoc" placeholder="选择文档" style="width: 150px">
                    <el-option
                      v-for="doc in documents"
                      :key="doc.id"
                      :label="doc.name"
                      :value="doc.id"
                    />
                  </el-select>
                </div>
              </template>
              
              <el-table
                :data="versions"
                highlight-current-row
                @current-change="handleVersionSelect"
                height="500"
              >
                <el-table-column prop="version" label="版本" width="80" />
                <el-table-column prop="date" label="日期" width="100" />
                <el-table-column prop="author" label="作者" width="80" />
                <el-table-column prop="description" label="描述" />
                <el-table-column label="操作" width="120">
                  <template #default="scope">
                    <el-button size="small" @click="compareWithCurrent(scope.row)">对比</el-button>
                    <el-button size="small" type="danger" @click="deleteVersion(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
          
          <el-col :span="16">
            <el-card class="version-detail-card">
              <template #header>
                <div class="card-header">
                  <span v-if="selectedVersion">版本详情: {{ selectedVersion.version }}</span>
                  <span v-else>版本详情</span>
                  <div class="header-actions">
                    <el-button v-if="selectedVersion" @click="restoreVersion">恢复此版本</el-button>
                    <el-button v-if="selectedVersion" @click="downloadVersion">下载</el-button>
                  </div>
                </div>
              </template>
              
              <div v-if="selectedVersion" class="version-detail">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="版本号">{{ selectedVersion.version }}</el-descriptions-item>
                  <el-descriptions-item label="创建日期">{{ selectedVersion.date }}</el-descriptions-item>
                  <el-descriptions-item label="作者">{{ selectedVersion.author }}</el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="selectedVersion.status === 'current' ? 'success' : 'info'">
                      {{ selectedVersion.status === 'current' ? '当前版本' : '历史版本' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="变更摘要" :span="2">{{ selectedVersion.description }}</el-descriptions-item>
                </el-descriptions>
                
                <el-divider />
                
                <h3>变更记录</h3>
                <el-table :data="selectedVersion.changes" style="width: 100%">
                  <el-table-column prop="section" label="章节" width="200" />
                  <el-table-column prop="type" label="变更类型" width="100">
                    <template #default="scope">
                      <el-tag :type="getChangeTypeTag(scope.row.type)">
                        {{ scope.row.type }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="description" label="变更描述" />
                </el-table>
                
                <el-divider />
                
                <h3>文档内容</h3>
                <div class="content-preview">
                  <el-input
                    v-model="selectedVersion.content"
                    type="textarea"
                    :rows="15"
                    readonly
                  />
                </div>
              </div>
              
              <div v-else class="no-selection">
                <el-empty description="请从左侧选择一个版本查看详情" />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
    
    <!-- 创建新版本对话框 -->
    <el-dialog v-model="createVersionVisible" title="创建新版本" width="50%">
      <el-form :model="newVersion" label-width="80px">
        <el-form-item label="版本号">
          <el-input v-model="newVersion.version" placeholder="例如: v1.2.0" />
        </el-form-item>
        <el-form-item label="变更描述">
          <el-input
            v-model="newVersion.description"
            type="textarea"
            :rows="4"
            placeholder="请描述此版本的主要变更..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createVersionVisible = false">取消</el-button>
          <el-button type="primary" @click="saveNewVersion">保存</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 版本对比对话框 -->
    <el-dialog v-model="compareVisible" title="版本对比" width="80%">
      <div class="compare-container">
        <el-row :gutter="20">
          <el-col :span="12">
            <h3>当前版本</h3>
            <div class="compare-content">
              <el-input
                v-model="currentContent"
                type="textarea"
                :rows="20"
                readonly
              />
            </div>
          </el-col>
          <el-col :span="12">
            <h3>{{ compareVersion.version }}</h3>
            <div class="compare-content">
              <el-input
                v-model="compareVersion.content"
                type="textarea"
                :rows="20"
                readonly
              />
            </div>
          </el-col>
        </el-row>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 文档列表
const documents = ref([
  { id: '1', name: '需求文档' },
  { id: '2', name: '数据库设计文档' },
  { id: '3', name: 'API接口文档' },
  { id: '4', name: '系统设计文档' }
])

// 选中的文档
const selectedDoc = ref('1')

// 版本列表
const versions = ref([
  {
    id: '1',
    version: 'v1.2.0',
    date: '2023-12-01',
    author: '张三',
    description: '添加了支付流程优化功能需求',
    status: 'current',
    content: '需求文档 v1.2.0 的内容...',
    changes: [
      { section: '支付流程', type: '新增', description: '添加扫码支付功能需求' },
      { section: '用户管理', type: '修改', description: '更新用户角色权限说明' },
      { section: '数据统计', type: '新增', description: '添加费用统计图表需求' }
    ]
  },
  {
    id: '2',
    version: 'v1.1.0',
    date: '2023-11-15',
    author: '李四',
    description: '完善了审核与争议处理流程',
    status: 'history',
    content: '需求文档 v1.1.0 的内容...',
    changes: [
      { section: '审核流程', type: '新增', description: '添加审核流程定义' },
      { section: '争议处理', type: '新增', description: '添加争议处理机制' },
      { section: '系统管理', type: '修改', description: '更新系统管理员权限说明' }
    ]
  },
  {
    id: '3',
    version: 'v1.0.0',
    date: '2023-10-20',
    author: '王五',
    description: '初始版本，包含基础功能需求',
    status: 'history',
    content: '需求文档 v1.0.0 的内容...',
    changes: [
      { section: '用户管理', type: '新增', description: '添加用户注册登录功能' },
      { section: '寝室管理', type: '新增', description: '添加寝室创建管理功能' },
      { section: '费用管理', type: '新增', description: '添加费用记录分摊功能' }
    ]
  }
])

// 选中的版本
const selectedVersion = ref(null)

// 当前版本内容（用于对比）
const currentContent = ref('需求文档 v1.2.0 的内容...')

// 对比版本
const compareVersion = ref({})

// 创建版本对话框
const createVersionVisible = ref(false)

// 新版本表单
const newVersion = ref({
  version: '',
  description: ''
})

// 处理版本选择
const handleVersionSelect = (version) => {
  selectedVersion.value = version
}

// 获取变更类型标签
const getChangeTypeTag = (type) => {
  const typeMap = {
    '新增': 'success',
    '修改': 'warning',
    '删除': 'danger'
  }
  return typeMap[type] || 'info'
}

// 创建新版本
const createVersion = () => {
  newVersion.value = {
    version: '',
    description: ''
  }
  createVersionVisible.value = true
}

// 保存新版本
const saveNewVersion = () => {
  if (!newVersion.value.version || !newVersion.value.description) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  // 实际项目中应该调用API创建新版本
  ElMessage.success('新版本创建成功')
  createVersionVisible.value = false
  
  // 添加到版本列表
  versions.value.unshift({
    id: Date.now().toString(),
    version: newVersion.value.version,
    date: new Date().toISOString().split('T')[0],
    author: '当前用户',
    description: newVersion.value.description,
    status: 'current',
    content: '新版本的内容...',
    changes: []
  })
}

// 删除版本
const deleteVersion = (version) => {
  ElMessageBox.confirm(
    `确定要删除版本 ${version.version} 吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 实际项目中应该调用API删除版本
    const index = versions.value.findIndex(v => v.id === version.id)
    if (index !== -1) {
      versions.value.splice(index, 1)
      ElMessage.success('版本删除成功')
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 恢复版本
const restoreVersion = () => {
  if (!selectedVersion.value) return
  
  ElMessageBox.confirm(
    `确定要恢复到版本 ${selectedVersion.value.version} 吗？当前版本将被替换。`,
    '恢复确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 实际项目中应该调用API恢复版本
    ElMessage.success(`已恢复到版本 ${selectedVersion.value.version}`)
  }).catch(() => {
    // 用户取消恢复
  })
}

// 下载版本
const downloadVersion = () => {
  if (!selectedVersion.value) return
  
  // 实际项目中应该调用API下载版本
  ElMessage.success(`版本 ${selectedVersion.value.version} 下载中...`)
}

// 与当前版本对比
const compareWithCurrent = (version) => {
  compareVersion.value = version
  compareVisible.value = true
}

// 导出历史
const exportHistory = () => {
  // 实际项目中应该调用API导出历史
  ElMessage.success('版本历史导出中...')
}

// 组件挂载时加载数据
onMounted(() => {
  // 这里可以添加API调用来获取最新的版本数据
  console.log('文档版本控制页面已加载')
})
</script>

<style scoped>
.version-control {
  height: 100vh;
  overflow: hidden;
}

.page-header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-content h1 {
  margin: 0 0 5px 0;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-list-card {
  height: calc(100vh - 200px);
}

.version-detail-card {
  height: calc(100vh - 200px);
}

.version-detail {
  height: calc(100% - 60px);
  overflow-y: auto;
}

.content-preview {
  margin-top: 15px;
}

.no-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.compare-container {
  height: 60vh;
  overflow: auto;
}

.compare-content {
  margin-top: 10px;
}
</style>