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
import { Document, DataAnalysis, Clock, ArrowLeft, Refresh, Download, Files, TrendCharts, User, View } from '@element-plus/icons-vue'

const router = useRouter()

// 文档统计数据
const documentStats = ref([
  {
    id: 1,
    label: '文档总数',
    value: 12,
    icon: Files,
    color: '#409EFF'
  },
  {
    id: 2,
    label: '本周更新',
    value: 5,
    icon: Refresh,
    color: '#67C23A'
  },
  {
    id: 3,
    label: '待审核',
    value: 3,
    icon: Clock,
    color: '#E6A23C'
  },
  {
    id: 4,
    label: '活跃编辑者',
    value: 8,
    icon: User,
    color: '#F56C6C'
  }
])

// 文档类型数据
const documentTypes = ref([
  {
    id: 1,
    title: '需求文档',
    description: '系统功能需求、非功能性需求、用户角色定义和权限控制规则',
    icon: Document,
    path: '/docs/requirements',
    updateTime: '2023-12-01',
    version: 'v1.2'
  },
  {
    id: 2,
    title: '数据库设计文档',
    description: '表结构定义、外键约束策略、数据完整性保障和表关系图示',
    icon: DataAnalysis,
    path: '/docs/database',
    updateTime: '2023-11-28',
    version: 'v1.1'
  },
  {
    id: 3,
    title: '版本控制',
    description: '文档版本历史记录、变更追踪和版本对比功能',
    icon: Clock,
    path: '/docs/versions',
    updateTime: '2023-12-02',
    version: 'v1.0'
  }
])

// 最近编辑的文档
const recentDocuments = ref([
  {
    id: 1,
    name: '需求文档 - 11.3 管理端需求',
    editor: '张三',
    editTime: '2023-12-01 14:30',
    path: '/docs/requirements'
  },
  {
    id: 2,
    name: '数据库设计文档 - 用户表结构',
    editor: '李四',
    editTime: '2023-11-28 10:15',
    path: '/docs/database'
  },
  {
    id: 3,
    name: '需求文档 - 4.3.1 收款码管理功能',
    editor: '王五',
    editTime: '2023-11-25 16:45',
    path: '/docs/requirements'
  }
])

// 热门文档
const popularDocuments = ref([
  {
    id: 1,
    name: '需求文档 - 11.3 管理端需求',
    views: 128,
    lastView: '2023-12-01 15:20',
    path: '/docs/requirements'
  },
  {
    id: 2,
    name: '数据库设计文档 - 用户表结构',
    views: 96,
    lastView: '2023-12-01 12:10',
    path: '/docs/database'
  },
  {
    id: 3,
    name: '需求文档 - 4.3.1 收款码管理功能',
    views: 87,
    lastView: '2023-11-30 18:45',
    path: '/docs/requirements'
  }
])

// 最近更新数据
const recentUpdates = ref([
  {
    id: 1,
    docName: '需求文档',
    section: '11.3 管理端需求',
    updateTime: '2023-12-01 14:30',
    author: '张三',
    description: '添加了文档管理系统和系统管理功能的详细需求说明',
    version: 'v1.2.1'
  },
  {
    id: 2,
    docName: '数据库设计文档',
    section: '用户表结构',
    updateTime: '2023-11-28 10:15',
    author: '李四',
    description: '更新了用户表的角色字段，添加了系统管理员角色',
    version: 'v1.1.2'
  },
  {
    id: 3,
    docName: '需求文档',
    section: '4.3.1 收款码管理功能',
    updateTime: '2023-11-25 16:45',
    author: '王五',
    description: '完善了收款码上传与维护的功能需求',
    version: 'v1.2.0'
  }
])

