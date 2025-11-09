<template>
  <div class="requirements-doc">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <div class="header-left">
            <el-button type="primary" plain @click="goBack" class="back-button">
              <el-icon><ArrowLeft /></el-icon>
              返回文档管理
            </el-button>
            <div class="title-section">
              <h1>需求文档管理</h1>
              <p>管理系统功能需求、非功能性需求、用户角色定义和权限控制规则</p>
            </div>
          </div>
          <div class="header-actions">
            <el-button @click="showTemplateDialog">
              <el-icon><Document /></el-icon>
              使用模板
            </el-button>
            <el-button @click="showVersionHistory">
              <el-icon><AlarmClock /></el-icon>
              版本历史
            </el-button>
            <el-button type="primary" @click="saveDocument">保存更改</el-button>
            <el-button @click="exportDocument">导出文档</el-button>
          </div>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="250px" class="doc-sidebar">
          <div class="sidebar-actions">
            <el-button size="small" @click="addSection">添加章节</el-button>
            <el-button size="small" @click="expandAll">全部展开</el-button>
            <el-button size="small" @click="collapseAll">全部收起</el-button>
          </div>
          
          <el-tree
            ref="docTree"
            :data="docStructure"
            :props="{ label: 'title', children: 'children' }"
            node-key="id"
            :default-expanded-keys="expandedKeys"
            @node-click="handleNodeClick"
            @node-contextmenu="handleNodeRightClick"
            highlight-current
            draggable
            @node-drag-start="handleDragStart"
            @node-drag-end="handleDragEnd"
          />
        </el-aside>
        
        <el-main class="doc-content">
          <div v-if="selectedSection" class="section-editor">
            <div class="section-header">
              <div class="section-title">
                <h2>{{ selectedSection.title }}</h2>
                <el-button size="small" @click="editSectionTitle">编辑标题</el-button>
              </div>
              <div class="section-meta">
                <span>版本: {{ selectedSection.version }}</span>
                <span>更新时间: {{ selectedSection.updateTime }}</span>
                <span>更新人: {{ selectedSection.author }}</span>
              </div>
            </div>
            
            <el-divider />
            
            <div class="editor-toolbar">
              <el-button-group>
                <el-button size="small" @click="insertText('**', '**')">
                  <el-icon><EditPen /></el-icon>
                </el-button>
                <el-button size="small" @click="insertText('*', '*')">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button size="small" @click="insertText('~~', '~~')">
                  <el-icon><Minus /></el-icon>
                </el-button>
              </el-button-group>
              
              <el-divider direction="vertical" />
              
              <el-button-group>
                <el-button size="small" @click="insertText('# ', '')">H1</el-button>
                <el-button size="small" @click="insertText('## ', '')">H2</el-button>
                <el-button size="small" @click="insertText('### ', '')">H3</el-button>
              </el-button-group>
              
              <el-divider direction="vertical" />
              
              <el-button-group>
                <el-button size="small" @click="insertText('- ', '')">
                  <el-icon><List /></el-icon>
                </el-button>
                <el-button size="small" @click="insertText('1. ', '')">
                  <el-icon><List /></el-icon>
                </el-button>
                <el-button size="small" @click="insertText('> ', '')">
                  <el-icon><ChatDotRound /></el-icon>
                </el-button>
              </el-button-group>
              
              <el-divider direction="vertical" />
              
              <el-button-group>
                <el-button size="small" @click="insertText('[', '](url)')">
                  <el-icon><Link /></el-icon>
                </el-button>
                <el-button size="small" @click="insertText('```\n', '\n```')">
                  <el-icon><Cpu /></el-icon>
                </el-button>
                <el-button size="small" @click="insertTable">
                  <el-icon><Grid /></el-icon>
                </el-button>
              </el-button-group>
              
              <div class="editor-mode">
                <el-radio-group v-model="editorMode" size="small">
                  <el-radio-button label="edit">编辑</el-radio-button>
                  <el-radio-button label="preview">预览</el-radio-button>
                  <el-radio-button label="split">分屏</el-radio-button>
                </el-radio-group>
              </div>
            </div>
            
            <div class="editor-container" :class="`editor-${editorMode}`">
              <div v-if="editorMode === 'edit' || editorMode === 'split'" class="editor-pane">
                <el-input
                  ref="contentEditor"
                  v-model="selectedSection.content"
                  type="textarea"
                  :rows="20"
                  placeholder="请输入文档内容..."
                  @input="handleContentChange"
                />
              </div>
              
              <div v-if="editorMode === 'preview' || editorMode === 'split'" class="preview-pane">
                <div class="markdown-preview" v-html="previewHtml"></div>
              </div>
            </div>
            
            <div class="editor-actions">
              <el-button @click="showPreviewDialog">全屏预览</el-button>
              <el-button @click="showWordCount">字数统计</el-button>
              <el-button type="primary" @click="saveSection">保存章节</el-button>
            </div>
          </div>
          
          <div v-else class="no-selection">
            <el-empty description="请从左侧选择要编辑的章节" />
          </div>
        </el-main>
      </el-container>
    </el-container>
    
    <!-- 模板选择对话框 -->
    <el-dialog v-model="templateDialogVisible" title="选择文档模板" width="60%">
      <el-tabs v-model="activeTemplateTab">
        <el-tab-pane label="功能需求模板" name="functional">
          <el-row :gutter="20">
            <el-col :span="8" v-for="template in functionalTemplates" :key="template.id">
              <el-card class="template-card" shadow="hover" @click="applyTemplate(template)">
                <h4>{{ template.name }}</h4>
                <p>{{ template.description }}</p>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
        <el-tab-pane label="非功能需求模板" name="nonfunctional">
          <el-row :gutter="20">
            <el-col :span="8" v-for="template in nonFunctionalTemplates" :key="template.id">
              <el-card class="template-card" shadow="hover" @click="applyTemplate(template)">
                <h4>{{ template.name }}</h4>
                <p>{{ template.description }}</p>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
        <el-tab-pane label="用户角色模板" name="roles">
          <el-row :gutter="20">
            <el-col :span="8" v-for="template in roleTemplates" :key="template.id">
              <el-card class="template-card" shadow="hover" @click="applyTemplate(template)">
                <h4>{{ template.name }}</h4>
                <p>{{ template.description }}</p>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
    
    <!-- 全屏预览对话框 -->
    <el-dialog v-model="previewDialogVisible" title="文档预览" width="80%" top="5vh">
      <div class="fullscreen-preview" v-html="previewHtml"></div>
    </el-dialog>
    
    <!-- 字数统计对话框 -->
    <el-dialog v-model="wordCountDialogVisible" title="字数统计" width="40%">
      <div class="word-count-stats">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="总字数">{{ wordStats.total }}</el-descriptions-item>
          <el-descriptions-item label="中文字数">{{ wordStats.chinese }}</el-descriptions-item>
          <el-descriptions-item label="英文单词数">{{ wordStats.english }}</el-descriptions-item>
          <el-descriptions-item label="段落数">{{ wordStats.paragraphs }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
    
    <!-- 编辑标题对话框 -->
    <el-dialog v-model="editTitleDialogVisible" title="编辑章节标题" width="40%">
      <el-form>
        <el-form-item label="章节标题">
          <el-input v-model="editingTitle" placeholder="请输入章节标题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editTitleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveSectionTitle">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 右键菜单 -->
    <el-menu
      ref="contextMenu"
      :style="{ position: 'fixed', left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px', zIndex: 9999 }"
      v-show="contextMenuVisible"
      @select="handleContextMenuSelect"
    >
      <el-menu-item index="add">添加子章节</el-menu-item>
      <el-menu-item index="rename">重命名</el-menu-item>
      <el-menu-item index="delete">删除章节</el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Document, AlarmClock, EditPen, Edit, Minus,
  List, ChatDotRound, Link, Cpu, Grid
} from '@element-plus/icons-vue'
import { marked } from 'marked'

