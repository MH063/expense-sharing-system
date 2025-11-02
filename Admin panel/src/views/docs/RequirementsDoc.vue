<template>
  <div class="requirements-doc">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>需求文档管理</h1>
          <p>管理系统功能需求、非功能性需求、用户角色定义和权限控制规则</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="saveDocument">保存更改</el-button>
          <el-button @click="exportDocument">导出文档</el-button>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="250px" class="doc-sidebar">
          <el-tree
            :data="docStructure"
            :props="{ label: 'title', children: 'children' }"
            node-key="id"
            :default-expanded-keys="expandedKeys"
            @node-click="handleNodeClick"
            highlight-current
          />
        </el-aside>
        
        <el-main class="doc-content">
          <div v-if="selectedSection" class="section-editor">
            <div class="section-header">
              <h2>{{ selectedSection.title }}</h2>
              <div class="section-meta">
                <span>版本: {{ selectedSection.version }}</span>
                <span>更新时间: {{ selectedSection.updateTime }}</span>
                <span>更新人: {{ selectedSection.author }}</span>
              </div>
            </div>
            
            <el-divider />
            
            <div class="editor-container">
              <el-input
                v-model="selectedSection.content"
                type="textarea"
                :rows="20"
                placeholder="请输入文档内容..."
              />
            </div>
            
            <div class="editor-actions">
              <el-button @click="previewContent">预览</el-button>
              <el-button type="primary" @click="saveSection">保存章节</el-button>
            </div>
          </div>
          
          <div v-else class="no-selection">
            <el-empty description="请从左侧选择要编辑的章节" />
          </div>
        </el-main>
      </el-container>
    </el-container>
    
    <!-- 预览对话框 -->
    <el-dialog v-model="previewVisible" title="内容预览" width="70%">
      <div class="preview-content" v-html="previewHtml"></div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 文档结构数据
const docStructure = ref([
  {
    id: '1',
    title: '1. 项目概述',
    children: [
      { id: '1.1', title: '1.1 系统简介' },
      { id: '1.2', title: '1.2 项目目标' },
      { id: '1.3', title: '1.3 核心价值' }
    ]
  },
  {
    id: '2',
    title: '2. 用户角色',
    children: [
      { id: '2.1', title: '2.1 角色定义' },
      { id: '2.2', title: '2.2 角色关系' },
      { id: '2.3', title: '2.3 权限控制规则' }
    ]
  },
  {
    id: '3',
    title: '3. 功能模块详细需求',
    children: [
      { id: '3.1', title: '3.1 首页' },
      { id: '3.2', title: '3.2 寝室管理' },
      { id: '3.8', title: '3.8 系统管理面板' }
    ]
  },
  {
    id: '11',
    title: '11. 系统开发需求说明',
    children: [
      { id: '11.1', title: '11.1 前端开发需求' },
      { id: '11.2', title: '11.2 后端开发需求' },
      { id: '11.3', title: '11.3 管理端需求' }
    ]
  }
])

// 选中的章节
const selectedSection = ref(null)

// 默认展开的节点
const expandedKeys = ref(['1', '2', '3', '11'])

// 预览相关
const previewVisible = ref(false)
const previewHtml = ref('')

// 章节内容映射（实际项目中应该从API获取）
const sectionContentMap = ref({
  '1.1': {
    id: '1.1',
    title: '1.1 系统简介',
    version: 'v1.2',
    updateTime: '2023-12-01',
    author: '张三',
    content: '寝室费用分摊记账系统是一个专为大学生寝室生活设计的费用管理工具，旨在解决寝室成员之间费用分摊、账单管理和支付确认等问题。系统提供智能分摊算法，支持多种分摊方式，并实现实时通知和审核流程，确保费用分摊的公平性和透明度。'
  },
  '1.2': {
    id: '1.2',
    title: '1.2 项目目标',
    version: 'v1.1',
    updateTime: '2023-11-28',
    author: '李四',
    content: '1. 简化寝室费用分摊流程，减少人工计算错误\n2. 提供多种分摊方式，满足不同场景需求\n3. 实现费用记录的数字化管理，便于查询和统计\n4. 建立透明的审核机制，确保费用分摊的公平性\n5. 提供实时通知功能，及时提醒成员支付费用'
  },
  '11.3': {
    id: '11.3',
    title: '11.3 管理端需求',
    version: 'v1.0',
    updateTime: '2023-12-02',
    author: '王五',
    content: '管理端需求包括文档管理、系统管理功能、审核与争议管理、系统配置与数据统计等功能模块。文档管理模块提供需求文档维护、数据库设计文档管理、文档版本控制和文档搜索浏览功能。系统管理功能包括用户管理、寝室管理、费用监控和异常费用识别。审核与争议管理模块提供审核流程监控、审核记录查询、争议案件管理和处理进度跟踪功能。系统配置与数据统计模块包括系统参数配置、分摊规则管理、通知模板配置和系统使用统计功能。'
  }
})

// 处理节点点击事件
const handleNodeClick = (data) => {
  // 检查是否是叶子节点（没有子节点）
  if (!data.children || data.children.length === 0) {
    selectedSection.value = sectionContentMap.value[data.id] || {
      id: data.id,
      title: data.title,
      version: 'v1.0',
      updateTime: new Date().toISOString().split('T')[0],
      author: '当前用户',
      content: ''
    }
  }
}

// 保存章节
const saveSection = () => {
  if (!selectedSection.value) return
  
  // 更新内容映射
  sectionContentMap.value[selectedSection.value.id] = {
    ...selectedSection.value,
    updateTime: new Date().toISOString().split('T')[0]
  }
  
  ElMessage.success('章节保存成功')
}

// 保存整个文档
const saveDocument = () => {
  // 实际项目中应该调用API保存整个文档
  ElMessage.success('文档保存成功')
}

// 导出文档
const exportDocument = () => {
  // 实际项目中应该调用API导出文档
  ElMessage.success('文档导出成功')
}

// 预览内容
const previewContent = () => {
  if (!selectedSection.value) return
  
  // 简单的Markdown转HTML预览（实际项目中应该使用更完善的Markdown解析器）
  previewHtml.value = selectedSection.value.content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  previewVisible.value = true
}

// 组件挂载时加载数据
onMounted(() => {
  // 这里可以添加API调用来获取最新的文档结构
  console.log('需求文档管理页面已加载')
})
</script>

<style scoped>
.requirements-doc {
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

.doc-content {
  padding: 20px;
  overflow-y: auto;
}

.section-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header h2 {
  margin: 0 0 10px 0;
  color: #303133;
}

.section-meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #909399;
}

.editor-container {
  flex: 1;
  margin: 20px 0;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.no-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.preview-content {
  max-height: 60vh;
  overflow-y: auto;
  line-height: 1.6;
}
</style>