<template>
  <div class="docs-management">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <div class="header-left">
            <el-button type="primary" plain @click="goBack" class="back-button">
              <el-icon><ArrowLeft /></el-icon>
              返回首页
            </el-button>
            <div class="title-section">
              <h1>文档管理系统</h1>
              <p>管理系统需求文档、数据库设计文档和版本控制</p>
            </div>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
            <el-button @click="exportSummary">
              <el-icon><Download /></el-icon>
              导出概览
            </el-button>
          </div>
        </div>
      </el-header>
      
      <el-main>
        <!-- 文档统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6" v-for="stat in documentStats" :key="stat.id">
            <el-card class="stat-card" shadow="hover">
              <div class="stat-content">
                <div class="stat-icon">
                  <el-icon :size="30" :color="stat.color"><component :is="stat.icon" /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ stat.value }}</div>
                  <div class="stat-label">{{ stat.label }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 文档类型卡片 -->
        <el-divider content-position="left">文档管理</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="8" v-for="doc in documentTypes" :key="doc.id">
            <el-card class="doc-card" shadow="hover" @click="navigateToDoc(doc.path)">
              <div class="card-content">
                <div class="doc-icon">
                  <el-icon :size="40"><component :is="doc.icon" /></el-icon>
                </div>
                <h3>{{ doc.title }}</h3>
                <p>{{ doc.description }}</p>
                <div class="doc-meta">
                  <span class="update-time">更新时间: {{ doc.updateTime }}</span>
                  <span class="version">版本: {{ doc.version }}</span>
                </div>
                <div class="doc-actions">
                  <el-button type="text" @click.stop="viewDoc(doc)">查看</el-button>
                  <el-button type="text" @click.stop="editDoc(doc)">编辑</el-button>
                  <el-button type="text" @click.stop="viewHistory(doc)">历史</el-button>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 快速访问 -->
        <el-divider content-position="left">快速访问</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="quick-access-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>最近编辑的文档</span>
                  <el-button type="text" @click="viewAllRecent">查看全部</el-button>
                </div>
              </template>
              <el-table :data="recentDocuments" style="width: 100%" @row-click="openDocument">
                <el-table-column prop="name" label="文档名称" />
                <el-table-column prop="editor" label="编辑者" width="100" />
                <el-table-column prop="editTime" label="编辑时间" width="150" />
              </el-table>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="quick-access-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>热门文档</span>
                  <el-button type="text" @click="viewAllPopular">查看全部</el-button>
                </div>
              </template>
              <el-table :data="popularDocuments" style="width: 100%" @row-click="openDocument">
                <el-table-column prop="name" label="文档名称" />
                <el-table-column prop="views" label="浏览次数" width="100" />
                <el-table-column prop="lastView" label="最近浏览" width="150" />
              </el-table>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 最近更新 -->
        <el-divider content-position="left">最近更新</el-divider>
        
        <el-card class="recent-updates-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>文档更新记录</span>
              <el-button type="text" @click="viewAllUpdates">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentUpdates" style="width: 100%" @row-click="viewUpdateDetail">
            <el-table-column prop="docName" label="文档名称" width="200" />
            <el-table-column prop="section" label="更新章节" width="250" />
            <el-table-column prop="updateTime" label="更新时间" width="180" />
            <el-table-column prop="author" label="更新人" width="120" />
            <el-table-column prop="description" label="更新说明" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="text" @click.stop="viewUpdateDetail(scope.row)">查看</el-button>
                <el-button type="text" @click.stop="revertUpdate(scope.row)">回滚</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, DataAnalysis, AlarmClock, ArrowLeft, Refresh, Download, Files, TrendCharts, User, View } from '@element-plus/icons-vue'
import request from '@/request'

const router = useRouter()

// 文档统计数据
const documentStats = ref([])

// 文档类型数据
const documentTypes = ref([])

// 最近编辑的文档
const recentDocuments = ref([])

// 热门文档
const popularDocuments = ref([])

// 最近更新数据
const recentUpdates = ref([])