const router = useRouter()

// 返回文档管理页面
const goBack = () => {
  router.push('/docs')
}

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

// 章节内容映射
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

// 选中的章节
const selectedSection = ref(null)

// 默认展开的节点
const expandedKeys = ref(['1', '2', '3', '11'])

// 编辑器模式
const editorMode = ref('edit') // edit, preview, split

// 模板相关
const templateDialogVisible = ref(false)
const activeTemplateTab = ref('functional')

// 功能需求模板
const functionalTemplates = ref([
  {
    id: 'f1',
    name: '用户管理模块',
    description: '包含用户注册、登录、信息管理等功能的需求模板',
    content: `# 用户管理模块需求

## 功能概述
用户管理模块是系统的基础模块，提供用户注册、登录、信息管理等功能。

## 功能需求

### 用户注册
- 用户可以通过手机号或邮箱进行注册
- 系统发送验证码验证用户身份
- 用户设置密码完成注册
- 注册成功后自动登录

### 用户登录
- 支持用户名/手机号/邮箱登录
- 支持密码登录和验证码登录
- 支持"记住密码"功能
- 登录失败次数限制

### 用户信息管理
- 用户可以查看和修改个人信息
- 支持头像上传
- 支持密码修改
- 支持账户注销

## 非功能需求

### 性能需求
- 登录响应时间 < 2秒
- 注册流程完成时间 < 30秒

### 安全性需求
- 密码加密存储
- 登录失败次数限制
- 敏感操作需要二次验证`
  },
  {
    id: 'f2',
    name: '数据管理模块',
    description: '包含数据录入、查询、修改、删除等功能的需求模板',
    content: `# 数据管理模块需求

## 功能概述
数据管理模块提供数据的增删改查功能，支持多种数据类型的录入和管理。

## 功能需求

### 数据录入
- 支持表单数据录入
- 支持批量数据导入
- 支持数据格式校验
- 支持数据重复检查

### 数据查询
- 支持多条件组合查询
- 支持模糊查询
- 支持查询结果导出
- 支持查询历史记录

### 数据修改
- 支持单条数据修改
- 支持批量数据修改
- 支持修改历史记录
- 支持数据回滚

### 数据删除
- 支持单条数据删除
- 支持批量数据删除
- 支持逻辑删除和物理删除
- 支持删除恢复`
  }
])

