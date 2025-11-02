<template>
  <div class="doc-versions">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>文档版本控制</h1>
          <p>管理文档版本历史、变更记录和版本发布</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="createVersion">创建新版本</el-button>
          <el-button @click="compareVersions">版本对比</el-button>
          <el-button @click="exportVersions">导出版本</el-button>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="250px" class="doc-sidebar">
          <el-menu
            default-active="all"
            class="version-menu"
            @select="handleMenuSelect"
          >
            <el-menu-item index="all">
              <el-icon><Document /></el-icon>
              <span>全部文档</span>
            </el-menu-item>
            <el-menu-item index="requirements">
              <el-icon><Document /></el-icon>
              <span>需求文档</span>
            </el-menu-item>
            <el-menu-item index="database">
              <el-icon><Document /></el-icon>
              <span>数据库文档</span>
            </el-menu-item>
            <el-menu-item index="system">
              <el-icon><Document /></el-icon>
              <span>系统设计文档</span>
            </el-menu-item>
            <el-menu-item index="api">
              <el-icon><Document /></el-icon>
              <span>API接口文档</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        
        <el-main class="version-content">
          <div class="version-list">
            <el-table :data="filteredVersions" style="width: 100%" @row-click="viewVersionDetails">
              <el-table-column prop="docName" label="文档名称" width="200" />
              <el-table-column prop="version" label="版本号" width="100" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="author" label="作者" width="120" />
              <el-table-column prop="updateTime" label="更新时间" width="150" />
              <el-table-column prop="description" label="变更说明" />
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button type="primary" size="small" @click.stop="viewVersion(scope.row)">查看</el-button>
                  <el-button size="small" @click.stop="downloadVersion(scope.row)">下载</el-button>
                  <el-button type="danger" size="small" @click.stop="deleteVersion(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="totalVersions"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </div>
        </el-main>
      </el-container>
    </el-container>
    
    <!-- 版本详情对话框 -->
    <el-dialog v-model="versionDetailVisible" title="版本详情" width="70%">
      <div v-if="selectedVersion" class="version-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="文档名称">{{ selectedVersion.docName }}</el-descriptions-item>
          <el-descriptions-item label="版本号">{{ selectedVersion.version }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedVersion.status)">{{ selectedVersion.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="作者">{{ selectedVersion.author }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedVersion.createTime }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ selectedVersion.updateTime }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider />
        
        <div class="version-content">
          <h3>变更说明</h3>
          <p>{{ selectedVersion.description }}</p>
        </div>
        
        <div class="version-content">
          <h3>变更详情</h3>
          <el-table :data="selectedVersion.changes" style="width: 100%">
            <el-table-column prop="type" label="变更类型" width="120">
              <template #default="scope">
                <el-tag :type="getChangeType(scope.row.type)">{{ scope.row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="section" label="章节" width="200" />
            <el-table-column prop="description" label="变更描述" />
            <el-table-column prop="author" label="作者" width="120" />
            <el-table-column prop="time" label="时间" width="150" />
          </el-table>
        </div>
        
        <div class="version-actions">
          <el-button @click="restoreVersion">恢复此版本</el-button>
          <el-button type="primary" @click="downloadVersion(selectedVersion)">下载版本</el-button>
        </div>
      </div>
    </el-dialog>
    
    <!-- 创建版本对话框 -->
    <el-dialog v-model="createVersionVisible" title="创建新版本" width="50%">
      <el-form :model="newVersion" label-width="100px">
        <el-form-item label="文档类型">
          <el-select v-model="newVersion.docType" placeholder="选择文档类型">
            <el-option label="需求文档" value="requirements" />
            <el-option label="数据库文档" value="database" />
            <el-option label="系统设计文档" value="system" />
            <el-option label="API接口文档" value="api" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="版本号">
          <el-input v-model="newVersion.version" placeholder="例如: v1.2.0" />
        </el-form-item>
        
        <el-form-item label="版本状态">
          <el-select v-model="newVersion.status" placeholder="选择状态">
            <el-option label="草稿" value="draft" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="已发布" value="published" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="变更说明">
          <el-input
            v-model="newVersion.description"
            type="textarea"
            :rows="4"
            placeholder="请描述此版本的主要变更内容"
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
            <div class="compare-section">
              <h3>源版本</h3>
              <el-select v-model="compare.source" placeholder="选择源版本" style="width: 100%">
                <el-option
                  v-for="version in versions"
                  :key="version.id"
                  :label="`${version.docName} - ${version.version}`"
                  :value="version.id"
                />
              </el-select>
              <div class="compare-content" v-if="compareSource">
                <p><strong>文档:</strong> {{ compareSource.docName }}</p>
                <p><strong>版本:</strong> {{ compareSource.version }}</p>
                <p><strong>状态:</strong> {{ compareSource.status }}</p>
                <p><strong>更新时间:</strong> {{ compareSource.updateTime }}</p>
                <p><strong>变更说明:</strong> {{ compareSource.description }}</p>
              </div>
            </div>
          </el-col>
          
          <el-col :span="12">
            <div class="compare-section">
              <h3>目标版本</h3>
              <el-select v-model="compare.target" placeholder="选择目标版本" style="width: 100%">
                <el-option
                  v-for="version in versions"
                  :key="version.id"
                  :label="`${version.docName} - ${version.version}`"
                  :value="version.id"
                />
              </el-select>
              <div class="compare-content" v-if="compareTarget">
                <p><strong>文档:</strong> {{ compareTarget.docName }}</p>
                <p><strong>版本:</strong> {{ compareTarget.version }}</p>
                <p><strong>状态:</strong> {{ compareTarget.status }}</p>
                <p><strong>更新时间:</strong> {{ compareTarget.updateTime }}</p>
                <p><strong>变更说明:</strong> {{ compareTarget.description }}</p>
              </div>
            </div>
          </el-col>
        </el-row>
        
        <div class="compare-result" v-if="compareSource && compareTarget">
          <h3>对比结果</h3>
          <el-table :data="compareResult" style="width: 100%">
            <el-table-column prop="section" label="章节" width="200" />
            <el-table-column prop="changeType" label="变更类型" width="120">
              <template #default="scope">
                <el-tag :type="getChangeType(scope.row.changeType)">{{ scope.row.changeType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="变更描述" />
          </el-table>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="compareVisible = false">关闭</el-button>
          <el-button type="primary" @click="exportCompare">导出对比结果</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document } from '@element-plus/icons-vue'

// 当前选中的文档类型
const selectedDocType = ref('all')

// 版本列表数据
const versions = ref([
  {
    id: '1',
    docName: '需求文档',
    docType: 'requirements',
    version: 'v1.2.0',
    status: 'published',
    author: '张三',
    createTime: '2023-11-01',
    updateTime: '2023-11-15',
    description: '添加了支付功能需求，优化了用户界面设计',
    changes: [
      { type: '新增', section: '支付功能', description: '添加了在线支付功能需求', author: '张三', time: '2023-11-15' },
      { type: '修改', section: '用户界面', description: '优化了用户界面设计', author: '李四', time: '2023-11-10' },
      { type: '删除', section: '旧功能', description: '删除了过时的功能需求', author: '王五', time: '2023-11-05' }
    ]
  },
  {
    id: '2',
    docName: '需求文档',
    docType: 'requirements',
    version: 'v1.1.0',
    status: 'published',
    author: '李四',
    createTime: '2023-10-01',
    updateTime: '2023-10-20',
    description: '更新了用户管理功能，添加了权限控制需求',
    changes: [
      { type: '新增', section: '权限控制', description: '添加了权限控制需求', author: '李四', time: '2023-10-20' },
      { type: '修改', section: '用户管理', description: '更新了用户管理功能', author: '张三', time: '2023-10-15' }
    ]
  },
  {
    id: '3',
    docName: '数据库文档',
    docType: 'database',
    version: 'v1.0.5',
    status: 'reviewing',
    author: '王五',
    createTime: '2023-11-05',
    updateTime: '2023-11-20',
    description: '优化了数据库表结构，添加了索引',
    changes: [
      { type: '修改', section: '用户表', description: '优化了用户表结构', author: '王五', time: '2023-11-20' },
      { type: '新增', section: '索引', description: '添加了查询索引', author: '赵六', time: '2023-11-15' }
    ]
  },
  {
    id: '4',
    docName: '系统设计文档',
    docType: 'system',
    version: 'v1.1.0',
    status: 'draft',
    author: '赵六',
    createTime: '2023-11-10',
    updateTime: '2023-11-25',
    description: '更新了系统架构设计，优化了模块划分',
    changes: [
      { type: '新增', section: '支付模块', description: '添加了支付模块设计', author: '赵六', time: '2023-11-25' },
      { type: '修改', section: '系统架构', description: '更新了系统架构设计', author: '张三', time: '2023-11-20' }
    ]
  },
  {
    id: '5',
    docName: 'API接口文档',
    docType: 'api',
    version: 'v1.0.3',
    status: 'published',
    author: '钱七',
    createTime: '2023-10-15',
    updateTime: '2023-11-22',
    description: '添加了支付相关API接口，更新了用户接口',
    changes: [
      { type: '新增', section: '支付API', description: '添加了支付相关API接口', author: '钱七', time: '2023-11-22' },
      { type: '修改', section: '用户API', description: '更新了用户接口', author: '孙八', time: '2023-11-18' }
    ]
  }
])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalVersions = computed(() => filteredVersions.value.length)

// 过滤后的版本列表
const filteredVersions = computed(() => {
  let result = versions.value
  
  if (selectedDocType.value !== 'all') {
    result = result.filter(version => version.docType === selectedDocType.value)
  }
  
  // 分页处理
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return result.slice(start, end)
})

// 版本详情相关
const versionDetailVisible = ref(false)
const selectedVersion = ref(null)

// 创建版本相关
const createVersionVisible = ref(false)
const newVersion = ref({
  docType: '',
  version: '',
  status: 'draft',
  description: ''
})

// 版本对比相关
const compareVisible = ref(false)
const compare = ref({
  source: '',
  target: ''
})

const compareSource = computed(() => {
  return versions.value.find(v => v.id === compare.value.source)
})

const compareTarget = computed(() => {
  return versions.value.find(v => v.id === compare.value.target)
})

const compareResult = ref([
  { section: '支付功能', changeType: '新增', description: '在v1.2.0中新增了支付功能需求' },
  { section: '用户界面', changeType: '修改', description: '在v1.2.0中优化了用户界面设计' },
  { section: '旧功能', changeType: '删除', description: '在v1.2.0中删除了过时的功能需求' }
])

// 处理菜单选择
const handleMenuSelect = (index) => {
  selectedDocType.value = index
  currentPage.value = 1
}

// 查看版本详情
const viewVersionDetails = (row) => {
  selectedVersion.value = row
  versionDetailVisible.value = true
}

// 查看版本
const viewVersion = (version) => {
  // 实际项目中应该跳转到文档查看页面
  ElMessage.success(`查看版本: ${version.docName} - ${version.version}`)
}

// 下载版本
const downloadVersion = (version) => {
  // 实际项目中应该下载文档文件
  ElMessage.success(`下载版本: ${version.docName} - ${version.version}`)
}

// 删除版本
const deleteVersion = (version) => {
  ElMessageBox.confirm(
    `确定要删除版本 ${version.docName} - ${version.version} 吗？`,
    '提示',
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
      ElMessage.success('删除成功')
    }
  }).catch(() => {
    // 取消操作
  })
}

// 创建新版本
const createVersion = () => {
  createVersionVisible.value = true
}

// 保存新版本
const saveNewVersion = () => {
  // 验证表单
  if (!newVersion.value.docType || !newVersion.value.version || !newVersion.value.description) {
    ElMessage.error('请填写完整信息')
    return
  }
  
  // 实际项目中应该调用API创建版本
  const docNameMap = {
    requirements: '需求文档',
    database: '数据库文档',
    system: '系统设计文档',
    api: 'API接口文档'
  }
  
  const newVersionData = {
    id: Date.now().toString(),
    docName: docNameMap[newVersion.value.docType],
    docType: newVersion.value.docType,
    version: newVersion.value.version,
    status: newVersion.value.status,
    author: '当前用户',
    createTime: new Date().toISOString().split('T')[0],
    updateTime: new Date().toISOString().split('T')[0],
    description: newVersion.value.description,
    changes: []
  }
  
  versions.value.unshift(newVersionData)
  
  // 重置表单
  newVersion.value = {
    docType: '',
    version: '',
    status: 'draft',
    description: ''
  }
  
  createVersionVisible.value = false
  ElMessage.success('版本创建成功')
}

// 版本对比
const compareVersions = () => {
  compareVisible.value = true
}

// 导出版本对比结果
const exportCompare = () => {
  // 实际项目中应该导出对比结果
  ElMessage.success('对比结果导出成功')
}

// 导出版本
const exportVersions = () => {
  // 实际项目中应该导出版本列表
  ElMessage.success('版本列表导出成功')
}

// 恢复版本
const restoreVersion = () => {
  ElMessageBox.confirm(
    '确定要恢复到此版本吗？当前版本将被覆盖。',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 实际项目中应该调用API恢复版本
    ElMessage.success('版本恢复成功')
    versionDetailVisible.value = false
  }).catch(() => {
    // 取消操作
  })
}

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    draft: 'info',
    reviewing: 'warning',
    published: 'success'
  }
  return statusMap[status] || 'info'
}

