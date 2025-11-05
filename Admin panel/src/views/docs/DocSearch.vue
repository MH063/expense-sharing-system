<template>
  <div class="doc-search">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>{{ pageTitle }}</h1>
          <p>快速搜索和浏览所有项目文档</p>
        </div>
      </el-header>
      
      <el-main>
        <!-- 搜索区域 -->
        <el-card class="search-card">
          <el-form :model="searchForm" inline>
            <el-form-item label="关键词">
              <el-input
                v-model="searchForm.keyword"
                placeholder="请输入搜索关键词"
                style="width: 300px"
                clearable
                @keyup.enter="handleSearch"
              >
                <template #append>
                  <el-button icon="Search" @click="handleSearch" />
                </template>
              </el-input>
            </el-form-item>
            
            <el-form-item label="文档类型">
              <el-select v-model="searchForm.docType" placeholder="选择文档类型" clearable style="width: 150px">
                <el-option label="需求文档" value="requirements" />
                <el-option label="数据库设计" value="database" />
                <el-option label="API接口" value="api" />
                <el-option label="系统设计" value="system" />
                <el-option label="用户手册" value="manual" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="更新时间">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 240px"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
          
          <!-- 高级搜索选项 -->
          <el-collapse v-model="advancedSearchVisible">
            <el-collapse-item name="advanced">
              <template #title>
                <span>高级搜索</span>
              </template>
              <el-form :model="searchForm" inline>
                <el-form-item label="作者">
                  <el-select v-model="searchForm.author" placeholder="选择作者" clearable style="width: 150px">
                    <el-option label="张三" value="张三" />
                    <el-option label="李四" value="李四" />
                    <el-option label="王五" value="王五" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="版本">
                  <el-input v-model="searchForm.version" placeholder="例如: v1.2" style="width: 120px" />
                </el-form-item>
                
                <el-form-item label="状态">
                  <el-select v-model="searchForm.status" placeholder="选择状态" clearable style="width: 120px">
                    <el-option label="草稿" value="draft" />
                    <el-option label="审核中" value="reviewing" />
                    <el-option label="已发布" value="published" />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-collapse-item>
          </el-collapse>
        </el-card>
        
        <!-- 搜索结果 -->
        <el-card class="results-card" v-if="searchResults.length > 0">
          <template #header>
            <div class="results-header">
              <span>搜索结果 ({{ searchResults.length }})</span>
              <div class="results-actions">
                <el-button size="small" @click="exportResults">导出结果</el-button>
              </div>
            </div>
          </template>
          
          <el-table :data="searchResults" style="width: 100%">
            <el-table-column label="文档名称" width="250">
              <template #default="scope">
                <div class="doc-name">
                  <el-link type="primary" @click="viewDocument(scope.row)">
                    {{ scope.row.name }}
                  </el-link>
                  <div class="doc-meta">
                    <el-tag size="small" :type="getDocTypeTag(scope.row.type)">
                      {{ getDocTypeName(scope.row.type) }}
                    </el-tag>
                    <span class="doc-version">{{ scope.row.version }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="author" label="作者" width="100" />
            
            <el-table-column prop="updateTime" label="更新时间" width="120" />
            
            <el-table-column label="匹配内容">
              <template #default="scope">
                <div class="matched-content" v-html="scope.row.matchedContent"></div>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button size="small" @click="viewDocument(scope.row)">查看</el-button>
                <el-button size="small" @click="downloadDocument(scope.row)">下载</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="pagination.currentPage"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="pagination.total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
        
        <!-- 无搜索结果 -->
        <el-card class="no-results-card" v-else-if="hasSearched">
          <el-empty description="未找到匹配的文档，请尝试调整搜索条件" />
        </el-card>
        
        <!-- 热门文档推荐 -->
        <el-card class="popular-docs-card" v-if="!hasSearched">
          <template #header>
            <span>热门文档</span>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="6" v-for="doc in popularDocs" :key="doc.id">
              <el-card class="popular-doc-card" shadow="hover" @click="viewDocument(doc)">
                <div class="doc-icon">
                  <el-icon :size="40" :color="getDocTypeColor(doc.type)">
                    <component :is="getDocTypeIcon(doc.type)" />
                  </el-icon>
                </div>
                <div class="doc-info">
                  <h4>{{ doc.name }}</h4>
                  <p>{{ doc.description }}</p>
                  <div class="doc-meta">
                    <span>{{ doc.author }}</span>
                    <span>{{ doc.updateTime }}</span>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Document, Files, DataAnalysis, Setting, User } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// 搜索表单