// 记录文档查看
const recordDocumentView = async (doc) => {
  try {
    // 调用API记录文档查看
    const response = await request({
      url: '/api/docs/view',
      method: 'post',
      data: {
        docId: doc.id,
        docType: doc.title,
        path: doc.path
      }
    })
    
    if (response.success) {
      console.log(`文档查看记录成功: ${doc.title}`)
      
      // 更新本地数据
      updateLocalViewData(doc)
    } else {
      console.error('记录文档查看失败:', response.message)
    }
  } catch (error) {
    console.error('记录文档查看失败:', error)
  }
}

// 更新本地查看数据
const updateLocalViewData = (doc) => {
  // 更新浏览次数
  const popularDoc = popularDocuments.value.find(d => d.name.includes(doc.title))
  if (popularDoc) {
    popularDoc.views += 1
    popularDoc.lastView = new Date().toLocaleString()
  }
  
  // 添加到最近浏览
  const recentDoc = recentDocuments.value.find(d => d.name.includes(doc.title))
  if (recentDoc) {
    recentDoc.editTime = new Date().toLocaleString()
  } else {
    // 如果不在最近列表中，添加到列表开头
    recentDocuments.value.unshift({
      id: Date.now(),
      name: doc.title,
      editor: '当前用户',
      editTime: new Date().toLocaleString(),
      path: doc.path
    })
    
    // 保持列表长度不超过5个
    if (recentDocuments.value.length > 5) {
      recentDocuments.value.pop()
    }
  }
}

// 记录文档编辑
const recordDocumentEdit = async (doc) => {
  try {
    // 调用API记录文档编辑
    const response = await request({
      url: '/api/docs/edit',
      method: 'post',
      data: {
        docId: doc.id,
        docType: doc.title,
        path: doc.path
      }
    })
    
    if (response.success) {
      console.log(`文档编辑记录成功: ${doc.title}`)
      
      // 更新本地数据
      updateLocalEditData(doc)
    } else {
      console.error('记录文档编辑失败:', response.message)
    }
  } catch (error) {
    console.error('记录文档编辑失败:', error)
  }
}

// 更新本地编辑数据
const updateLocalEditData = (doc) => {
  // 添加到最近编辑
  const recentDoc = recentDocuments.value.find(d => d.name.includes(doc.title))
  if (recentDoc) {
    recentDoc.editTime = new Date().toLocaleString()
    recentDoc.editor = '当前用户'
  } else {
    // 如果不在最近列表中，添加到列表开头
    recentDocuments.value.unshift({
      id: Date.now(),
      name: doc.title,
      editor: '当前用户',
      editTime: new Date().toLocaleString(),
      path: doc.path
    })
    
    // 保持列表长度不超过5个
    if (recentDocuments.value.length > 5) {
      recentDocuments.value.pop()
    }
  }
  
  // 添加到更新记录
  recentUpdates.value.unshift({
    id: Date.now(),
    docName: doc.title,
    section: '文档编辑',
    updateTime: new Date().toLocaleString(),
    author: '当前用户',
    description: '开始编辑文档',
    version: 'v' + (parseFloat(doc.version.substring(1)) + 0.1).toFixed(1)
  })
  
  // 保持列表长度不超过5个
  if (recentUpdates.value.length > 5) {
    recentUpdates.value.pop()
  }
}

// 记录历史查看
const recordHistoryView = async (doc) => {
  try {
    // 调用API记录历史查看
    const response = await request({
      url: '/api/docs/history',
      method: 'post',
      data: {
        docId: doc.id,
        docType: doc.title,
        path: doc.path
      }
    })
    
    if (response.success) {
      console.log(`文档历史查看记录成功: ${doc.title}`)
      ElMessage.info(`正在查看 ${doc.title} 的历史版本`)
    } else {
      console.error('记录文档历史查看失败:', response.message)
      ElMessage.error('查看文档历史失败')
    }
  } catch (error) {
    console.error('记录文档历史查看失败:', error)
    ElMessage.error('查看文档历史失败')
  }
}

// 导航到指定文档页面
const navigateToDoc = (path) => {
  router.push(path)
}

