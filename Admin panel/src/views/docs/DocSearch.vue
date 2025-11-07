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
import request from '@/request'

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
const popularDocs = ref([])

// 处理搜索
const handleSearch = async () => {
  if (!searchForm.value.keyword && !searchForm.value.docType && !searchForm.value.dateRange.length) {
    ElMessage.warning('请至少输入一个搜索条件')
    return
  }
  
  hasSearched.value = true
  
  try {
    // 构建搜索参数
    const params = {
      keyword: searchForm.value.keyword,
      docType: searchForm.value.docType,
      author: searchForm.value.author,
      version: searchForm.value.version,
      status: searchForm.value.status,
      page: pagination.value.currentPage,
      limit: pagination.value.pageSize
    }
    
    // 处理日期范围
    if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
      params.startDate = searchForm.value.dateRange[0]
      params.endDate = searchForm.value.dateRange[1]
    }
    
    // 调用API进行搜索
    const response = await request({
      url: '/api/docs/search',
      method: 'get',
      params
    })
    
    if (response.success) {
      searchResults.value = response.data.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        author: item.author,
        updateTime: item.updateTime,
        version: item.version,
        matchedContent: item.matchedContent
      }))
      
      pagination.value.total = response.data.pagination.totalItems
      ElMessage.success(`找到 ${searchResults.value.length} 个匹配结果`)
    } else {
      ElMessage.error(response.message || '搜索失败')
    }
  } catch (error) {
    console.error('搜索文档失败:', error)
    ElMessage.error('搜索文档失败，请重试')
  }
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
const viewDocument = async (doc) => {
  try {
    // 调用API获取文档详情
    const response = await request({
      url: `/api/docs/${doc.id}`,
      method: 'get'
    })
    
    if (response.success) {
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
    } else {
      ElMessage.error(response.message || '获取文档详情失败')
    }
  } catch (error) {
    console.error('获取文档详情失败:', error)
    ElMessage.error('获取文档详情失败，请重试')
  }
}

// 下载文档
const downloadDocument = async (doc) => {
  try {
    // 调用API下载文档
    const response = await request({
      url: `/api/docs/${doc.id}/download`,
      method: 'get',
      responseType: 'blob'
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${doc.name}.pdf`)
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('文档下载成功')
  } catch (error) {
    console.error('下载文档失败:', error)
    ElMessage.error('下载文档失败，请重试')
  }
}

// 导出搜索结果
const exportResults = async () => {
  if (searchResults.value.length === 0) {
    ElMessage.warning('没有可导出的搜索结果')
    return
  }
  
  try {
    // 构建导出参数
    const params = {
      keyword: searchForm.value.keyword,
      docType: searchForm.value.docType,
      author: searchForm.value.author,
      version: searchForm.value.version,
      status: searchForm.value.status
    }
    
    // 处理日期范围
    if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
      params.startDate = searchForm.value.dateRange[0]
      params.endDate = searchForm.value.dateRange[1]
    }
    
    // 调用API导出搜索结果
    const response = await request({
      url: '/api/docs/export',
      method: 'get',
      params,
      responseType: 'blob'
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `文档搜索结果_${new Date().toISOString().split('T')[0]}.pdf`)
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('搜索结果导出成功')
  } catch (error) {
    console.error('导出搜索结果失败:', error)
    ElMessage.error('导出搜索结果失败，请重试')
  }
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
onMounted(async () => {
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
        await searchRecentDocuments()
        break
      case 'popular':
        await searchPopularDocuments()
        break
      default:
        break
    }
  }
  
  console.log('文档搜索与浏览页面已加载')
})

// 搜索最近编辑的文档
const searchRecentDocuments = async () => {
  try {
    const response = await request({
      url: '/api/docs/recent',
      method: 'get',
      params: {
        limit: 5
      }
    })
    
    if (response.success) {
      searchResults.value = response.data.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        author: item.author,
        updateTime: item.updateTime,
        version: item.version,
        matchedContent: item.matchedContent
      }))
      
      pagination.value.total = response.data.pagination.totalItems
      hasSearched.value = true
      ElMessage.success(`找到 ${searchResults.value.length} 个最近编辑的文档`)
    } else {
      ElMessage.error(response.message || '获取最近文档失败')
    }
  } catch (error) {
    console.error('获取最近文档失败:', error)
    ElMessage.error('获取最近文档失败，请重试')
  }
}

// 搜索热门文档
const searchPopularDocuments = async () => {
  try {
    const response = await request({
      url: '/api/docs/popular',
      method: 'get',
      params: {
        limit: 5
      }
    })
    
    if (response.success) {
      searchResults.value = response.data.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        author: item.author,
        updateTime: item.updateTime,
        version: item.version,
        matchedContent: item.matchedContent
      }))
      
      pagination.value.total = response.data.pagination.totalItems
      hasSearched.value = true
      ElMessage.success(`找到 ${searchResults.value.length} 个热门文档`)
    } else {
      ElMessage.error(response.message || '获取热门文档失败')
    }
  } catch (error) {
    console.error('获取热门文档失败:', error)
    ElMessage.error('获取热门文档失败，请重试')
  }
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