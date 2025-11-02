<template>
  <div class="docs-management">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>文档管理系统</h1>
          <p>管理系统需求文档、数据库设计文档和版本控制</p>
        </div>
      </el-header>
      
      <el-main>
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
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <el-divider content-position="left">最近更新</el-divider>
        
        <el-table :data="recentUpdates" style="width: 100%">
          <el-table-column prop="docName" label="文档名称" width="200" />
          <el-table-column prop="section" label="更新章节" width="250" />
          <el-table-column prop="updateTime" label="更新时间" width="180" />
          <el-table-column prop="author" label="更新人" width="120" />
          <el-table-column prop="description" label="更新说明" />
        </el-table>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Document, DataAnalysis, Clock } from '@element-plus/icons-vue'

const router = useRouter()

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

// 最近更新数据
const recentUpdates = ref([
  {
    docName: '需求文档',
    section: '11.3 管理端需求',
    updateTime: '2023-12-01 14:30',
    author: '张三',
    description: '添加了文档管理系统和系统管理功能的详细需求说明'
  },
  {
    docName: '数据库设计文档',
    section: '用户表结构',
    updateTime: '2023-11-28 10:15',
    author: '李四',
    description: '更新了用户表的角色字段，添加了系统管理员角色'
  },
  {
    docName: '需求文档',
    section: '4.3.1 收款码管理功能',
    updateTime: '2023-11-25 16:45',
    author: '王五',
    description: '完善了收款码上传与维护的功能需求'
  }
])

// 导航到指定文档页面
const navigateToDoc = (path) => {
  router.push(path)
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
}

.el-divider {
  margin: 30px 0 20px 0;
}
</style>