// 非功能需求模板
const nonFunctionalTemplates = ref([
  {
    id: 'nf1',
    name: '性能需求模板',
    description: '系统性能相关的非功能需求模板',
    content: `# 性能需求

## 响应时间
- 页面加载时间 < 3秒
- 数据查询响应时间 < 2秒
- 表单提交响应时间 < 1秒

## 并发处理
- 支持100个并发用户
- 支持1000个并发请求
- 峰值处理能力5000 QPS

## 资源使用
- CPU使用率 < 70%
- 内存使用率 < 80%
- 磁盘IO < 80%`
  },
  {
    id: 'nf2',
    name: '安全性需求模板',
    description: '系统安全性相关的非功能需求模板',
    content: `# 安全性需求

## 身份认证
- 支持多因素认证
- 支持单点登录
- 支持第三方登录集成

## 数据安全
- 敏感数据加密存储
- 数据传输加密
- 数据脱敏处理

## 访问控制
- 基于角色的访问控制
- 细粒度权限管理
- 操作审计日志`
  }
])

// 用户角色模板
const roleTemplates = ref([
  {
    id: 'r1',
    name: '普通用户角色',
    description: '普通用户角色的权限和功能定义',
    content: `# 普通用户角色

## 角色描述
普通用户是系统的主要使用者，具有基本的业务操作权限。

## 功能权限
- 查看个人数据
- 录入和修改个人数据
- 查看公开信息
- 使用系统基本功能

## 数据权限
- 只能访问自己创建的数据
- 可以查看共享给他的数据
- 不能访问其他用户的私有数据

## 操作限制
- 不能删除系统数据
- 不能修改系统配置
- 不能访问管理员功能`
  },
  {
    id: 'r2',
    name: '管理员角色',
    description: '管理员角色的权限和功能定义',
    content: `# 管理员角色

## 角色描述
管理员负责系统的日常维护和用户管理，具有管理权限。

## 功能权限
- 管理用户账户
- 审核用户数据
- 查看系统日志
- 配置系统参数

## 数据权限
- 可以查看所有用户数据
- 可以修改用户数据
- 不能删除关键业务数据

## 操作限制
- 不能修改系统核心配置
- 不能删除系统日志
- 不能访问超级管理员功能`
  }
])

// 预览对话框
const previewDialogVisible = ref(false)

// 字数统计对话框
const wordCountDialogVisible = ref(false)

// 编辑标题对话框
const editTitleDialogVisible = ref(false)
const editingTitle = ref('')

// 右键菜单
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTarget = ref(null)

// 字数统计
const wordStats = computed(() => {
  if (!selectedSection.value || !selectedSection.value.content) {
    return {
      total: 0,
      chinese: 0,
      english: 0,
      paragraphs: 0
    }
  }
  
  const content = selectedSection.value.content
  const chinese = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const english = (content.match(/[a-zA-Z]+/g) || []).length
  const paragraphs = (content.match(/\n\n+/g) || []).length + 1
  const total = content.length
  
  return {
    total,
    chinese,
    english,
    paragraphs
  }
})

