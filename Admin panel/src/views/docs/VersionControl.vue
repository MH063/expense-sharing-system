<template>
  <div class="version-control">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <el-button @click="goBack" :icon="ArrowLeft" circle class="back-button" />
          <div>
            <h1>文档版本控制</h1>
            <p>管理文档版本历史、变更记录和版本对比</p>
          </div>
        </div>
        <div class="header-actions">
          <el-button @click="refreshData" :icon="Refresh">刷新</el-button>
          <el-button @click="createVersion" :icon="Plus" type="primary">创建新版本</el-button>
          <el-button @click="exportHistory" :icon="Download">导出历史</el-button>
        </div>
      </el-header>
      
      <el-main>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card class="version-list-card">
              <template #header>
                <div class="card-header">
                  <span>版本列表</span>
                  <div class="header-controls">
                    <el-select v-model="selectedDoc" placeholder="选择文档" style="width: 150px">
                      <el-option
                        v-for="doc in documents"
                        :key="doc.id"
                        :label="doc.name"
                        :value="doc.id"
                      />
                    </el-select>
                    <el-button @click="toggleCompareMode" :icon="Scale" :type="compareMode ? 'primary' : ''" size="small">
                      {{ compareMode ? '退出对比' : '版本对比' }}
                    </el-button>
                  </div>
                </div>
              </template>
              
              <div class="filter-controls">
                <el-input
                  v-model="searchText"
                  placeholder="搜索版本..."
                  :prefix-icon="Search"
                  clearable
                  size="small"
                />
                <el-select v-model="filterType" placeholder="筛选类型" size="small" style="width: 100px; margin-top: 8px;">
                  <el-option label="全部" value="" />
                  <el-option label="当前版本" value="current" />
                  <el-option label="历史版本" value="history" />
                </el-select>
              </div>
              
              <el-table
                :data="filteredVersions"
                highlight-current-row
                @current-change="handleVersionSelect"
                @row-click="handleRowClick"
                height="450"
                :row-class-name="getRowClassName"
              >
                <el-table-column prop="version" label="版本" width="80" />
                <el-table-column prop="date" label="日期" width="100" />
                <el-table-column prop="author" label="作者" width="80" />
                <el-table-column prop="description" label="描述" show-overflow-tooltip />
                <el-table-column label="状态" width="80">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === 'current' ? 'success' : 'info'" size="small">
                      {{ scope.row.status === 'current' ? '当前' : '历史' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="180">
                  <template #default="scope">
                    <el-button-group>
                      <el-button size="small" @click.stop="viewVersion(scope.row)" :icon="View">查看</el-button>
                      <el-button size="small" @click.stop="compareWithCurrent(scope.row)" :icon="Scale" :disabled="compareMode">对比</el-button>
                      <el-button size="small" @click.stop="restoreVersion(scope.row)" :icon="RefreshLeft" type="warning">恢复</el-button>
                      <el-button size="small" @click.stop="deleteVersion(scope.row)" :icon="Delete" type="danger">删除</el-button>
                    </el-button-group>
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
                    <el-button-group v-if="selectedVersion">
                      <el-button @click="viewVersion" :icon="View">查看</el-button>
                      <el-button @click="editVersion" :icon="Edit">编辑</el-button>
                      <el-button @click="downloadVersion" :icon="Download">下载</el-button>
                      <el-button @click="restoreVersion" :icon="RefreshLeft" type="warning">恢复</el-button>
                      <el-button @click="createBranch" :icon="Share">创建分支</el-button>
                    </el-button-group>
                  </div>
                </div>
              </template>
              
              <div v-if="selectedVersion" class="version-detail">
                <el-descriptions :column="3" border>
                  <el-descriptions-item label="版本号">{{ selectedVersion.version }}</el-descriptions-item>
                  <el-descriptions-item label="创建日期">{{ selectedVersion.date }}</el-descriptions-item>
                  <el-descriptions-item label="作者">{{ selectedVersion.author }}</el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="selectedVersion.status === 'current' ? 'success' : 'info'">
                      {{ selectedVersion.status === 'current' ? '当前版本' : '历史版本' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="分支">{{ selectedVersion.branch || '主分支' }}</el-descriptions-item>
                  <el-descriptions-item label="标签">
                    <el-tag v-for="tag in selectedVersion.tags" :key="tag" size="small" style="margin-right: 5px;">
                      {{ tag }}
                    </el-tag>
                    <el-button v-if="!selectedVersion.tags || selectedVersion.tags.length === 0" @click="addTag" size="small" :icon="Plus">添加标签</el-button>
                  </el-descriptions-item>
                  <el-descriptions-item label="变更摘要" :span="3">{{ selectedVersion.description }}</el-descriptions-item>
                </el-descriptions>
                
                <el-divider />
                
                <el-tabs v-model="activeTab">
                  <el-tab-pane label="变更记录" name="changes">
                    <el-table :data="selectedVersion.changes" style="width: 100%">
                      <el-table-column prop="section" label="章节" width="200" />
                      <el-table-column prop="type" label="变更类型" width="100">
                        <template #default="scope">
                          <el-tag :type="getChangeTypeTag(scope.row.type)" size="small">
                            {{ scope.row.type }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="description" label="变更描述" />
                      <el-table-column label="操作" width="100">
                        <template #default="scope">
                          <el-button size="small" @click="viewChangeDetail(scope.row)" :icon="View">详情</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </el-tab-pane>
                  
                  <el-tab-pane label="文档内容" name="content">
                    <div class="content-toolbar">
                      <el-button-group>
                        <el-button @click="toggleViewMode('text')" :type="viewMode === 'text' ? 'primary' : ''" size="small">文本</el-button>
                        <el-button @click="toggleViewMode('markdown')" :type="viewMode === 'markdown' ? 'primary' : ''" size="small">Markdown</el-button>
                        <el-button @click="toggleViewMode('preview')" :type="viewMode === 'preview' ? 'primary' : ''" size="small">预览</el-button>
                      </el-button-group>
                      <div class="toolbar-actions">
                        <el-button @click="copyContent" :icon="DocumentCopy" size="small">复制</el-button>
                        <el-button @click="printContent" :icon="Printer" size="small">打印</el-button>
                        <el-button @click="fullscreenContent" :icon="FullScreen" size="small">全屏</el-button>
                      </div>
                    </div>
                    
                    <div class="content-preview">
                      <el-input
                        v-if="viewMode === 'text'"
                        v-model="selectedVersion.content"
                        type="textarea"
                        :rows="20"
                        readonly
                      />
                      <div v-else-if="viewMode === 'markdown'" class="markdown-editor">
                        <el-input
                          v-model="selectedVersion.content"
                          type="textarea"
                          :rows="20"
                          readonly
                        />
                      </div>
                      <div v-else-if="viewMode === 'preview'" class="content-preview-html" v-html="renderedContent"></div>
                    </div>
                  </el-tab-pane>
                  
                  <el-tab-pane label="文件变更" name="files">
                    <el-table :data="selectedVersion.fileChanges || []" style="width: 100%">
                      <el-table-column prop="path" label="文件路径" />
                      <el-table-column prop="type" label="变更类型" width="100">
                        <template #default="scope">
                          <el-tag :type="getFileChangeTypeTag(scope.row.type)" size="small">
                            {{ scope.row.type }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="additions" label="新增行" width="80" />
                      <el-table-column prop="deletions" label="删除行" width="80" />
                      <el-table-column label="操作" width="120">
                        <template #default="scope">
                          <el-button size="small" @click="viewFileDiff(scope.row)" :icon="Scale">对比</el-button>
                          <el-button size="small" @click="downloadFile(scope.row)" :icon="Download">下载</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </el-tab-pane>
                  
                  <el-tab-pane label="提交信息" name="commit">
                    <div class="commit-info">
                      <el-descriptions :column="2" border>
                        <el-descriptions-item label="提交ID">{{ selectedVersion.commitId || 'N/A' }}</el-descriptions-item>
                        <el-descriptions-item label="父提交">{{ selectedVersion.parentCommit || 'N/A' }}</el-descriptions-item>
                        <el-descriptions-item label="提交时间">{{ selectedVersion.commitTime || selectedVersion.date }}</el-descriptions-item>
                        <el-descriptions-item label="提交者">{{ selectedVersion.committer || selectedVersion.author }}</el-descriptions-item>
                      </el-descriptions>
                      
                      <div class="commit-message">
                        <h4>提交信息</h4>
                        <pre>{{ selectedVersion.commitMessage || selectedVersion.description }}</pre>
                      </div>
                    </div>
                  </el-tab-pane>
                </el-tabs>
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
      <el-form :model="newVersion" label-width="100px">
        <el-form-item label="版本号">
          <el-input v-model="newVersion.version" placeholder="例如: v1.2.0" />
        </el-form-item>
        <el-form-item label="分支">
          <el-select v-model="newVersion.branch" placeholder="选择分支" style="width: 100%">
            <el-option label="主分支" value="main" />
            <el-option label="开发分支" value="develop" />
            <el-option label="功能分支" value="feature" />
            <el-option label="修复分支" value="hotfix" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="newVersion.tags" multiple placeholder="选择标签" style="width: 100%">
            <el-option label="稳定版" value="stable" />
            <el-option label="测试版" value="beta" />
            <el-option label="预发布版" value="rc" />
            <el-option label="重要更新" value="major" />
            <el-option label="小更新" value="minor" />
            <el-option label="补丁" value="patch" />
          </el-select>
        </el-form-item>
        <el-form-item label="变更描述">
          <el-input
            v-model="newVersion.description"
            type="textarea"
            :rows="4"
            placeholder="请描述此版本的主要变更..."
          />
        </el-form-item>
        <el-form-item label="提交信息">
          <el-input
            v-model="newVersion.commitMessage"
            type="textarea"
            :rows="3"
            placeholder="详细的提交信息..."
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
    <el-dialog v-model="compareVisible" title="版本对比" width="90%" top="5vh">
      <div class="compare-toolbar">
        <div class="compare-info">
          <span>对比版本: {{ compareVersion.version }}</span>
          <el-divider direction="vertical" />
          <span>当前版本: {{ currentVersion.version }}</span>
        </div>
        <div class="compare-actions">
          <el-button @click="toggleDiffView('side-by-side')" :type="diffView === 'side-by-side' ? 'primary' : ''" size="small">并排对比</el-button>
          <el-button @click="toggleDiffView('unified')" :type="diffView === 'unified' ? 'primary' : ''" size="small">统一对比</el-button>
          <el-button @click="exportDiff" :icon="Download" size="small">导出差异</el-button>
        </div>
      </div>
      
      <div class="compare-container">
        <div v-if="diffView === 'side-by-side'" class="side-by-side-diff">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="diff-header">
                <h3>{{ compareVersion.version }}</h3>
                <el-tag type="info">{{ compareVersion.date }}</el-tag>
              </div>
              <div class="diff-content">
                <el-input
                  v-model="compareVersion.content"
                  type="textarea"
                  :rows="25"
                  readonly
                />
              </div>
            </el-col>
            <el-col :span="12">
              <div class="diff-header">
                <h3>{{ currentVersion.version }}</h3>
                <el-tag type="success">当前版本</el-tag>
              </div>
              <div class="diff-content">
                <el-input
                  v-model="currentVersion.content"
                  type="textarea"
                  :rows="25"
                  readonly
                />
              </div>
            </el-col>
          </el-row>
        </div>
        
        <div v-else-if="diffView === 'unified'" class="unified-diff">
          <div class="diff-content">
            <pre class="diff-text">{{ diffContent }}</pre>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 版本回滚确认对话框 -->
    <el-dialog v-model="restoreVisible" title="版本回滚" width="50%">
      <div class="restore-info">
        <el-alert
          title="警告"
          type="warning"
          description="版本回滚将替换当前版本内容，此操作不可恢复。建议在回滚前先创建当前版本的备份。"
          show-icon
          :closable="false"
        />
        
        <el-descriptions :column="2" border style="margin-top: 20px;">
          <el-descriptions-item label="当前版本">{{ currentVersion.version }}</el-descriptions-item>
          <el-descriptions-item label="目标版本">{{ restoreTargetVersion.version }}</el-descriptions-item>
          <el-descriptions-item label="回滚原因" :span="2">
            <el-input
              v-model="restoreReason"
              type="textarea"
              :rows="3"
              placeholder="请输入回滚原因..."
            />
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="restoreVisible = false">取消</el-button>
          <el-button type="warning" @click="confirmRestore">确认回滚</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 创建分支对话框 -->
    <el-dialog v-model="createBranchVisible" title="创建分支" width="40%">
      <el-form :model="newBranch" label-width="80px">
        <el-form-item label="分支名">
          <el-input v-model="newBranch.name" placeholder="例如: feature/new-function" />
        </el-form-item>
        <el-form-item label="基于版本">
          <el-input v-model="selectedVersion.version" readonly />
        </el-form-item>
        <el-form-item label="分支描述">
          <el-input
            v-model="newBranch.description"
            type="textarea"
            :rows="3"
            placeholder="请描述此分支的用途..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createBranchVisible = false">取消</el-button>
          <el-button type="primary" @click="saveNewBranch">创建</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, Plus, Download, Refresh, Search, Scale, View, Edit, 
  RefreshLeft, Delete, Share, DocumentCopy, Printer, FullScreen 
} from '@element-plus/icons-vue'

// 响应式数据
const selectedDoc = ref('1')
const selectedVersion = ref(null)
const compareVersion = ref(null)
const currentVersion = ref(null)
const createVersionVisible = ref(false)
const compareVisible = ref(false)
const restoreVisible = ref(false)
const createBranchVisible = ref(false)
const restoreTargetVersion = ref(null)
const restoreReason = ref('')
const searchText = ref('')
const filterType = ref('')
const compareMode = ref(false)
const activeTab = ref('changes')
const viewMode = ref('text')
const diffView = ref('side-by-side')

// 文档数据
const documents = ref([
  { id: '1', name: '需求文档' },
  { id: '2', name: '数据库设计文档' },
  { id: '3', name: 'API接口文档' },
  { id: '4', name: '系统设计文档' }
])

// 版本数据
const versions = ref([
  {
    id: '1',
    version: 'v1.2.0',
    date: '2023-12-01',
    author: '张三',
    status: 'current',
    branch: 'main',
    tags: ['stable', 'major'],
    description: '添加了支付流程优化功能需求',
    content: '# 需求文档 v1.2.0\n\n## 1. 项目概述\n\n本项目是一个记账系统，旨在帮助用户轻松管理个人财务。\n\n## 2. 功能需求\n\n### 2.1 用户管理\n- 用户注册\n- 用户登录\n- 个人信息管理\n\n### 2.2 记账功能\n- 收入记录\n- 支出记录\n- 分类管理\n\n### 2.3 支付流程\n- 扫码支付\n- 在线支付\n- 支付记录',
    commitId: 'a1b2c3d4',
    parentCommit: '',
    commitTime: '2023-12-01 14:30:00',
    committer: '张三',
    commitMessage: '添加支付流程优化功能需求',
    changes: [
      { section: '支付流程', type: '新增', description: '添加扫码支付功能需求' },
      { section: '用户管理', type: '修改', description: '更新用户角色权限说明' },
      { section: '数据统计', type: '新增', description: '添加费用统计图表需求' }
    ],
    fileChanges: [
      { path: 'docs/requirements.md', type: '修改', additions: 45, deletions: 10 },
      { path: 'docs/payment-flow.md', type: '新增', additions: 85, deletions: 0 }
    ]
  },
  {
    id: '2',
    version: 'v1.1.0',
    date: '2023-11-15',
    author: '李四',
    status: 'history',
    branch: 'feature',
    tags: ['minor'],
    description: '完善了审核与争议处理流程',
    content: '# 需求文档 v1.1.0\n\n## 1. 项目概述\n\n本项目是一个记账系统，旨在帮助用户轻松管理个人财务。\n\n## 2. 功能需求\n\n### 2.1 用户管理\n- 用户注册\n- 用户登录\n- 个人信息管理\n\n### 2.2 记账功能\n- 收入记录\n- 支出记录\n- 分类管理\n\n### 2.3 审核流程\n- 审核流程定义\n- 审核权限管理\n\n### 2.4 争议处理\n- 争议处理机制\n- 争议记录管理',
    commitId: 'e5f6g7h8',
    parentCommit: 'a1b2c3d4',
    commitTime: '2023-11-15 10:15:00',
    committer: '李四',
    commitMessage: '完善审核与争议处理流程',
    changes: [
      { section: '审核流程', type: '新增', description: '添加审核流程定义' },
      { section: '争议处理', type: '新增', description: '添加争议处理机制' },
      { section: '系统管理', type: '修改', description: '更新系统管理员权限说明' }
    ],
    fileChanges: [
      { path: 'docs/requirements.md', type: '修改', additions: 30, deletions: 5 },
      { path: 'docs/review-process.md', type: '新增', additions: 95, deletions: 0 },
      { path: 'docs/dispute-handling.md', type: '新增', additions: 60, deletions: 0 }
    ]
  },
  {
    id: '3',
    version: 'v1.0.0',
    date: '2023-10-20',
    author: '王五',
    status: 'history',
    branch: 'main',
    tags: ['stable'],
    description: '初始版本，包含基础功能需求',
    content: '# 需求文档 v1.0.0\n\n## 1. 项目概述\n\n本项目是一个记账系统，旨在帮助用户轻松管理个人财务。\n\n## 2. 功能需求\n\n### 2.1 用户管理\n- 用户注册\n- 用户登录\n- 个人信息管理\n\n### 2.2 记账功能\n- 收入记录\n- 支出记录\n- 分类管理\n\n### 2.3 寝室管理\n- 寝室创建\n- 寝室成员管理\n\n### 2.4 费用管理\n- 费用记录\n- 费用分摊',
    commitId: 'i9j0k1l2',
    parentCommit: '',
    commitTime: '2023-10-20 16:45:00',
    committer: '王五',
    commitMessage: '初始版本，包含基础功能需求',
    changes: [
      { section: '用户管理', type: '新增', description: '添加用户注册登录功能' },
      { section: '寝室管理', type: '新增', description: '添加寝室创建管理功能' },
      { section: '费用管理', type: '新增', description: '添加费用记录分摊功能' }
    ],
    fileChanges: [
      { path: 'docs/requirements.md', type: '新增', additions: 120, deletions: 0 },
      { path: 'docs/user-stories.md', type: '新增', additions: 85, deletions: 0 }
    ]
  }
])

// 新版本表单
const newVersion = ref({
  version: '',
  description: '',
  branch: 'main',
  tags: [],
  commitMessage: ''
})

// 新分支表单
const newBranch = ref({
  name: '',
  description: ''
})

// 计算属性
const filteredVersions = computed(() => {
  let result = versions.value
  
  // 按状态筛选
  if (filterType.value) {
    result = result.filter(v => v.status === filterType.value)
  }
  
  // 按搜索文本筛选
  if (searchText.value) {
    const text = searchText.value.toLowerCase()
    result = result.filter(v => 
      v.version.toLowerCase().includes(text) ||
      v.author.toLowerCase().includes(text) ||
      v.description.toLowerCase().includes(text)
    )
  }
  
  return result
})

const renderedContent = computed(() => {
  if (!selectedVersion.value) return ''
  
  // 简单的Markdown渲染
  return selectedVersion.value.content
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
})

const diffContent = computed(() => {
  // 简单的diff生成
  if (!compareVersion.value || !currentVersion.value) return ''
  
  const currentLines = currentVersion.value.content.split('\n')
  const compareLines = compareVersion.value.content.split('\n')
  
  let diff = ''
  let i = 0, j = 0
  
  while (i < currentLines.length || j < compareLines.length) {
    if (i < currentLines.length && (j >= compareLines.length || currentLines[i] !== compareLines[j])) {
      diff += `- ${currentLines[i]}\n`
      i++
    } else if (j < compareLines.length && (i >= currentLines.length || currentLines[i] !== compareLines[j])) {
      diff += `+ ${compareLines[j]}\n`
      j++
    } else {
      diff += `  ${currentLines[i]}\n`
      i++
      j++
    }
  }
  
  return diff
})

// 方法
const goBack = () => {
  window.history.back()
}

const refreshData = () => {
  ElMessage.success('数据已刷新')
}

const handleVersionSelect = (version) => {
  selectedVersion.value = version
  if (!currentVersion.value || version.status === 'current') {
    currentVersion.value = version
  }
}

const handleRowClick = (row) => {
  if (compareMode.value) {
    if (!compareVersion.value) {
      compareVersion.value = row
      ElMessage.info(`已选择对比版本: ${row.version}`)
    } else {
      compareWithCurrent(row)
    }
  }
}

const getRowClassName = ({ row }) => {
  if (compareMode.value && compareVersion.value && row.id === compareVersion.value.id) {
    return 'compare-selected-row'
  }
  return ''
}

const toggleCompareMode = () => {
  compareMode.value = !compareMode.value
  if (!compareMode.value) {
    compareVersion.value = null
  }
}

const viewVersion = (version) => {
  if (version) {
    selectedVersion.value = version
  }
  activeTab.value = 'content'
  viewMode.value = 'text'
}

const editVersion = () => {
  ElMessage.info('编辑功能开发中')
}

const downloadVersion = () => {
  if (!selectedVersion.value) return
  
  const content = selectedVersion.value.content
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${selectedVersion.value.version}.md`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('版本文件已下载')
}

const restoreVersion = (version) => {
  if (version) {
    restoreTargetVersion.value = version
  } else {
    restoreTargetVersion.value = selectedVersion.value
  }
  
  if (!restoreTargetVersion.value) {
    ElMessage.warning('请先选择要恢复的版本')
    return
  }
  
  restoreVisible.value = true
}

const confirmRestore = () => {
  if (!restoreReason.value.trim()) {
    ElMessage.warning('请输入回滚原因')
    return
  }
  
  const currentIndex = versions.value.findIndex(v => v.status === 'current')
  if (currentIndex !== -1) {
    versions.value[currentIndex].status = 'history'
  }
  
  const targetIndex = versions.value.findIndex(v => v.id === restoreTargetVersion.value.id)
  if (targetIndex !== -1) {
    const newVersion = {
      id: Date.now().toString(),
      version: `v${(parseFloat(restoreTargetVersion.value.version.substring(1)) + 0.1).toFixed(1)}-rollback`,
      date: new Date().toISOString().split('T')[0],
      author: '当前用户',
      status: 'current',
      branch: restoreTargetVersion.value.branch,
      tags: ['rollback'],
      description: `回滚到版本 ${restoreTargetVersion.value.version} - ${restoreReason.value}`,
      content: restoreTargetVersion.value.content,
      commitId: `rollback-${Date.now()}`,
      parentCommit: restoreTargetVersion.value.commitId,
      commitTime: new Date().toISOString(),
      committer: '当前用户',
      commitMessage: `Rollback to ${restoreTargetVersion.value.version}: ${restoreReason.value}`,
      changes: [
        { section: '全部', type: '回滚', description: `回滚到版本 ${restoreTargetVersion.value.version}` }
      ],
      fileChanges: restoreTargetVersion.value.fileChanges
    }
    
    versions.value.unshift(newVersion)
    currentVersion.value = newVersion
    selectedVersion.value = newVersion
  }
  
  restoreVisible.value = false
  restoreReason.value = ''
  ElMessage.success('版本回滚成功')
}

const createBranch = () => {
  if (!selectedVersion.value) {
    ElMessage.warning('请先选择一个版本')
    return
  }
  
  createBranchVisible.value = true
}

const saveNewBranch = () => {
  if (!newBranch.value.name.trim()) {
    ElMessage.warning('请输入分支名称')
    return
  }
  
  ElMessage.success(`分支 ${newBranch.value.name} 创建成功`)
  createBranchVisible.value = false
  newBranch.value = { name: '', description: '' }
}

const deleteVersion = (version) => {
  if (version.status === 'current') {
    ElMessage.warning('不能删除当前版本')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除版本 ${version.version} 吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = versions.value.findIndex(v => v.id === version.id)
    if (index !== -1) {
      versions.value.splice(index, 1)
      ElMessage.success('版本已删除')
    }
  }).catch(() => {
    // 用户取消删除
  })
}

const compareWithCurrent = (version) => {
  if (!version) {
    version = selectedVersion.value
  }
  
  if (!version) {
    ElMessage.warning('请先选择要对比的版本')
    return
  }
  
  compareVersion.value = version
  compareVisible.value = true
}

const toggleDiffView = (view) => {
  diffView.value = view
}

const exportDiff = () => {
  const content = diffContent.value
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `diff-${compareVersion.value.version}-vs-${currentVersion.value.version}.diff`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('差异文件已导出')
}

const createVersion = () => {
  newVersion.value = {
    version: '',
    description: '',
    branch: 'main',
    tags: [],
    commitMessage: ''
  }
  createVersionVisible.value = true
}

const saveNewVersion = () => {
  if (!newVersion.value.version.trim()) {
    ElMessage.warning('请输入版本号')
    return
  }
  
  if (!newVersion.value.description.trim()) {
    ElMessage.warning('请输入变更描述')
    return
  }
  
  const version = {
    id: Date.now().toString(),
    version: newVersion.value.version,
    date: new Date().toISOString().split('T')[0],
    author: '当前用户',
    status: 'history',
    branch: newVersion.value.branch,
    tags: newVersion.value.tags,
    description: newVersion.value.description,
    content: selectedVersion.value ? selectedVersion.value.content : '',
    commitId: `commit-${Date.now()}`,
    parentCommit: currentVersion.value ? currentVersion.value.commitId : '',
    commitTime: new Date().toISOString(),
    committer: '当前用户',
    commitMessage: newVersion.value.commitMessage || newVersion.value.description,
    changes: [],
    fileChanges: []
  }
  
  versions.value.unshift(version)
  createVersionVisible.value = false
  ElMessage.success('新版本创建成功')
}

const exportHistory = () => {
  const history = versions.value.map(v => ({
    version: v.version,
    date: v.date,
    author: v.author,
    description: v.description,
    status: v.status
  }))
  
  const content = JSON.stringify(history, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'version-history.json'
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('版本历史已导出')
}

const getChangeTypeTag = (type) => {
  const typeMap = {
    '新增': 'success',
    '修改': 'warning',
    '删除': 'danger',
    '回滚': 'info'
  }
  return typeMap[type] || ''
}

const getFileChangeTypeTag = (type) => {
  const typeMap = {
    '新增': 'success',
    '修改': 'warning',
    '删除': 'danger',
    '重命名': 'info'
  }
  return typeMap[type] || ''
}

const viewChangeDetail = (change) => {
  ElMessage.info(`查看变更详情: ${change.section} - ${change.type}`)
}

const viewFileDiff = (fileChange) => {
  ElMessage.info(`查看文件差异: ${fileChange.path}`)
}

const downloadFile = (fileChange) => {
  ElMessage.info(`下载文件: ${fileChange.path}`)
}

const addTag = () => {
  ElMessage.info('添加标签功能开发中')
}

const toggleViewMode = (mode) => {
  viewMode.value = mode
}

const copyContent = () => {
  if (!selectedVersion.value) return
  
  navigator.clipboard.writeText(selectedVersion.value.content).then(() => {
    ElMessage.success('内容已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const printContent = () => {
  if (!selectedVersion.value) return
  
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>${selectedVersion.value.version} - 文档内容</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2, h3 { color: #333; }
          pre { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${selectedVersion.value.version}</h1>
        <p>作者: ${selectedVersion.value.author} | 日期: ${selectedVersion.value.date}</p>
        <hr>
        <pre>${selectedVersion.value.content}</pre>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

const fullscreenContent = () => {
  ElMessage.info('全屏查看功能开发中')
}

// 生命周期
const route = useRoute()

onMounted(() => {
  currentVersion.value = versions.value.find(v => v.status === 'current')
  
  // 检查是否来自DocsManagement页面的查看全部按钮
  if (route.query.filter === 'recent-updates') {
    // 如果是查看最近更新，可以在这里添加特定逻辑
    ElMessage.success('显示所有最近更新的文档版本')
  }
})
</script>

<style scoped>
.version-control {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
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

.header-actions {
  display: flex;
  gap: 10px;
}

.back-button {
  transition: all 0.3s;
}

.back-button:hover {
  transform: scale(1.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-controls {
  margin-bottom: 15px;
}

.version-list-card {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.version-detail-card {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.version-detail {
  height: calc(100% - 60px);
  overflow-y: auto;
  flex: 1;
}

.content-preview {
  margin-top: 15px;
}

.content-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.markdown-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.content-preview-html {
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  min-height: 400px;
  background-color: #fff;
  line-height: 1.8;
}

.commit-info {
  padding: 20px;
}

.commit-message {
  margin-top: 20px;
}

.commit-message h4 {
  margin-bottom: 10px;
  color: #303133;
}

.commit-message pre {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  white-space: pre-wrap;
  font-family: monospace;
  line-height: 1.6;
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

.compare-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #ebeef5;
  background-color: #f9f9f9;
}

.compare-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compare-actions {
  display: flex;
  gap: 8px;
}

.side-by-side-diff {
  height: calc(100% - 60px);
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.diff-header h3 {
  margin: 0;
  color: #303133;
}

.diff-content {
  padding: 15px;
}

.unified-diff {
  height: calc(100% - 60px);
}

.diff-text {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
}

.restore-info {
  padding: 20px;
}

.compare-selected-row {
  background-color: #ecf5ff !important;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .version-list-card,
  .version-detail-card {
    height: auto;
    min-height: 500px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    padding: 15px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .compare-toolbar {
    flex-direction: column;
    gap: 10px;
  }
  
  .side-by-side-diff .el-row {
    flex-direction: column;
  }
}

/* 动画效果 */
.el-table__row {
  transition: background-color 0.3s;
}

.el-button {
  transition: all 0.3s;
}

.el-button:hover {
  transform: translateY(-1px);
}

/* 自定义滚动条 */
.version-detail::-webkit-scrollbar,
.content-preview-html::-webkit-scrollbar,
.diff-text::-webkit-scrollbar {
  width: 6px;
}

.version-detail::-webkit-scrollbar-track,
.content-preview-html::-webkit-scrollbar-track,
.diff-text::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.version-detail::-webkit-scrollbar-thumb,
.content-preview-html::-webkit-scrollbar-thumb,
.diff-text::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.version-detail::-webkit-scrollbar-thumb:hover,
.content-preview-html::-webkit-scrollbar-thumb:hover,
.diff-text::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>