const searchForm = ref({
  keyword: '',
  docType: '',
  dateRange: [],
  author: '',
  version: '',
  status: ''
})

// 高级搜索展开状态
const advancedSearchVisible = ref([])

// 是否已搜索
const hasSearched = ref(false)

// 搜索结果
const searchResults = ref([])

// 分页
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 页面标题
const pageTitle = ref('文档搜索与浏览')

// 热门文档
const popularDocs = ref([
  {
    id: '1',
    name: '需求文档',
    type: 'requirements',
    description: '系统功能需求和业务流程说明',
    author: '张三',
    updateTime: '2023-12-01',
    version: 'v1.2.0'
  },
  {
    id: '2',
    name: '数据库设计文档',
    type: 'database',
    description: '数据库表结构和关系设计',
    author: '李四',
    updateTime: '2023-11-28',
    version: 'v1.1.0'
  },
  {
    id: '3',
    name: 'API接口文档',
    type: 'api',
    description: '系统API接口详细说明',
    author: '王五',
    updateTime: '2023-11-25',
    version: 'v1.0.5'
  },
  {
    id: '4',
    name: '系统设计文档',
    type: 'system',
    description: '系统架构和模块设计说明',
    author: '赵六',
    updateTime: '2023-11-20',
    version: 'v1.0.2'
  }
])

// 处理搜索
const handleSearch = () => {
  if (!searchForm.value.keyword && !searchForm.value.docType && !searchForm.value.dateRange.length) {
    ElMessage.warning('请至少输入一个搜索条件')
    return
  }
  
  hasSearched.value = true
  
  // 实际项目中应该调用API进行搜索
  // 这里模拟搜索结果
  searchResults.value = [
    {
      id: '1',
      name: '需求文档',
      type: 'requirements',
      author: '张三',
      updateTime: '2023-12-01',
      version: 'v1.2.0',
      matchedContent: '...<mark>支付流程</mark>优化功能需求...'
    },
    {
      id: '2',
      name: 'API接口文档',
      type: 'api',
      author: '王五',
      updateTime: '2023-11-25',
      version: 'v1.0.5',
      matchedContent: '...<mark>支付接口</mark> /api/payment/create...'
    },
    {
      id: '3',
      name: '系统设计文档',
      type: 'system',
      author: '赵六',
      updateTime: '2023-11-20',
      version: 'v1.0.2',
      matchedContent: '...<mark>支付模块</mark>设计说明...'
    }
  ]
  
  pagination.value.total = searchResults.value.length
  ElMessage.success(`找到 ${searchResults.value.length} 个匹配结果`)
}

// 重置搜索
const resetSearch = () => {
  searchForm.value = {
    keyword: '',
    docType: '',
    dateRange: [],
    author: '',
    version: '',
    status: ''
  }
  hasSearched.value = false
  searchResults.value = []
}

// 查看文档
const viewDocument = (doc) => {
  // 根据文档类型跳转到相应的页面
  let route = ''
  
  switch (doc.type) {
    case 'requirements':
      route = '/docs/requirements'
      break
    case 'database':
      route = '/docs/database'
      break
    case 'api':
      route = '/docs/api'
      break
    case 'system':
      route = '/docs/system'
      break
    default:
      route = '/docs'
  }
  
  router.push(route)
}

// 下载文档
const downloadDocument = (doc) => {
  // 实际项目中应该调用API下载文档
  ElMessage.success(`正在下载 ${doc.name}...`)
}

// 导出搜索结果
const exportResults = () => {
  // 实际项目中应该调用API导出搜索结果
  ElMessage.success('搜索结果导出中...')
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  // 重新加载数据
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.value.currentPage = page
  // 重新加载数据
}

// 获取文档类型标签样式
const getDocTypeTag = (type) => {
  const typeMap = {
    'requirements': '',
    'database': 'success',
    'api': 'warning',
    'system': 'danger',
    'manual': 'info'
  }
  return typeMap[type] || ''
}

// 获取文档类型名称
const getDocTypeName = (type) => {
  const typeMap = {
    'requirements': '需求文档',
    'database': '数据库设计',
    'api': 'API接口',
    'system': '系统设计',
    'manual': '用户手册'
  }
  return typeMap[type] || '未知'
}