// 记录文档查看
const recordDocumentView = (doc) => {
  // 在实际项目中，这里应该调用API记录文档查看
  console.log(`查看文档: ${doc.title}`)
  
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
const recordDocumentEdit = (doc) => {
  // 在实际项目中，这里应该调用API记录文档编辑
  console.log(`编辑文档: ${doc.title}`)
  
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
const recordHistoryView = (doc) => {
  // 在实际项目中，这里应该调用API记录历史查看
  console.log(`查看文档历史: ${doc.title}`)
  
  ElMessage.info(`正在查看 ${doc.title} 的历史版本`)
}

// 导航到指定文档页面
const navigateToDoc = (path) => {
  router.push(path)
}

// 查看文档
const viewDoc = (doc) => {
  // 记录文档查看
  recordDocumentView(doc)
  
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
}

// 编辑文档
const editDoc = (doc) => {
  // 检查文档是否可编辑
  if (!doc.editable) {
    ElMessage.warning('该文档当前不可编辑')
    return
  }
  
  // 记录编辑操作
  recordDocumentEdit(doc)
  
  // 根据文档类型导航到对应的编辑页面
  if (doc.id === 1) { // 需求文档
    router.push('/docs/requirements?mode=edit')
  } else if (doc.id === 2) { // 数据库设计文档
    router.push('/docs/database?mode=edit')
  } else if (doc.id === 3) { // 版本控制
    router.push('/docs/versions?mode=edit')
  } else {
    // 通用导航
    router.push(`${doc.path}?mode=edit`)
  }
}

// 查看文档历史
const viewHistory = (doc) => {
  // 记录历史查看操作
  recordHistoryView(doc)
  
  // 导航到版本控制页面，并传递文档信息
  router.push({
    path: '/docs/versions',
    query: {
      docId: doc.id,
      docType: doc.title,
      from: 'management'
    }
  })
}

// 打开文档
const openDocument = (doc) => {
  router.push(doc.path)
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
const refreshData = () => {
  // 模拟数据刷新
  ElMessage.success('数据已刷新')
  
  // 在实际项目中，这里应该调用API获取最新数据
  console.log('刷新文档数据')
}

// 导出概览
const exportSummary = () => {
  ElMessageBox.confirm(
    '请选择导出格式',
    '导出文档概览',
    {
      confirmButtonText: '导出为PDF',
      cancelButtonText: '导出为Excel',
      distinguishCancelAndClose: true,
      type: 'info'
    }
  ).then(() => {
    // 导出为PDF
    exportToPDF()
  }).catch((action) => {
    if (action === 'cancel') {
      // 导出为Excel
      exportToExcel()
    }
  })
}

// 导出为PDF
const exportToPDF = () => {
  // 创建导出内容
  const exportContent = generateExportContent()
  
  // 在实际项目中，这里应该调用API导出PDF
  console.log('导出PDF内容:', exportContent)
  
  // 模拟导出过程
  ElMessage({
    message: '正在生成PDF文档...',
    type: 'info',
    duration: 1500
  })
  
  setTimeout(() => {
    // 模拟下载
    const link = document.createElement('a')
    link.href = '#'
    link.download = `文档概览_${new Date().toLocaleDateString()}.pdf`
    link.click()
    
    ElMessage.success('PDF文档导出成功')
  }, 1500)
}

// 导出为Excel
const exportToExcel = () => {
  // 创建导出数据
  const exportData = generateExportData()
  
  // 在实际项目中，这里应该调用API导出Excel
  console.log('导出Excel数据:', exportData)
  
  // 模拟导出过程
  ElMessage({
    message: '正在生成Excel表格...',
    type: 'info',
    duration: 1500
  })
  
  setTimeout(() => {
    // 模拟下载
    const link = document.createElement('a')
    link.href = '#'
    link.download = `文档概览_${new Date().toLocaleDateString()}.xlsx`
    link.click()
    
    ElMessage.success('Excel表格导出成功')
  }, 1500)
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
onMounted(() => {
  // 这里可以添加API调用来获取最新的文档信息
  console.log('文档管理系统已加载')
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