// 获取变更类型
const getChangeType = (type) => {
  const typeMap = {
    '新增': 'success',
    '修改': 'warning',
    '删除': 'danger'
  }
  return typeMap[type] || 'info'
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
}

// 组件挂载时加载数据
onMounted(() => {
  // 这里可以添加API调用来获取最新的版本数据
  console.log('文档版本控制页面已加载')
})
</script>

<style scoped>
.doc-versions {
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

.doc-sidebar {
  background-color: #fafafa;
  border-right: 1px solid #e4e7ed;
  padding: 20px 10px;
  overflow-y: auto;
}

.version-menu {
  border-right: none;
}

.version-content {
  padding: 20px;
  overflow-y: auto;
}

.version-list {
  height: 100%;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.version-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.version-content {
  margin: 20px 0;
}

.version-content h3 {
  margin-bottom: 10px;
  color: #303133;
}

.version-actions {
  margin-top: 20px;
  text-align: right;
}

.compare-container {
  max-height: 70vh;
  overflow-y: auto;
}

.compare-section {
  margin-bottom: 20px;
}

.compare-section h3 {
  margin-bottom: 10px;
  color: #303133;
}

.compare-content {
  margin-top: 15px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
}

.compare-content p {
  margin: 5px 0;
}

.compare-result {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.compare-result h3 {
  margin-bottom: 15px;
  color: #303133;
}
</style>