// 获取文档类型图标
const getDocTypeIcon = (type) => {
  const iconMap = {
    'requirements': Document,
    'database': DataAnalysis,
    'api': Files,
    'system': Setting,
    'manual': User
  }
  return iconMap[type] || Document
}

// 获取文档类型颜色
const getDocTypeColor = (type) => {
  const colorMap = {
    'requirements': '#409EFF',
    'database': '#67C23A',
    'api': '#E6A23C',
    'system': '#F56C6C',
    'manual': '#909399'
  }
  return colorMap[type] || '#409EFF'
}

// 组件挂载时加载数据
onMounted(() => {
  // 检查是否有从其他页面传递的参数
  const { filter, title } = route.query
  
  if (filter) {
    // 根据筛选类型设置页面标题和执行相应搜索
    if (title) {
      pageTitle.value = title
    }
    
    // 根据筛选类型执行相应的搜索
    switch (filter) {
      case 'recent':
        searchRecentDocuments()
        break
      case 'popular':
        searchPopularDocuments()
        break
      default:
        break
    }
  }
  
  console.log('文档搜索与浏览页面已加载')
})

// 搜索最近编辑的文档
const searchRecentDocuments = () => {
  hasSearched.value = true
  
  // 模拟最近编辑的文档数据
  searchResults.value = [
    {
      id: '1',
      name: '需求文档 - 11.3 管理端需求',
      type: 'requirements',
      author: '张三',
      updateTime: '2023-12-01 14:30',
      version: 'v1.2.1',
      matchedContent: '添加了文档管理系统和系统管理功能的详细需求说明'
    },
    {
      id: '2',
      name: '数据库设计文档 - 用户表结构',
      type: 'database',
      author: '李四',
      updateTime: '2023-11-28 10:15',
      version: 'v1.1.2',
      matchedContent: '更新了用户表的角色字段，添加了系统管理员角色'
    },
    {
      id: '3',
      name: '需求文档 - 4.3.1 收款码管理功能',
      type: 'requirements',
      author: '王五',
      updateTime: '2023-11-25 16:45',
      version: 'v1.2.0',
      matchedContent: '完善了收款码上传与维护的功能需求'
    }
  ]
  
  pagination.value.total = searchResults.value.length
  ElMessage.success(`找到 ${searchResults.value.length} 个最近编辑的文档`)
}

// 搜索热门文档
const searchPopularDocuments = () => {
  hasSearched.value = true
  
  // 模拟热门文档数据
  searchResults.value = [
    {
      id: '1',
      name: '需求文档 - 11.3 管理端需求',
      type: 'requirements',
      author: '张三',
      updateTime: '2023-12-01 14:30',
      version: 'v1.2.1',
      matchedContent: '浏览次数: 128 | 最近浏览: 2023-12-01 15:20'
    },
    {
      id: '2',
      name: '数据库设计文档 - 用户表结构',
      type: 'database',
      author: '李四',
      updateTime: '2023-11-28 10:15',
      version: 'v1.1.2',
      matchedContent: '浏览次数: 96 | 最近浏览: 2023-12-01 12:10'
    },
    {
      id: '3',
      name: '需求文档 - 4.3.1 收款码管理功能',
      type: 'requirements',
      author: '王五',
      updateTime: '2023-11-25 16:45',
      version: 'v1.2.0',
      matchedContent: '浏览次数: 87 | 最近浏览: 2023-11-30 18:45'
    }
  ]
  
  pagination.value.total = searchResults.value.length
  ElMessage.success(`找到 ${searchResults.value.length} 个热门文档`)
}
</script>

<style scoped>
.doc-search {
  height: 100vh;
  overflow: hidden;
}

.page-header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
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

.search-card {
  margin-bottom: 20px;
}

.results-card {
  margin-bottom: 20px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-name {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.doc-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.doc-version {
  font-size: 12px;
  color: #909399;
}

.matched-content {
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.no-results-card {
  margin-bottom: 20px;
}

.popular-docs-card {
  margin-bottom: 20px;
}

.popular-doc-card {
  cursor: pointer;
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.popular-doc-card:hover {
  transform: translateY(-5px);
}

.doc-icon {
  text-align: center;
  margin-bottom: 15px;
}

.doc-info h4 {
  margin: 0 0 5px 0;
  color: #303133;
}

.doc-info p {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-info .doc-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

:deep(.el-collapse-item__header) {
  font-size: 14px;
  color: #606266;
}
</style>