// 查看文档
const viewDoc = async (doc) => {
  try {
    // 记录文档查看
    await recordDocumentView(doc)
    
    // 调用API获取文档详情
    const response = await request({
      url: `/api/docs/${doc.id}`,
      method: 'get'
    })
    
    if (response.success) {
      // 根据文档类型导航到对应的页面
      if (doc.id === 1) { // 需求文档
        router.push('/docs/requirements?mode=view')
      } else if (doc.id === 2) { // 数据库设计文档
        router.push('/docs/database?mode=view')
      } else if (doc.id === 3) { // 版本控制
        router.push('/docs/versions?mode=view')
      } else {
        // 通用导航
        router.push(doc.path)
      }
    } else {
      console.error('获取文档详情失败:', response.message)
      ElMessage.error('获取文档详情失败')
    }
  } catch (error) {
    console.error('查看文档失败:', error)
    ElMessage.error('查看文档失败')
  }
}

// 编辑文档
const editDoc = async (doc) => {
  try {
    // 检查文档是否可编辑
    if (!doc.editable) {
      ElMessage.warning('该文档当前不可编辑')
      return
    }
    
    // 记录文档编辑
    await recordDocumentEdit(doc)
    
    // 调用API获取文档详情
    const response = await request({
      url: `/api/docs/${doc.id}`,
      method: 'get'
    })
    
    if (response.success) {
      // 根据文档类型跳转到相应页面
      const docType = doc.title
      
      if (docType.includes('需求')) {
        router.push('/docs/requirements?mode=edit')
      } else if (docType.includes('设计')) {
        router.push('/docs/design?mode=edit')
      } else if (docType.includes('数据库')) {
        router.push('/docs/database?mode=edit')
      } else if (docType.includes('版本')) {
        router.push('/docs/versions?mode=edit')
      } else {
        router.push('/docs/technical?mode=edit')
      }
    } else {
      console.error('获取文档详情失败:', response.message)
      ElMessage.error('获取文档详情失败')
    }
  } catch (error) {
    console.error('编辑文档失败:', error)
    ElMessage.error('编辑文档失败')
  }
}

// 查看文档历史
const viewHistory = async (doc) => {
  try {
    // 记录历史查看
    await recordHistoryView(doc)
    
    // 调用API获取文档历史版本
    const response = await request({
      url: `/api/docs/${doc.id}/history`,
      method: 'get'
    })
    
    if (response.success) {
      // 导航到版本控制页面，并传递文档信息
      router.push({
        path: '/docs/versions',
        query: {
          docId: doc.id,
          docType: doc.title,
          from: 'management'
        }
      })
    } else {
      console.error('获取文档历史失败:', response.message)
      ElMessage.error('获取文档历史失败')
    }
  } catch (error) {
    console.error('查看文档历史失败:', error)
    ElMessage.error('查看文档历史失败')
  }
}

// 打开文档
const openDocument = async (doc) => {
  try {
    // 调用API获取文档详情
    const response = await request({
      url: `/api/docs/${doc.id}`,
      method: 'get'
    })
    
    if (response.success) {
      // 记录文档查看
      await recordDocumentView(doc)
      
      // 跳转到文档详情页
      router.push({
        path: '/docs/detail',
        query: {
          id: doc.id,
          type: doc.title
        }
      })
    } else {
      console.error('获取文档详情失败:', response.message)
      ElMessage.error('获取文档详情失败')
    }
  } catch (error) {
    console.error('打开文档失败:', error)
    ElMessage.error('打开文档失败')
  }
}

// 查看更新详情
const viewUpdateDetail = (update) => {
  ElMessage.info(`查看更新详情: ${update.docName} - ${update.section}`)
}

// 回滚更新
const revertUpdate = (update) => {
  ElMessageBox.confirm(
    `确定要回滚到版本 ${update.version} 吗？当前更改将丢失。`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    ElMessage.success('已成功回滚到指定版本')
  }).catch(() => {
    // 取消操作
  })
}