// 预览HTML
const previewHtml = computed(() => {
  if (!selectedSection.value || !selectedSection.value.content) {
    return ''
  }
  return marked(selectedSection.value.content)
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

// 处理右键点击
const handleNodeRightClick = (event, data) => {
  event.preventDefault()
  contextMenuTarget.value = data
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuVisible.value = true
  
  // 点击其他地方关闭右键菜单
  document.addEventListener('click', closeContextMenu)
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false
  document.removeEventListener('click', closeContextMenu)
}

// 处理右键菜单选择
const handleContextMenuSelect = (index) => {
  const data = contextMenuTarget.value
  
  if (index === 'add') {
    addSubSection(data)
  } else if (index === 'rename') {
    renameSection(data)
  } else if (index === 'delete') {
    deleteSection(data)
  }
  
  contextMenuVisible.value = false
}

// 添加子章节
const addSubSection = (parent) => {
  const newId = generateId()
  const newSection = {
    id: newId,
    title: '新章节',
    children: []
  }
  
  if (!parent.children) {
    parent.children = []
  }
  
  parent.children.push(newSection)
  
  // 初始化内容
  sectionContentMap.value[newId] = {
    id: newId,
    title: newSection.title,
    version: 'v1.0',
    updateTime: new Date().toISOString().split('T')[0],
    author: '当前用户',
    content: `# ${newSection.title}\n\n请在此处添加内容。`
  }
  
  // 展开父节点
  if (!expandedKeys.value.includes(parent.id)) {
    expandedKeys.value.push(parent.id)
  }
  
  ElMessage.success('添加章节成功')
}

// 重命名章节
const renameSection = (section) => {
  ElMessageBox.prompt('请输入新名称', '重命名章节', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: section.title
  }).then(({ value }) => {
    section.title = value
    ElMessage.success('重命名成功')
  }).catch(() => {
    // 用户取消操作
  })
}

// 删除章节
const deleteSection = (section) => {
  ElMessageBox.confirm('确定要删除此章节及其所有子章节吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 递归删除章节
    deleteSectionRecursive(docStructure.value, section.id)
    ElMessage.success('删除成功')
  }).catch(() => {
    // 用户取消操作
  })
}

// 递归删除章节
const deleteSectionRecursive = (nodes, targetId) => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) {
      nodes.splice(i, 1)
      return true
    }
    
    if (nodes[i].children && deleteSectionRecursive(nodes[i].children, targetId)) {
      return true
    }
  }
  return false
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 添加章节
const addSection = () => {
  const newSection = {
    id: generateId(),
    title: '新章节',
    children: []
  }
  
  docStructure.value.push(newSection)
  
  // 初始化内容
  sectionContentMap.value[newSection.id] = {
    id: newSection.id,
    title: newSection.title,
    version: 'v1.0',
    updateTime: new Date().toISOString().split('T')[0],
    author: '当前用户',
    content: `# ${newSection.title}\n\n请在此处添加内容。`
  }
  
  ElMessage.success('添加章节成功')
}

// 全部展开
const expandAll = () => {
  const allKeys = []
  const collectKeys = (nodes) => {
    nodes.forEach(node => {
      allKeys.push(node.id)
      if (node.children && node.children.length > 0) {
        collectKeys(node.children)
      }
    })
  }
  collectKeys(docStructure.value)
  expandedKeys.value = allKeys
}

// 全部收起
const collapseAll = () => {
  expandedKeys.value = []
}

// 拖拽开始
const handleDragStart = (node) => {
  console.log('拖拽开始:', node)
}

// 拖拽结束
const handleDragEnd = (node) => {
  console.log('拖拽结束:', node)
}

// 插入文本
const insertText = (before, after = '') => {
  if (!selectedSection.value) return
  
  const textarea = document.querySelector('.editor-pane textarea')
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = textarea.value
  
  const selectedText = text.substring(start, end)
  const newText = before + selectedText + after
  
  const updatedText = text.substring(0, start) + newText + text.substring(end)
  
  selectedSection.value.content = updatedText
  
  // 重新设置光标位置
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(
      start + before.length,
      start + before.length + selectedText.length
    )
  })
}

// 插入表格
const insertTable = () => {
  if (!selectedSection.value) return
  
  const tableTemplate = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
`
  
  const textarea = document.querySelector('.editor-pane textarea')
  if (!textarea) return
  
  const start = textarea.selectionStart
  const text = textarea.value
  
  const updatedText = text.substring(0, start) + tableTemplate + text.substring(start)
  
  selectedSection.value.content = updatedText
  
  // 重新设置光标位置
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + tableTemplate.indexOf('内容1'), start + tableTemplate.indexOf('内容1') + 3)
  })
}

// 处理内容变化
const handleContentChange = () => {
  // 这里可以添加自动保存逻辑
}

// 显示模板对话框
const showTemplateDialog = () => {
  templateDialogVisible.value = true
}

// 应用模板
const applyTemplate = (template) => {
  if (!selectedSection.value) {
    ElMessage.warning('请先选择一个章节')
    return
  }
  
  selectedSection.value.content = template.content
  
  // 更新内容映射
  if (!sectionContentMap.value[selectedSection.value.id]) {
    sectionContentMap.value[selectedSection.value.id] = {}
  }
  
  sectionContentMap.value[selectedSection.value.id] = {
    ...sectionContentMap.value[selectedSection.value.id],
    content: template.content,
    updateTime: new Date().toISOString().split('T')[0],
    author: '当前用户'
  }
  
  templateDialogVisible.value = false
  ElMessage.success('模板应用成功')
}

// 显示版本历史
const showVersionHistory = () => {
  ElMessage.info('版本历史功能开发中')
}

// 显示预览对话框
const showPreviewDialog = () => {
  previewDialogVisible.value = true
}

// 显示字数统计
const showWordCount = () => {
  wordCountDialogVisible.value = true
}

// 编辑章节标题
const editSectionTitle = () => {
  if (!selectedSection.value) return
  
  editingTitle.value = selectedSection.value.title
  editTitleDialogVisible.value = true
}

// 保存章节标题
const saveSectionTitle = () => {
  if (!selectedSection.value || !editingTitle.value.trim()) return
  
  const newTitle = editingTitle.value.trim()
  
  // 更新文档结构中的标题
  updateSectionTitle(docStructure.value, selectedSection.value.id, newTitle)
  
  // 更新选中章节的标题
  selectedSection.value.title = newTitle
  
  // 更新内容映射
  if (!sectionContentMap.value[selectedSection.value.id]) {
    sectionContentMap.value[selectedSection.value.id] = {}
  }
  
  sectionContentMap.value[selectedSection.value.id].updateTime = new Date().toISOString().split('T')[0]
  
  editTitleDialogVisible.value = false
  ElMessage.success('标题修改成功')
}

// 递归更新章节标题
const updateSectionTitle = (nodes, targetId, newTitle) => {
  for (const node of nodes) {
    if (node.id === targetId) {
      node.title = newTitle
      return true
    }
    
    if (node.children && updateSectionTitle(node.children, targetId, newTitle)) {
      return true
    }
  }
  return false
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

// 组件挂载时加载数据
onMounted(() => {
  // 这里可以添加API调用来获取最新的文档结构
  console.log('需求文档管理页面已加载')
})
</script>

<style scoped>
.requirements-doc {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.back-button {
  margin-right: 16px;
}

.title-section h1 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.title-section p {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #909399;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.doc-sidebar {
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  padding: 10px;
  overflow-y: auto;
}

.sidebar-actions {
  margin-bottom: 15px;
  display: flex;
  gap: 5px;
}

.doc-content {
  padding: 20px;
  background-color: #fff;
  overflow-y: auto;
}

.section-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.section-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #909399;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.editor-mode {
  margin-left: auto;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-edit .editor-container {
  display: block;
}

.editor-preview .editor-container {
  display: block;
}

.editor-split .editor-container {
  display: flex;
  gap: 10px;
}

.editor-pane {
  flex: 1;
}

.preview-pane {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  overflow-y: auto;
  background-color: #fafafa;
}

.markdown-preview {
  line-height: 1.6;
}

.markdown-preview h1 {
  font-size: 24px;
  font-weight: bold;
  margin: 20px 0 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
}

.markdown-preview h2 {
  font-size: 20px;
  font-weight: bold;
  margin: 18px 0 8px;
  padding-bottom: 3px;
  border-bottom: 1px solid #eee;
}

.markdown-preview h3 {
  font-size: 16px;
  font-weight: bold;
  margin: 16px 0 6px;
}

.markdown-preview p {
  margin: 10px 0;
}

.markdown-preview ul, .markdown-preview ol {
  margin: 10px 0;
  padding-left: 20px;
}

.markdown-preview li {
  margin: 5px 0;
}

.markdown-preview blockquote {
  margin: 15px 0;
  padding: 10px 15px;
  background-color: #f9f9f9;
  border-left: 4px solid #ddd;
}

.markdown-preview code {
  padding: 2px 4px;
  background-color: #f5f5f5;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-preview pre {
  margin: 15px 0;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-preview pre code {
  padding: 0;
  background-color: transparent;
}

.markdown-preview table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}

.markdown-preview th, .markdown-preview td {
  padding: 8px 12px;
  border: 1px solid #ddd;
  text-align: left;
}

.markdown-preview th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.editor-actions {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.no-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.template-card {
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.template-card h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.template-card p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.fullscreen-preview {
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.word-count-stats {
  padding: 10px 0;
}
</style>