// 刷新数据
const refreshData = async () => {
  try {
    ElMessage.info('正在刷新数据...')
    
    // 并行获取所有数据
    const [statsRes, typesRes, recentRes, popularRes, updatesRes] = await Promise.all([
      request({ url: '/api/docs/stats', method: 'get' }),
      request({ url: '/api/docs/types', method: 'get' }),
      request({ url: '/api/docs/recent', method: 'get' }),
      request({ url: '/api/docs/popular', method: 'get' }),
      request({ url: '/api/docs/updates', method: 'get' })
    ])
    
    // 更新统计数据
    if (statsRes.success) {
      documentStats.value = statsRes.data
    }
    
    // 更新文档类型
    if (typesRes.success) {
      documentTypes.value = typesRes.data
    }
    
    // 更新最近文档
    if (recentRes.success) {
      recentDocuments.value = recentRes.data
    }
    
    // 更新热门文档
    if (popularRes.success) {
      popularDocuments.value = popularRes.data
    }
    
    // 更新最近更新
    if (updatesRes.success) {
      recentUpdates.value = updatesRes.data
    }
    
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  }
}

// 导出概览
const exportSummary = async () => {
  try {
    ElMessage.info('正在生成文档概览...')
    
    // 调用API导出文档概览
    const response = await request({
      url: '/api/docs/export/summary',
      method: 'get',
      responseType: 'blob'
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `文档概览_${new Date().toLocaleDateString()}.pdf`)
    document.body.appendChild(link)
    link.click()
    
    // 清理
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
    
    ElMessage.success('文档概览导出成功')
  } catch (error) {
    console.error('导出文档概览失败:', error)
    ElMessage.error('导出文档概览失败')
  }
}

// 导出为PDF
const exportToPDF = async () => {
  try {
    ElMessage.info('正在生成PDF文档...')
    
    // 调用API导出PDF
    const response = await request({
      url: '/api/docs/export/pdf',
      method: 'get',
      responseType: 'blob'
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `文档概览_${new Date().toLocaleDateString()}.pdf`)
    document.body.appendChild(link)
    link.click()
    
    // 清理
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
    
    ElMessage.success('PDF文档导出成功')
  } catch (error) {
    console.error('导出PDF失败:', error)
    ElMessage.error('导出PDF失败')
  }
}

// 导出为Excel
const exportToExcel = async () => {
  try {
    ElMessage.info('正在生成Excel文档...')
    
    // 调用API导出Excel
    const response = await request({
      url: '/api/docs/export/excel',
      method: 'get',
      responseType: 'blob'
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `文档概览_${new Date().toLocaleDateString()}.xlsx`)
    document.body.appendChild(link)
    link.click()
    
    // 清理
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
    
    ElMessage.success('Excel文档导出成功')
  } catch (error) {
    console.error('导出Excel失败:', error)
    ElMessage.error('导出Excel失败')
  }
}

// 生成导出内容
const generateExportContent = () => {
  const currentDate = new Date().toLocaleDateString()
  
  let content = `
    <html>
      <head>
        <title>文档管理系统概览</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #303133; }
          h2 { color: #409EFF; margin-top: 30px; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .stat-box { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .stat-title { font-weight: bold; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <h1>文档管理系统概览</h1>
        <p>生成日期: ${currentDate}</p>
        
        <h2>文档统计</h2>
        <div class="stat-box">
          <div class="stat-title">文档总数: ${documentStats.value[0].value}</div>
          <div class="stat-title">本周更新: ${documentStats.value[1].value}</div>
          <div class="stat-title">待审核: ${documentStats.value[2].value}</div>
          <div class="stat-title">活跃编辑者: ${documentStats.value[3].value}</div>
        </div>
        
        <h2>文档类型</h2>
        <table>
          <tr>
            <th>文档名称</th>
            <th>描述</th>
            <th>更新时间</th>
            <th>版本</th>
          </tr>
  `
  
  // 添加文档类型数据
  documentTypes.value.forEach(doc => {
    content += `
      <tr>
        <td>${doc.title}</td>
        <td>${doc.description}</td>
        <td>${doc.updateTime}</td>
        <td>${doc.version}</td>
      </tr>
    `
  })
  
  // 添加最近更新数据
  content += `
        </table>
        
        <h2>最近更新</h2>
        <table>
          <tr>
            <th>文档名称</th>
            <th>更新章节</th>
            <th>更新时间</th>
            <th>更新人</th>
            <th>更新说明</th>
            <th>版本</th>
          </tr>
  `
  
  recentUpdates.value.forEach(update => {
    content += `
      <tr>
        <td>${update.docName}</td>
        <td>${update.section}</td>
        <td>${update.updateTime}</td>
        <td>${update.author}</td>
        <td>${update.description}</td>
        <td>${update.version}</td>
      </tr>
    `
  })
  
  content += `
        </table>
      </body>
    </html>
  `
  
  return content
}

// 生成导出数据
const generateExportData = () => {
  const data = {
    stats: documentStats.value,
    documentTypes: documentTypes.value,
    recentDocuments: recentDocuments.value,
    popularDocuments: popularDocuments.value,
    recentUpdates: recentUpdates.value,
    exportDate: new Date().toLocaleDateString()
  }
  
  return data
}

// 查看所有最近编辑的文档
const viewAllRecent = () => {
  // 记录操作
  console.log('查看所有最近编辑的文档')
  
  // 导航到文档搜索页面，并传递筛选参数
  router.push({
    path: '/docs/search',
    query: {
      filter: 'recent',
      title: '最近编辑的文档'
    }
  })
}

// 查看所有热门文档
const viewAllPopular = () => {
  // 记录操作
  console.log('查看所有热门文档')
  
  // 导航到文档搜索页面，并传递筛选参数
  router.push({
    path: '/docs/search',
    query: {
      filter: 'popular',
      title: '热门文档'
    }
  })
}

// 查看所有更新记录
const viewAllUpdates = () => {
  // 记录操作
  console.log('查看所有更新记录')
  
  // 导航到版本控制页面，并传递参数
  router.push({
    path: '/docs/versions',
    query: {
      filter: 'updates',
      title: '文档更新记录'
    }
  })
}

// 返回首页
const goBack = () => {
  router.push('/')
}

// 组件挂载时加载数据
onMounted(async () => {
  try {
    ElMessage.info('正在加载文档数据...')
    
    // 并行获取所有数据
    const [statsRes, typesRes, recentRes, popularRes, updatesRes] = await Promise.all([
      request({ url: '/api/docs/stats', method: 'get' }),
      request({ url: '/api/docs/types', method: 'get' }),
      request({ url: '/api/docs/recent', method: 'get' }),
      request({ url: '/api/docs/popular', method: 'get' }),
      request({ url: '/api/docs/updates', method: 'get' })
    ])
    
    // 更新统计数据
    if (statsRes.success) {
      documentStats.value = statsRes.data
    }
    
    // 更新文档类型
    if (typesRes.success) {
      documentTypes.value = typesRes.data
    }
    
    // 更新最近文档
    if (recentRes.success) {
      recentDocuments.value = recentRes.data
    }
    
    // 更新热门文档
    if (popularRes.success) {
      popularDocuments.value = popularRes.data
    }
    
    // 更新最近更新
    if (updatesRes.success) {
      recentUpdates.value = updatesRes.data
    }
    
    ElMessage.success('文档数据加载完成')
  } catch (error) {
    console.error('加载文档数据失败:', error)
    ElMessage.error('加载文档数据失败')
  }
})
</script>

<style scoped>
.docs-management {
  padding: 20px;
}

.page-header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 20px;
}

.header-content {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
}

.back-button {
  margin-right: 20px;
}

.title-section h1 {
  margin: 0 0 5px 0;
  color: #303133;
}

.title-section p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

/* 统计卡片样式 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  margin-right: 15px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

/* 文档卡片样式 */
.doc-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.doc-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-content {
  text-align: center;
  padding: 10px;
}

.doc-icon {
  margin-bottom: 15px;
  color: #409EFF;
}

.card-content h3 {
  margin: 0 0 10px 0;
  color: #303133;
}

.card-content p {
  margin: 0 0 15px 0;
  color: #606266;
  font-size: 14px;
  min-height: 40px;
}

.doc-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
}

.doc-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* 快速访问卡片样式 */
.quick-access-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-updates-card {
  margin-bottom: 20px;
}

.el-divider {
  margin: 30px 0 20px 0;
}

/* 表格行点击样式 */
.el-table :deep(.el-table__row) {
  cursor: pointer;
}

.el-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>